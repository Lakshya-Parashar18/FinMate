"""
Feature_builder.py
Combines merchant name, alias, description, and notes into an enriched semantic string for Transformer embedding.
"""

from typing import Dict, Any, Optional
from preprocessing.text_cleaner import TextCleaner
from preprocessing.merchant_normalizer import MerchantNormalizer


class FeatureBuilder:
    """Intelligently builds combined text representations for Transformer embeddings."""

    @staticmethod
    def build_feature_text(
        merchant: str,
        alias: Optional[str] = None,
        description: Optional[str] = None,
        notes: Optional[str] = None
    ) -> str:
        """
        Synthesizes an enriched semantic input string from transaction fields.
        E.g.: "merchant: swiggy | alias: swiggy pay | description: chicken biryani & coke"
        """
        clean_merchant = MerchantNormalizer.normalize_merchant(merchant)
        clean_alias = TextCleaner.clean_text(alias) if alias else ""
        clean_desc = TextCleaner.clean_text(description) if description else ""
        clean_notes = TextCleaner.clean_text(notes) if notes else ""

        parts = [f"merchant: {clean_merchant}"]

        if clean_alias and clean_alias != clean_merchant:
            parts.append(f"alias: {clean_alias}")

        if clean_desc:
            parts.append(f"description: {clean_desc}")

        if clean_notes and "flagged" not in clean_notes.lower():
            parts.append(f"notes: {clean_notes}")

        return " | ".join(parts)

    @staticmethod
    def build_from_dict(txn: Dict[str, Any]) -> str:
        """Extracts fields from transaction dictionary and returns semantic string."""
        return FeatureBuilder.build_feature_text(
            merchant=txn.get("merchant", ""),
            alias=txn.get("merchant_alias", ""),
            description=txn.get("description", ""),
            notes=txn.get("notes", "")
        )
