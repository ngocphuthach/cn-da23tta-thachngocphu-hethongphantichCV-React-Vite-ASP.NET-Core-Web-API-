"""FastAPI entry point for the CV Advisor AI service."""

from __future__ import annotations

import os
import secrets
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool
from starlette.formparsers import MultiPartParser

from analyzer import (
    MAX_CV_BYTES,
    AnalysisError,
    AnalyzerDependencyError,
    InvalidCVError,
    MAX_CV_TEXT_CHARS,
    analyze,
    analyze_cv_upload,
    load_environment,
    load_job_catalog,
    result_to_dict,
)
from llm_client import LLMError, load_config


# Bound multipart buffering and keep Starlette's upload spool in memory for every
# request accepted by this service. The CV itself is still capped at 5 MiB below.
MAX_MULTIPART_BODY_BYTES = MAX_CV_BYTES + 64 * 1024
# JSON may represent each non-ASCII character as a six-byte \\uXXXX escape.
MAX_TEXT_REQUEST_BODY_BYTES = MAX_CV_TEXT_CHARS * 6 + 16 * 1024
MultiPartParser.spool_max_size = MAX_MULTIPART_BODY_BYTES + 1


class AnalyzeTextRequest(BaseModel):
    text: str


class InMemoryAnalyzeRequestMiddleware:
    """Buffer bounded analysis requests in memory before parsing."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if not (
            scope["type"] == "http"
            and scope["method"] == "POST"
            and scope["path"] in ("/analyze", "/analyze-text")
        ):
            await self.app(scope, receive, send)
            return

        body = bytearray()
        more_body = True
        while more_body:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            if message["type"] != "http.request":
                continue
            body.extend(message.get("body", b""))
            max_body_bytes = (
                MAX_MULTIPART_BODY_BYTES
                if scope["path"] == "/analyze"
                else MAX_TEXT_REQUEST_BODY_BYTES
            )
            if len(body) > max_body_bytes:
                response = JSONResponse(
                    status_code=400,
                    content={"detail": "Yêu cầu phân tích vượt quá giới hạn kích thước."},
                )
                await response(scope, receive, send)
                return
            more_body = message.get("more_body", False)

        replayed = False

        async def replay_request_body():
            nonlocal replayed
            if not replayed:
                replayed = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, replay_request_body, send)


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_environment()
    catalog, skills_by_code, positions_by_code = load_job_catalog()
    app.state.job_catalog = catalog
    app.state.skills_by_code = skills_by_code
    app.state.positions_by_code = positions_by_code
    try:
        app.state.llm_config = load_config()
    except LLMError:
        # Keep health checks available while the provider configuration is incomplete.
        app.state.llm_config = None
    app.state.internal_api_key = os.getenv("INTERNAL_API_KEY", "").strip()
    yield


app = FastAPI(
    title="CV Advisor AI Service",
    description="Dịch vụ AI phân tích CV và tư vấn nghề nghiệp.",
    version="0.2.0",
    lifespan=lifespan,
)
app.add_middleware(InMemoryAnalyzeRequestMiddleware)


@app.exception_handler(RequestValidationError)
async def invalid_request_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    # Keep multipart parser details and submitted data out of responses/log messages.
    return JSONResponse(status_code=400, content={"detail": "Dữ liệu yêu cầu không hợp lệ."})


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready", tags=["system"])
def ready(request: Request):
    if request.app.state.llm_config is None:
        return JSONResponse(status_code=503, content={"status": "not_ready"})
    return {"status": "ready"}


@app.get("/", tags=["system"])
def root() -> dict[str, str]:
    return {
        "service": "cv-advisor-ai-service",
        "docs": "/docs",
        "health": "/health",
        "provider": os.getenv("LLM_PROVIDER", "openai_compatible"),
    }


@app.post("/analyze", tags=["analysis"])
async def analyze_cv(
    request: Request,
    file: Annotated[UploadFile, File(description="CV PDF hoặc DOCX, tối đa 5 MB")],
    x_internal_key: Annotated[str | None, Header(alias="X-Internal-Key")] = None,
) -> dict:
    expected_key = request.app.state.internal_api_key
    provided_key = x_internal_key or ""
    if expected_key and not secrets.compare_digest(
        provided_key.encode("utf-8"), expected_key.encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="X-Internal-Key không hợp lệ.")
    if request.app.state.llm_config is None:
        raise HTTPException(status_code=502, detail="Cấu hình provider LLM chưa đầy đủ.")

    try:
        try:
            content = await file.read(MAX_CV_BYTES + 1)
        except OSError:
            raise InvalidCVError("Không đọc được file CV tải lên.") from None
        if len(content) > MAX_CV_BYTES:
            raise InvalidCVError("File CV vượt quá giới hạn 5 MB.")

        result = await run_in_threadpool(
            analyze_cv_upload,
            file.filename or "",
            content,
            request.app.state.job_catalog,
            request.app.state.skills_by_code,
            request.app.state.positions_by_code,
            request.app.state.llm_config,
        )
        return result_to_dict(result)
    except InvalidCVError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    except AnalyzerDependencyError:
        raise HTTPException(
            status_code=500,
            detail="AI Service thiếu thư viện xử lý PDF hoặc DOCX.",
        ) from None
    except LLMError as exc:
        if exc.status_code in (401, 403):
            reason = "LLM từ chối API key hoặc key không có quyền."
        elif exc.status_code == 402:
            reason = "Tài khoản LLM hết tín dụng hoặc cần thanh toán."
        elif exc.status_code == 429:
            reason = "LLM hết quota hoặc đang giới hạn tốc độ; thử lại sau."
        elif exc.is_connection_error:
            reason = "Không kết nối được dịch vụ LLM; kiểm tra mạng hoặc endpoint."
        elif exc.status_code is not None and exc.status_code >= 500:
            reason = "Dịch vụ LLM đang gặp lỗi; thử lại sau."
        else:
            reason = "Dịch vụ LLM không xử lý được yêu cầu."
        raise HTTPException(status_code=502, detail=reason) from None
    except AnalysisError:
        raise HTTPException(
            status_code=502,
            detail="LLM không trả JSON hợp lệ sau lần thử lại.",
        ) from None
    finally:
        await file.close()


@app.post("/analyze-text", tags=["analysis"])
async def analyze_cv_text(
    payload: AnalyzeTextRequest,
    request: Request,
    x_internal_key: Annotated[str | None, Header(alias="X-Internal-Key")] = None,
) -> dict:
    expected_key = request.app.state.internal_api_key
    provided_key = x_internal_key or ""
    if expected_key and not secrets.compare_digest(
        provided_key.encode("utf-8"), expected_key.encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="X-Internal-Key không hợp lệ.")
    if request.app.state.llm_config is None:
        raise HTTPException(status_code=502, detail="Cấu hình provider LLM chưa đầy đủ.")
    if not payload.text.strip() or len(payload.text.encode("utf-16-le")) // 2 > MAX_CV_TEXT_CHARS:
        raise HTTPException(status_code=400, detail="Nội dung CV phải có từ 1 đến 30.000 ký tự.")

    try:
        result = await run_in_threadpool(
            analyze,
            payload.text,
            request.app.state.job_catalog,
            request.app.state.skills_by_code,
            request.app.state.positions_by_code,
            request.app.state.llm_config,
        )
        return result_to_dict(result)
    except InvalidCVError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    except LLMError as exc:
        if exc.status_code in (401, 403):
            reason = "LLM từ chối API key hoặc key không có quyền."
        elif exc.status_code == 402:
            reason = "Tài khoản LLM hết tín dụng hoặc cần thanh toán."
        elif exc.status_code == 429:
            reason = "LLM hết quota hoặc đang giới hạn tốc độ; thử lại sau."
        elif exc.is_connection_error:
            reason = "Không kết nối được dịch vụ LLM; kiểm tra mạng hoặc endpoint."
        elif exc.status_code is not None and exc.status_code >= 500:
            reason = "Dịch vụ LLM đang gặp lỗi; thử lại sau."
        else:
            reason = "Dịch vụ LLM không xử lý được yêu cầu."
        raise HTTPException(status_code=502, detail=reason) from None
    except AnalysisError:
        raise HTTPException(
            status_code=502,
            detail="LLM không trả JSON hợp lệ sau lần thử lại.",
        ) from None
