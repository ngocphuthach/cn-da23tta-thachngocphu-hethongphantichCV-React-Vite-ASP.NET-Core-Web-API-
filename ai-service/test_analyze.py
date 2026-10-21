"""Local command-line frontend for the shared CV analyzer."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from analyzer import (
    AnalysisError,
    analyze_cv_upload,
    calculate_skill_match_scores,
    load_environment,
    load_job_catalog,
    result_to_dict,
)
from llm_client import LLMError, list_models, load_config


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(
        description="Tr?ch xu?t v? ph?n t?ch m?t CV PDF/DOCX b?ng nh? cung c?p LLM ?? c?u h?nh."
    )
    parser.add_argument("cv_path", nargs="?", type=Path, help="???ng d?n t?i file .pdf ho?c .docx")
    parser.add_argument(
        "--list-models",
        action="store_true",
        help="Li?t k? model endpoint hi?n t?i c?ng b? cho API key ?? c?u h?nh",
    )
    parser.add_argument(
        "--raw",
        action="store_true",
        help="In ph?n h?i g?c c?a model tr??c khi ki?m tra; ch? d?ng v?i CV ?? ?n danh",
    )
    args = parser.parse_args()

    try:
        load_environment()
        llm_config = load_config()
        if args.list_models:
            for model_name in list_models(llm_config):
                print(model_name)
            return 0
        if args.cv_path is None:
            parser.error("C?n truy?n ???ng d?n file CV, ho?c d?ng --list-models.")
        try:
            content = args.cv_path.read_bytes()
        except OSError as exc:
            raise AnalysisError("Kh?ng ??c ???c file CV ?? ch?n.") from exc

        catalog, skills_by_code, positions_by_code = load_job_catalog()
        result = analyze_cv_upload(
            args.cv_path.name,
            content,
            catalog,
            skills_by_code,
            positions_by_code,
            llm_config,
            print_raw=args.raw,
        )
    except (AnalysisError, LLMError) as exc:
        print(f"L?i: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(result_to_dict(result), ensure_ascii=False, indent=2))

    skill_match_scores = calculate_skill_match_scores(result, catalog)
    print("\nSo s?nh fitScore c?a model v?i t? l? k? n?ng kh?p th? nghi?m:", file=sys.stderr)
    for recommendation in result.careerRecommendations:
        score = skill_match_scores[recommendation.jobPositionCode]
        display = score if isinstance(score, str) else f"{score:.1f}%"
        print(
            f"- {recommendation.jobPositionName}: fitScore model="
            f"{recommendation.fitScore:g}/100; k? n?ng kh?p th? nghi?m={display}",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
