"""Provider adapters for LLM calls used by the local CV analysis script."""

from __future__ import annotations

from dataclasses import dataclass
import math
import re
import time
import unicodedata
from typing import Any


class LLMError(Exception):
    """A provider configuration or request error safe to show to the user."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        is_connection_error: bool = False,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.is_connection_error = is_connection_error


@dataclass(frozen=True)
class LLMConfig:
    provider: str
    base_url: str
    model: str
    api_key: str


def extract_evidence_segments(evidence: str) -> list[str]:
    """Extract quoted evidence snippets, or split unquoted text on ellipses/semicolons."""
    quote_pattern = re.compile(
        r'"([^"\n]+)"|“([^”\n]+)”|‘([^’\n]+)’|(?<!\w)\'([^\'\n]+)\'',
        flags=re.UNICODE,
    )
    quoted = [next(group for group in match.groups() if group is not None) for match in quote_pattern.finditer(evidence)]
    source_segments = quoted or re.split(r"(?:\.{3,}|…|;)", evidence)

    label_pattern = re.compile(
        r"^\s*(?:(?:mục\s+)?(?:kỹ năng|skills?|summary|tóm tắt|experience|"
        r"kinh nghiệm|project|dự án|evidence|trích dẫn))\s*:\s*",
        flags=re.IGNORECASE | re.UNICODE,
    )
    segments: list[str] = []
    for source in source_segments:
        for part in re.split(r"(?:\.{3,}|…|;)", source):
            segment = label_pattern.sub("", part).strip().strip("\"'“”‘’ ")
            segment = re.sub(r"\s*(?:\([^)]*\)|\[[^\]]*\])\s*$", "", segment).strip()
            if segment:
                segments.append(segment)
    return segments


def normalize_detected_skill_levels(payload: Any) -> None:
    """Normalize only detectedSkills[*].level in a parsed model response."""
    if not isinstance(payload, dict):
        return
    detected_skills = payload.get("detectedSkills")
    if not isinstance(detected_skills, list):
        return

    aliases = {
        "beginner": "Beginner",
        "basic": "Beginner",
        "co ban": "Beginner",
        "so cap": "Beginner",
        "intermediate": "Intermediate",
        "trung binh": "Intermediate",
        "trung cap": "Intermediate",
        "advanced": "Advanced",
        "expert": "Advanced",
        "nang cao": "Advanced",
        "thanh thao": "Advanced",
    }

    for skill in detected_skills:
        if not isinstance(skill, dict) or "level" not in skill:
            continue

        value = skill["level"]
        if isinstance(value, bool):
            continue
        if isinstance(value, int):
            skill["level"] = _level_from_number(value)
            continue
        if isinstance(value, float):
            if math.isfinite(value) and value.is_integer():
                skill["level"] = _level_from_number(int(value))
            continue
        if not isinstance(value, str):
            continue

        normalized = "".join(
            character
            for character in unicodedata.normalize("NFKD", value).casefold()
            if not unicodedata.combining(character)
        ).strip()
        if normalized in aliases:
            skill["level"] = aliases[normalized]
            continue
        try:
            numeric_value = float(normalized)
        except ValueError:
            continue
        if math.isfinite(numeric_value) and numeric_value.is_integer():
            skill["level"] = _level_from_number(int(numeric_value))


def normalize_missing_skill_importance(payload: Any) -> None:
    """Map legacy text importance labels to the current integer scale."""
    if not isinstance(payload, dict):
        return
    recommendations = payload.get("careerRecommendations")
    if not isinstance(recommendations, list):
        return
    aliases = {"high": 5, "medium": 3, "low": 1}
    for recommendation in recommendations:
        if not isinstance(recommendation, dict):
            continue
        missing_skills = recommendation.get("missingSkills")
        if not isinstance(missing_skills, list):
            continue
        for skill in missing_skills:
            if isinstance(skill, dict) and isinstance(skill.get("importance"), str):
                label = skill["importance"].strip().casefold()
                if label in aliases:
                    skill["importance"] = aliases[label]


def _level_from_number(value: int) -> str | int:
    if value in (1, 2):
        return "Beginner"
    if value == 3:
        return "Intermediate"
    if value in (4, 5):
        return "Advanced"
    return value


def load_config() -> LLMConfig:
    provider = _environment_value("LLM_PROVIDER", "openai_compatible").lower()
    if provider not in {"openai_compatible", "gemini"}:
        raise LLMError("LLM_PROVIDER phải là 'openai_compatible' hoặc 'gemini'.")

    values = {
        "LLM_API_KEY": _environment_value("LLM_API_KEY"),
        "LLM_BASE_URL": _environment_value("LLM_BASE_URL"),
        "LLM_MODEL": _environment_value("LLM_MODEL"),
    }
    missing = [name for name, value in values.items() if not value]
    if missing:
        raise LLMError("Thiếu biến môi trường: " + ", ".join(missing))

    return LLMConfig(
        provider=provider,
        base_url=values["LLM_BASE_URL"],
        model=values["LLM_MODEL"],
        api_key=values["LLM_API_KEY"],
    )


def _environment_value(name: str, default: str = "") -> str:
    import os

    return os.getenv(name, default).strip()


def _http_status(exc: Exception) -> int | None:
    for candidate in (
        getattr(exc, "status_code", None),
        getattr(getattr(exc, "response", None), "status_code", None),
    ):
        try:
            status = int(candidate)
        except (TypeError, ValueError):
            continue
        if 100 <= status <= 599:
            return status
    return None


def _safe_error(exc: Exception) -> str:
    status = _http_status(exc)
    if status in (401, 403):
        reason = "API key sai hoặc không có quyền."
    elif status == 404:
        reason = "Tên model (model ID) sai."
    elif status == 429:
        reason = "Hết quota hoặc gọi quá nhanh."
    elif status is not None and 500 <= status <= 599:
        reason = "Lỗi phía dịch vụ hoặc mạng."
    elif status is None:
        reason = "Lỗi kết nối tới dịch vụ hoặc mạng."
    else:
        reason = "Dịch vụ từ chối yêu cầu; kiểm tra cấu hình và thông báo SDK."

    status_text = f"HTTP {status}" if status is not None else "lỗi kết nối"
    # Do not echo provider exception bodies: they may contain request or credential data.
    return f"LLM thất bại ({status_text}): {reason} ({type(exc).__name__})."


def _provider_error(exc: Exception) -> LLMError:
    status_code = _http_status(exc)
    error_name = type(exc).__name__.casefold()
    is_connection_error = status_code is None and (
        isinstance(exc, (ConnectionError, TimeoutError, OSError))
        or any(marker in error_name for marker in ("connection", "connecterror", "timeout"))
    )
    return LLMError(
        _safe_error(exc),
        status_code=status_code,
        is_connection_error=is_connection_error,
    )


def _extract_message_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text_parts = [
            item.get("text", "")
            for item in content
            if isinstance(item, dict) and isinstance(item.get("text"), str)
        ]
        return "".join(text_parts)
    return ""


def _usage_count(usage: Any, *names: str) -> int | None:
    if usage is None:
        return None
    for name in names:
        value = usage.get(name) if isinstance(usage, dict) else getattr(usage, name, None)
        if type(value) is int and value >= 0:
            return value
    return None


def generate_text(
    prompt: str,
    config: LLMConfig,
    cv_text: str = "",
    metrics: dict[str, int | float | None] | None = None,
) -> str:
    started_at = time.perf_counter()
    if metrics is not None:
        metrics["prompt_chars"] = len(prompt)
    if config.provider == "openai_compatible":
        try:
            from openai import OpenAI
        except ImportError as exc:
            raise LLMError("Thiếu thư viện openai; cài các package từ requirements.txt.") from exc

        try:
            client = OpenAI(base_url=config.base_url, api_key=config.api_key)
            response = client.chat.completions.create(
                model=config.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
            )
            content = response.choices[0].message.content
            if metrics is not None:
                usage = getattr(response, "usage", None)
                metrics["input_tokens"] = _usage_count(usage, "prompt_tokens", "input_tokens")
                metrics["output_tokens"] = _usage_count(usage, "completion_tokens", "output_tokens")
        except Exception as exc:
            if metrics is not None:
                metrics["elapsed_ms"] = (time.perf_counter() - started_at) * 1000
            raise _provider_error(exc) from exc

        text = _extract_message_content(content)
    else:
        try:
            from google import genai
        except ImportError as exc:
            raise LLMError("Thiếu google-genai; cài các package từ requirements.txt.") from exc

        try:
            with genai.Client(api_key=config.api_key) as client:
                response = client.models.generate_content(
                    model=config.model,
                    contents=prompt,
                    config={"temperature": 0.1},
                )
            text = getattr(response, "text", "") or ""
            if metrics is not None:
                usage = getattr(response, "usage_metadata", None)
                metrics["input_tokens"] = _usage_count(
                    usage, "prompt_token_count", "input_token_count"
                )
                metrics["output_tokens"] = _usage_count(
                    usage, "candidates_token_count", "output_token_count"
                )
        except Exception as exc:
            if metrics is not None:
                metrics["elapsed_ms"] = (time.perf_counter() - started_at) * 1000
            raise _provider_error(exc) from exc

    if metrics is not None:
        metrics["response_chars"] = len(text)
        metrics["elapsed_ms"] = (time.perf_counter() - started_at) * 1000
    if not text.strip():
        raise LLMError("LLM trả về nội dung rỗng.")
    return text


def list_models(config: LLMConfig) -> list[str]:
    if config.provider == "openai_compatible":
        try:
            from openai import OpenAI
        except ImportError as exc:
            raise LLMError("Thiếu thư viện openai; cài các package từ requirements.txt.") from exc

        try:
            client = OpenAI(base_url=config.base_url, api_key=config.api_key)
            return [model.id for model in client.models.list().data]
        except Exception as exc:
            status = _http_status(exc)
            if status in (404, 405, 501):
                raise LLMError(
                    f"Endpoint không hỗ trợ liệt kê model (HTTP {status})."
                ) from exc
            raise _provider_error(exc) from exc

    try:
        from google import genai
    except ImportError as exc:
        raise LLMError("Thiếu google-genai; cài các package từ requirements.txt.") from exc

    try:
        with genai.Client(api_key=config.api_key) as client:
            return [
                (getattr(model, "name", "") or "").removeprefix("models/")
                for model in client.models.list()
                if getattr(model, "name", None)
            ]
    except Exception as exc:
        status = _http_status(exc)
        if status in (404, 405, 501):
            raise LLMError(f"Endpoint không hỗ trợ liệt kê model (HTTP {status}).") from exc
        raise _provider_error(exc) from exc
