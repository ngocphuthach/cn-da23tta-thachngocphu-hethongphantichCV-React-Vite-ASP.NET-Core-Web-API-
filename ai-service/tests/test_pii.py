import json
import unittest
from unittest.mock import patch

from llm_client import LLMConfig
from pii import mask_pii

try:
    import analyzer
except ModuleNotFoundError:
    analyzer = None


class MaskPiiTests(unittest.TestCase):
    def test_masks_vietnamese_mobile_formats(self):
        samples = (
            "0912 345 678",
            "091.234.5678",
            "091-234-5678",
            "+84 912 345 678",
            "(+84) 912 345 678",
            "0084912345678",
        )
        for sample in samples:
            self.assertTrue(mask_pii(sample) == "[HIDDEN_PHONE]", "phone masking failed")

    def test_masks_general_international_phone(self):
        self.assertTrue(
            mask_pii("+1 (212) 555-0100") == "[HIDDEN_PHONE]",
            "international phone masking failed",
        )

    def test_masks_regular_and_plus_dot_emails(self):
        samples = (
            "person@example.com",
            "first.last@example.co.vn",
            "first.last+career@example.com",
        )
        for sample in samples:
            self.assertTrue(mask_pii(sample) == "[HIDDEN_EMAIL]", "email masking failed")

    def test_does_not_mask_non_contact_numbers(self):
        samples = (
            "2022 - 2026",
            "2022-2026",
            "01/2022 - 06/2024",
            "10.000.000 VND",
            "GPA 3.5/4.0",
            "15+ bảng",
            "1.5 năm kinh nghiệm",
            "09123456789",
            "ORD-1234567890123456",
            "08.123.456.789",
        )
        for sample in samples:
            self.assertTrue(mask_pii(sample) == sample, "non-contact number was changed")

    def test_preserves_vietnamese_text_and_newlines(self):
        source = "Nguyễn Thị Ánh\nKỹ năng: Python; email: a.b+cv@example.test"
        expected = "Nguyễn Thị Ánh\nKỹ năng: Python; email: [HIDDEN_EMAIL]"
        self.assertTrue(mask_pii(source) == expected, "Vietnamese text was changed")

    def test_empty_and_none_are_safe(self):
        self.assertTrue(mask_pii("") == "", "empty input changed")
        self.assertTrue(mask_pii(None) == "", "None input was not handled")


class AnalyzerPiiIntegrationTests(unittest.TestCase):
    cv_text = (
        "Nguyễn Thị Ánh\nEmail: contact.person+cv@example.test\n"
        "Điện thoại: 0912 345 678\nPhát triển ứng dụng bằng C#."
    )
    masked_text = (
        "Nguyễn Thị Ánh\nEmail: [HIDDEN_EMAIL]\n"
        "Điện thoại: [HIDDEN_PHONE]\nPhát triển ứng dụng bằng C#."
    )
    catalog = {
        "skills": [
            {"code": "csharp", "name": "C#"},
            {"code": "javascript", "name": "JavaScript"},
            {"code": "testing", "name": "Kiểm thử"},
        ],
        "jobPositions": [
            {"code": "backend", "name": "Backend Developer", "skills": ["csharp"]},
            {"code": "frontend", "name": "Frontend Developer", "skills": ["javascript"]},
            {"code": "qa", "name": "Kiểm thử phần mềm", "skills": ["testing"]},
        ],
    }
    skills = {item["code"]: item["name"] for item in catalog["skills"]}
    positions = {item["code"]: item for item in catalog["jobPositions"]}
    llm_config = LLMConfig(
        provider="openai_compatible",
        base_url="http://example.invalid/v1",
        model="offline-test-model",
        api_key="",
    )
    llm_json = json.dumps(
        {
            "schemaVersion": "1.0",
            "summary": "Có kinh nghiệm phát triển bằng C#.",
            "detectedSkills": [{
                "skillCode": "csharp",
                "name": "C#",
                "level": "Intermediate",
                "evidence": "Phát triển ứng dụng bằng C#.",
            }],
            "careerRecommendations": [
                {
                    "jobPositionCode": code,
                    "jobPositionName": name,
                    "fitScore": score,
                    "strengths": [],
                    "missingSkills": [],
                    "nextSteps": [],
                }
                for code, name, score in (
                    ("backend", "Backend Developer", 90.0),
                    ("frontend", "Frontend Developer", 80.0),
                    ("qa", "Kiểm thử phần mềm", 70.0),
                )
            ],
            "cvImprovements": [{
                "section": "Projects",
                "issue": "Chưa nêu rõ kết quả dự án.",
                "suggestion": "Bổ sung kết quả cụ thể.",
            }],
            "otherSkills": [],
        },
        ensure_ascii=False,
    )

    def _assert_analyzed_without_network(self, invoke):
        calls = []

        def fake_generate_text(prompt, config, cv_text, metrics=None):
            calls.append((prompt, cv_text))
            return self.llm_json

        original_validator = analyzer.validate_result
        with (
            patch.object(analyzer, "generate_text", side_effect=fake_generate_text),
            patch.object(analyzer, "validate_result", wraps=original_validator) as validator,
        ):
            result = invoke()

        self.assertTrue(len(calls) == 1, "unexpected number of mocked LLM calls")
        prompt, llm_cv_text = calls[0]
        self.assertTrue("contact.person+cv@example.test" not in prompt, "email remained in prompt")
        self.assertTrue("0912 345 678" not in prompt, "phone remained in prompt")
        self.assertTrue("[HIDDEN_EMAIL]" in prompt, "email marker missing from prompt")
        self.assertTrue("[HIDDEN_PHONE]" in prompt, "phone marker missing from prompt")
        self.assertTrue(llm_cv_text == self.masked_text, "LLM received unmasked CV text")
        self.assertTrue(
            validator.call_args.args[3] == self.masked_text,
            "validator did not receive the same masked text",
        )
        self.assertTrue(result.schemaVersion == "1.0", "validated result was not returned")
        self.assertTrue(result.detectedSkills[0].evidenceVerified, "evidence validation failed")

    def test_text_analysis_masks_before_prompt_and_validation(self):
        self._assert_analyzed_without_network(
            lambda: analyzer.analyze(
                self.cv_text,
                self.catalog,
                self.skills,
                self.positions,
                self.llm_config,
            )
        )

    def test_file_analysis_masks_before_prompt_and_validation(self):
        with patch.object(analyzer, "extract_cv_text", return_value=self.cv_text):
            self._assert_analyzed_without_network(
                lambda: analyzer.analyze_cv_upload(
                    "synthetic.docx",
                    b"offline synthetic document",
                    self.catalog,
                    self.skills,
                    self.positions,
                    self.llm_config,
                )
            )


AnalyzerPiiIntegrationTests = unittest.skipIf(
    analyzer is None,
    "AI service dependencies are not installed in this Python environment",
)(AnalyzerPiiIntegrationTests)


if __name__ == "__main__":
    unittest.main()
