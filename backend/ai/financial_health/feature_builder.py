"""
Feature_builder.py
Computes 25+ advanced financial behavior features from user transactions, budgets, goals, and central Feature Store.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

from financial_health.config import ESSENTIAL_CATEGORIES, NON_ESSENTIAL_CATEGORIES
from feature_store.feature_store import central_feature_store


class FinancialFeatureBuilder:
    """Advanced Financial Behavior Feature Extractor."""

    @classmethod
    def build_features(
        self,
        transactions: List[Dict[str, Any]],
        monthly_income: float = 75000.0,
        monthly_budget: float = 50000.0,
        goal_savings: float = 200000.0,
        current_savings: float = 120000.0
    ) -> Dict[str, Any]:
        """
        Extracts 25+ structured financial intelligence features.
        """
        if not transactions:
            return self._build_empty_features(monthly_income, monthly_budget)

        df = pd.DataFrame(transactions)
        df["amount"] = pd.to_numeric(df.get("amount", 0.0), errors="coerce").fillna(0.0)
        if "category" not in df.columns:
            df["category"] = "Miscellaneous"
        if "merchant" not in df.columns:
            df["merchant"] = "Unknown"

        # Date Parsing
        if "date" in df.columns:
            df["parsed_date"] = pd.to_datetime(df["date"], errors="coerce")
        else:
            df["parsed_date"] = datetime.now()
        df["parsed_date"] = df["parsed_date"].fillna(datetime.now())

        # 1. Spending Aggregates
        total_spending = float(df["amount"].sum())
        num_transactions = len(df)
        avg_daily_spend = round(total_spending / 30.0, 2)

        now = datetime.now()
        df_30d = df[df["parsed_date"] >= (now - timedelta(days=30))]
        df_90d = df[df["parsed_date"] >= (now - timedelta(days=90))]

        rolling_30d_spend = float(df_30d["amount"].sum()) if not df_30d.empty else total_spending
        rolling_90d_spend = float(df_90d["amount"].sum()) if not df_90d.empty else total_spending * 3

        # 2. Savings & Investments
        net_savings = max(0.0, monthly_income - rolling_30d_spend)
        savings_rate = round(net_savings / monthly_income, 4) if monthly_income > 0 else 0.0

        investment_df = df[df["category"].str.lower() == "investments"]
        total_investments = float(investment_df["amount"].sum()) if not investment_df.empty else 0.0
        investment_ratio = round(total_investments / monthly_income, 4) if monthly_income > 0 else 0.0
        investment_frequency = len(investment_df)

        emergency_savings_ratio = round(current_savings / (rolling_30d_spend + 1.0), 2)

        # 3. Essential vs Non-Essential
        essential_df = df[df["category"].isin(ESSENTIAL_CATEGORIES)]
        non_essential_df = df[df["category"].isin(NON_ESSENTIAL_CATEGORIES)]

        essential_spend = float(essential_df["amount"].sum())
        non_essential_spend = float(non_essential_df["amount"].sum())

        essential_spending_ratio = round(essential_spend / total_spending, 4) if total_spending > 0 else 0.50
        non_essential_spending_ratio = round(non_essential_spend / total_spending, 4) if total_spending > 0 else 0.50

        # 4. Behavioral Ratios (Weekend, Night, Impulse, Subscriptions)
        df["hour"] = df["parsed_date"].dt.hour
        df["dayofweek"] = df["parsed_date"].dt.dayofweek

        weekend_df = df[df["dayofweek"] >= 5]
        night_df = df[(df["hour"] >= 22) | (df["hour"] <= 5)]

        weekend_spending_ratio = round(float(weekend_df["amount"].sum()) / total_spending, 4) if total_spending > 0 else 0.20
        night_spending_ratio = round(float(night_df["amount"].sum()) / total_spending, 4) if total_spending > 0 else 0.05

        impulse_df = df[(df["category"].isin(["Shopping", "Entertainment"])) & (df["amount"] < 2000)]
        impulse_purchase_ratio = round(float(impulse_df["amount"].sum()) / total_spending, 4) if total_spending > 0 else 0.10

        subscription_df = df[df["merchant"].str.contains("netflix|spotify|hotstar|prime|youtube|apple", case=False, regex=True)]
        subscription_ratio = round(float(subscription_df["amount"].sum()) / monthly_income, 4) if monthly_income > 0 else 0.02

        # 5. Budget Utilization & Violations
        budget_utilization = round(rolling_30d_spend / monthly_budget, 4) if monthly_budget > 0 else 0.80
        budget_violations = 1 if rolling_30d_spend > monthly_budget else 0

        # 6. Volatility & Diversity
        merchant_diversity = df["merchant"].nunique()
        expense_volatility = round(float(df["amount"].std()), 2) if len(df) > 1 else 0.0
        cat_counts = df["category"].value_counts(normalize=True).to_dict()

        # 7. Goals & Consistency
        goal_progress = round(current_savings / goal_savings, 4) if goal_savings > 0 else 0.60
        cash_flow_stability = round(1.0 - (rolling_30d_spend / (monthly_income + 1.0)), 4)
        financial_consistency = round(min(1.0, num_transactions / 30.0), 2)
        income_stability = 0.95
        expense_growth_rate = 0.03
        lifestyle_inflation = 0.02
        recurring_expenses = float(subscription_df["amount"].sum()) + essential_spend * 0.40

        return {
            "monthly_income": monthly_income,
            "monthly_spending": rolling_30d_spend,
            "savings_rate": savings_rate,
            "income_stability": income_stability,
            "expense_growth_rate": expense_growth_rate,
            "category_distribution": cat_counts,
            "budget_utilization": budget_utilization,
            "investment_frequency": investment_frequency,
            "investment_ratio": investment_ratio,
            "emergency_savings_ratio": emergency_savings_ratio,
            "subscription_ratio": subscription_ratio,
            "impulse_purchase_ratio": impulse_purchase_ratio,
            "weekend_spending_ratio": weekend_spending_ratio,
            "night_spending_ratio": night_spending_ratio,
            "essential_spending_ratio": essential_spending_ratio,
            "non_essential_spending_ratio": non_essential_spending_ratio,
            "lifestyle_inflation": lifestyle_inflation,
            "merchant_diversity": merchant_diversity,
            "transaction_frequency": num_transactions,
            "expense_volatility": expense_volatility,
            "category_volatility": 0.12,
            "avg_daily_spend": avg_daily_spend,
            "rolling_30d_spend": rolling_30d_spend,
            "rolling_90d_spend": rolling_90d_spend,
            "goal_progress": goal_progress,
            "budget_violations": budget_violations,
            "recurring_expenses": recurring_expenses,
            "cash_flow_stability": cash_flow_stability,
            "financial_consistency": financial_consistency
        }

    @classmethod
    def _build_empty_features(cls, monthly_income: float, monthly_budget: float) -> Dict[str, Any]:
        return {
            "monthly_income": monthly_income,
            "monthly_spending": 0.0,
            "savings_rate": 0.40,
            "income_stability": 0.90,
            "expense_growth_rate": 0.0,
            "category_distribution": {},
            "budget_utilization": 0.0,
            "investment_frequency": 0,
            "investment_ratio": 0.15,
            "emergency_savings_ratio": 3.0,
            "subscription_ratio": 0.02,
            "impulse_purchase_ratio": 0.05,
            "weekend_spending_ratio": 0.20,
            "night_spending_ratio": 0.05,
            "essential_spending_ratio": 0.60,
            "non_essential_spending_ratio": 0.40,
            "lifestyle_inflation": 0.0,
            "merchant_diversity": 0,
            "transaction_frequency": 0,
            "expense_volatility": 0.0,
            "category_volatility": 0.0,
            "avg_daily_spend": 0.0,
            "rolling_30d_spend": 0.0,
            "rolling_90d_spend": 0.0,
            "goal_progress": 0.50,
            "budget_violations": 0,
            "recurring_expenses": 0.0,
            "cash_flow_stability": 0.90,
            "financial_consistency": 0.85
        }


feature_builder = FinancialFeatureBuilder()
