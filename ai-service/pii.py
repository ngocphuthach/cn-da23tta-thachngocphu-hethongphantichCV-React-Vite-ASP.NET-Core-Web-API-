"""Lightweight masking of email addresses and phone numbers before LLM use."""

from __future__ import annotations

import re


_EMAIL_PATTERN = re.compile(
    r"(?<![\w.+-])[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@"
    r"[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?"
    r"(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+(?![\w.-])",
    re.IGNORECASE,
)
_PHONE_PATTERN = re.compile(
    r"(?<!\d)(?:"
    r"0[35789](?:[\s().-]*\d){8}"
    r"|(?:\(\s*(?:\+84|0084)\s*\)|\+84|0084)(?:[\s().-]*\d){9}"
    r"|\+(?:[\s().-]*\d){8,14}"
    r")(?!\d)(?![\s().-]*\d)"
)


def mask_pii(text: str) -> str:
    """Replace email and phone patterns while leaving all other text untouched."""
    if text is None:
        return ""
    if not text:
        return text

    without_emails = _EMAIL_PATTERN.sub("[HIDDEN_EMAIL]", text)
    return _PHONE_PATTERN.sub("[HIDDEN_PHONE]", without_emails)
