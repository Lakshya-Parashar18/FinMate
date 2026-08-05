"""
Text_cleaner.py
Cleans raw financial transaction text strings.
Performs lowercase conversion, symbol stripping, junk code removal, punctuation normalization,
and Unicode normalization.
"""

import re
import unicodedata


class TextCleaner:
    """Production text cleaning pipeline for merchant names and transaction descriptions."""

    @staticmethod
    def clean_text(text: str) -> str:
        if not text or not isinstance(text, str):
            return ""

        # 1. Normalize Unicode (NFKD)
        text = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")

        # 2. Convert to Lowercase
        text = text.lower()

        # 3. Strip transaction IDs / numbers following #, *, -, or trailing codes (e.g. #4832, *PAY, -2394)
        text = re.sub(r"[#*]\d+", "", text)
        text = re.sub(r"-\d+", "", text)
        text = re.sub(r"\b\d{4,}\b", "", text)  # Strip 4+ digit standalone reference numbers

        # 4. Replace special symbols (*, _, -, /) with space
        text = re.sub(r"[*_/-]", " ", text)

        # 5. Remove non-alphanumeric characters (keep basic spaces)
        text = re.sub(r"[^\w\s]", "", text)

        # 6. Normalize multiple spaces to single space
        text = re.sub(r"\s+", " ", text).strip()

        return text
