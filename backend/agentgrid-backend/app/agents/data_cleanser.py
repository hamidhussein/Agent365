"""
DataCleanser Agent for AgentGrid
================================
AI-powered data cleaning agent that detects and fixes data quality issues
in CSV, Excel, and JSON files. Returns a cleaned CSV (base64), a cleaning
report, detected issues, and a quick preview of the cleaned rows.
"""

from typing import Dict, Any, List
import base64
import io
import json
import logging
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

from app.agents.base import BaseAgent, AgentInput, AgentOutput
from app.agents.registry import register_agent

# Optional dependencies with fallbacks
try:
    import phonenumbers

    PHONE_AVAILABLE = True
except ImportError:
    PHONE_AVAILABLE = False

try:
    from email_validator import validate_email, EmailNotValidError

    EMAIL_AVAILABLE = True
except ImportError:
    EMAIL_AVAILABLE = False

try:
    from openai import OpenAI
    import os

    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

logger = logging.getLogger(__name__)

# Generated with: python - <<'PY'
# import uuid; print(uuid.uuid4())
# PY
DATA_CLEANSER_AGENT_ID = "a7f3c2d1-8e4b-4a9c-b5d6-3f2e1a9c8b7d"


class DataCleanserConfig:
    """Configuration constants for the DataCleanser Agent."""

    MISSING_VALUES = [
        "",
        " ",
        "NA",
        "N/A",
        "n/a",
        "null",
        "NULL",
        "None",
        "NONE",
        "nan",
        "NaN",
        "NAN",
        "Unknown",
        "unknown",
        "UNKNOWN",
        "-",
        "--",
        "?",
        "N.A.",
        "n.a.",
    ]

    NUMERIC_STRATEGIES = ["mean", "median", "mode", "forward_fill", "zero"]
    CATEGORICAL_STRATEGIES = ["mode", "unknown", "forward_fill"]
    DUPLICATE_STRATEGIES = ["first", "last", "most_complete"]
    TARGET_DATE_FORMAT = "%Y-%m-%d"
    OUTLIER_IQR_MULTIPLIER = 3.0
    OPENAI_MODEL = "gpt-4o-mini"

    AI_SYSTEM_PROMPT = """You are an expert data quality analyst and data engineer specializing in data cleaning and standardization.

Your role is to:
1. Analyze data quality issues and provide intelligent recommendations
2. Suggest appropriate data type conversions based on content patterns
3. Standardize column names to be clean, consistent, and meaningful
4. Provide context-aware missing value imputation strategies
5. Explain detected anomalies and outliers with business context
6. Recommend optimal cleaning strategies based on data patterns

Guidelines:
- Be concise and actionable in your recommendations
- Consider the business context when making suggestions
- Prioritize data integrity and consistency
- Explain your reasoning clearly
- Provide specific examples when helpful
- Focus on practical, implementable solutions

Always respond in JSON format when requested for structured outputs."""


def _to_bool(value: Any, default: bool) -> bool:
    """Normalize incoming boolean-ish values."""
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes", "y", "on"}:
            return True
        if lowered in {"false", "0", "no", "n", "off"}:
            return False
    return default


def _safe_decode_base64(data: str) -> bytes:
    try:
        return base64.b64decode(data)
    except Exception as exc:
        raise ValueError(f"Invalid base64 encoded file_data: {exc}") from exc


@register_agent(DATA_CLEANSER_AGENT_ID)
class DataCleanserAgent(BaseAgent):
    """
    DataCleanser Agent for AgentGrid.

    Automatically detects and fixes data quality issues including:
    - Missing values
    - Duplicate records
    - Formatting inconsistencies
    - Data type mismatches
    - Statistical outliers
    """

    @property
    def name(self) -> str:
        return "DataCleanser Agent"

    @property
    def description(self) -> str:
        return (
            "AI-powered data cleaning agent that detects and fixes issues in CSV, "
            "Excel, and JSON files. Handles missing values, duplicates, formatting "
            "inconsistencies, type mismatches, and outliers."
        )

    @property
    def inputs(self) -> List[AgentInput]:
        return [
            AgentInput(
                name="file_data",
                type="file",
                description="Upload data file (CSV, Excel, or JSON). Will be base64 encoded automatically.",
                required=True,
            ),
            AgentInput(
                name="file_type",
                type="select",
                description="File format to process",
                required=True,
                options=["csv", "xlsx", "xls", "json"],
            ),
            AgentInput(
                name="numeric_strategy",
                type="select",
                description="Missing numeric handling strategy (default: median)",
                required=False,
                options=DataCleanserConfig.NUMERIC_STRATEGIES,
            ),
            AgentInput(
                name="categorical_strategy",
                type="select",
                description="Missing categorical handling strategy (default: mode)",
                required=False,
                options=DataCleanserConfig.CATEGORICAL_STRATEGIES,
            ),
            AgentInput(
                name="duplicate_strategy",
                type="select",
                description="Duplicate handling strategy (default: first)",
                required=False,
                options=DataCleanserConfig.DUPLICATE_STRATEGIES,
            ),
            AgentInput(
                name="standardize_dates",
                type="select",
                description="Standardize date formats to YYYY-MM-DD",
                required=False,
                options=["true", "false"],
            ),
            AgentInput(
                name="standardize_text",
                type="select",
                description="Standardize text casing",
                required=False,
                options=["true", "false"],
            ),
            AgentInput(
                name="remove_outliers",
                type="select",
                description="Replace statistical outliers with median",
                required=False,
                options=["true", "false"],
            ),
            AgentInput(
                name="use_ai",
                type="select",
                description="Use AI-powered analysis (requires OPENAI_API_KEY)",
                required=False,
                options=["true", "false"],
            ),
            AgentInput(
                name="openai_api_key",
                type="string",
                description="Optional OpenAI API key to enable AI-powered recommendations for this run",
                required=False,
            ),
        ]

    @property
    def outputs(self) -> List[AgentOutput]:
        return [
            AgentOutput(
                name="cleaned_data",
                type="string",
                description="Base64 encoded cleaned CSV file",
            ),
            AgentOutput(
                name="cleaning_report",
                type="object",
                description="Detailed cleaning report with statistics",
            ),
            AgentOutput(
                name="issues_detected",
                type="object",
                description="Summary of data quality issues found",
            ),
            AgentOutput(
                name="summary",
                type="object",
                description="High-level summary of cleaning operations",
            ),
            AgentOutput(
                name="preview_rows",
                type="object",
                description="Sample of the cleaned data for quick preview",
            ),
            AgentOutput(
                name="ai_insights",
                type="object",
                description="Optional AI-generated recommendations and notes",
            ),
        ]

    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the data cleaning process.

        Args:
            inputs: Dictionary containing file_data, file_type, and cleaning preferences.
        Returns:
            Dictionary containing cleaned_data, cleaning_report, issues_detected, summary, and preview_rows.
        """
        try:
            file_data = inputs.get("file_data")
            file_type = str(inputs.get("file_type", "csv")).lower().strip()
            numeric_strategy = inputs.get("numeric_strategy") or "median"
            categorical_strategy = inputs.get("categorical_strategy") or "mode"
            duplicate_strategy = inputs.get("duplicate_strategy") or "first"
            standardize_dates = _to_bool(inputs.get("standardize_dates", True), True)
            standardize_text = _to_bool(inputs.get("standardize_text", True), True)
            remove_outliers = _to_bool(inputs.get("remove_outliers", False), False)
            use_ai = _to_bool(inputs.get("use_ai", True), True)
            openai_api_key = inputs.get("openai_api_key")

            if not file_data:
                raise ValueError("file_data is required")
            if file_type not in {"csv", "xlsx", "xls", "json"}:
                raise ValueError("Unsupported file_type: must be csv, xlsx, xls, or json")

            file_bytes = _safe_decode_base64(file_data)
            df_original = self._load_data(file_bytes, file_type)
            df_cleaned = df_original.copy()

            config = DataCleanserConfig()
            cleaning_report: List[Dict[str, Any]] = []

            ai_client = None
            if use_ai and OPENAI_AVAILABLE:
                try:
                    api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
                    if api_key:
                        ai_client = OpenAI(api_key=api_key)
                        logger.info("AI features enabled for DataCleanser")
                except Exception as exc:  # pragma: no cover - optional path
                    logger.warning(f"Could not setup OpenAI: {exc}")

            issues_detected = self._detect_all_issues(df_original, config)

            df_cleaned, missing_report = self._clean_missing_values(
                df_cleaned, numeric_strategy, categorical_strategy, config
            )
            cleaning_report.extend(missing_report)

            df_cleaned, dup_report = self._clean_duplicates(df_cleaned, duplicate_strategy)
            if dup_report:
                cleaning_report.append(dup_report)

            if standardize_dates:
                df_cleaned, date_reports = self._standardize_dates(df_cleaned, config)
                cleaning_report.extend(date_reports)

            if standardize_text:
                df_cleaned, text_reports = self._standardize_text(df_cleaned)
                cleaning_report.extend(text_reports)

            df_cleaned = self._clean_whitespace(df_cleaned)

            if PHONE_AVAILABLE:
                df_cleaned, phone_reports = self._standardize_phone_numbers(df_cleaned)
                cleaning_report.extend(phone_reports)

            if EMAIL_AVAILABLE:
                df_cleaned, email_reports = self._validate_emails(df_cleaned)
                cleaning_report.extend(email_reports)

            df_cleaned, type_reports = self._fix_data_types(df_cleaned)
            cleaning_report.extend(type_reports)

            if remove_outliers:
                df_cleaned, outlier_reports = self._handle_outliers(df_cleaned, config)
                cleaning_report.extend(outlier_reports)

            summary = {
                "original_rows": int(len(df_original)),
                "cleaned_rows": int(len(df_cleaned)),
                "rows_removed": int(len(df_original) - len(df_cleaned)),
                "total_columns": int(len(df_cleaned.columns)),
                "operations_performed": int(len(cleaning_report)),
                "timestamp": datetime.now().isoformat(),
                "ai_used": bool(ai_client),
                "ai_requested": bool(use_ai),
                "ai_note": "AI disabled (missing OPENAI_API_KEY)" if use_ai and not ai_client else "AI enabled" if ai_client else "AI not requested",
            }

            csv_buffer = io.StringIO()
            df_cleaned.to_csv(csv_buffer, index=False)
            cleaned_csv = csv_buffer.getvalue()
            cleaned_data_b64 = base64.b64encode(cleaned_csv.encode()).decode()

            preview_rows = json.loads(df_cleaned.head(10).to_json(orient="records"))

            ai_insights: Dict[str, Any] = {}
            if ai_client:
                ai_insights = self._generate_ai_insights(ai_client, issues_detected, summary, config)
            else:
                ai_insights = {"note": summary["ai_note"]}

            return {
                "cleaned_data": cleaned_data_b64,
                "cleaning_report": cleaning_report,
                "issues_detected": issues_detected,
                "summary": summary,
                "preview_rows": preview_rows,
                "ai_insights": ai_insights,
            }

        except Exception as exc:
            logger.error(f"DataCleanser execution failed: {exc}")
            raise

    def _load_data(self, file_bytes: bytes, file_type: str) -> pd.DataFrame:
        """Load data from bytes based on file type."""
        config = DataCleanserConfig()

        try:
            if file_type == "csv":
                return pd.read_csv(io.BytesIO(file_bytes), na_values=config.MISSING_VALUES)
            if file_type in {"xlsx", "xls"}:
                return pd.read_excel(io.BytesIO(file_bytes), na_values=config.MISSING_VALUES)
            if file_type == "json":
                return pd.read_json(io.BytesIO(file_bytes))
        except Exception as exc:
            raise ValueError(f"Failed to load {file_type} file: {exc}") from exc

        raise ValueError(f"Unsupported file type: {file_type}")

    def _detect_all_issues(self, df: pd.DataFrame, config: DataCleanserConfig) -> Dict[str, Any]:
        """Detect data quality issues across the dataset."""
        issues: Dict[str, Any] = {
            "missing_values": {},
            "duplicates": {"exact_count": 0, "exact_rows": []},
            "formatting": {
                "inconsistent_case": [],
                "whitespace_issues": [],
                "mixed_date_formats": [],
                "mixed_phone_formats": [],
                "invalid_emails": [],
            },
            "data_types": {},
            "outliers": {},
        }

        for col in df.columns:
            missing_count = int(df[col].isna().sum())
            if missing_count > 0:
                issues["missing_values"][col] = {
                    "count": missing_count,
                    "percentage": float(missing_count / len(df) * 100),
                    "data_type": str(df[col].dtype),
                }

        exact_dupes = int(df.duplicated(keep=False).sum())
        issues["duplicates"]["exact_count"] = exact_dupes
        issues["duplicates"]["exact_rows"] = [int(idx) for idx in df[df.duplicated(keep=False)].index.tolist()]

        for col in df.columns:
            if df[col].dtype == "object":
                non_null = df[col].dropna()
                if len(non_null) == 0:
                    continue

                has_upper = non_null.str.isupper().any()
                has_lower = non_null.str.islower().any()
                has_title = non_null.str.istitle().any()

                if sum([has_upper, has_lower, has_title]) > 1:
                    issues["formatting"]["inconsistent_case"].append(col)

                if non_null.str.contains(r"^\s|\s$|\s{2,}", regex=True).any():
                    issues["formatting"]["whitespace_issues"].append(col)

                if self._could_be_dates(non_null):
                    issues["formatting"]["mixed_date_formats"].append(col)

                if self._could_be_phones(non_null):
                    issues["formatting"]["mixed_phone_formats"].append(col)

                if self._could_be_emails(non_null):
                    issues["formatting"]["invalid_emails"].append(col)

        for col in df.columns:
            current_type = str(df[col].dtype)
            if current_type == "object":
                non_null = df[col].dropna()
                if len(non_null) == 0:
                    continue

                sample = (
                    non_null.head(100)
                    .astype(str)
                    .str.replace(",", "")
                    .str.replace("$", "")
                    .str.replace("€", "")
                )
                try:
                    pd.to_numeric(sample, errors="raise")
                    issues["data_types"][col] = f"Should be numeric, currently {current_type}"
                except Exception:
                    if self._could_be_dates(non_null):
                        issues["data_types"][col] = f"Should be datetime, currently {current_type}"

        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1

            lower_bound = Q1 - config.OUTLIER_IQR_MULTIPLIER * IQR
            upper_bound = Q3 + config.OUTLIER_IQR_MULTIPLIER * IQR

            outlier_values = df[(df[col] < lower_bound) | (df[col] > upper_bound)][col].tolist()
            if outlier_values:
                issues["outliers"][col] = [float(v) for v in outlier_values[:10]]

        return issues

    def _clean_missing_values(
        self, df: pd.DataFrame, numeric_strategy: str, categorical_strategy: str, config: DataCleanserConfig
    ) -> tuple:
        """Clean missing values and return updated dataframe plus report."""
        reports = []

        for col in df.columns:
            if not df[col].isna().any():
                continue

            if pd.api.types.is_numeric_dtype(df[col]):
                before_count = int(df[col].isna().sum())

                if numeric_strategy == "mean":
                    fill_value = df[col].mean()
                elif numeric_strategy == "median":
                    fill_value = df[col].median()
                elif numeric_strategy == "mode":
                    fill_value = df[col].mode()[0] if not df[col].mode().empty else 0
                elif numeric_strategy == "zero":
                    fill_value = 0
                elif numeric_strategy == "forward_fill":
                    df[col].fillna(method="ffill", inplace=True)
                    reports.append(
                        {
                            "column": col,
                            "issue": "missing_values",
                            "action": "Filled with forward_fill",
                            "before": before_count,
                            "after": int(df[col].isna().sum()),
                        }
                    )
                    continue
                else:
                    fill_value = df[col].median()

                df[col].fillna(fill_value, inplace=True)
                reports.append(
                    {
                        "column": col,
                        "issue": "missing_values",
                        "action": f"Filled with {numeric_strategy}",
                        "before": before_count,
                        "after": int(df[col].isna().sum()),
                    }
                )
            else:
                before_count = int(df[col].isna().sum())

                if categorical_strategy == "mode":
                    fill_value = df[col].mode()[0] if not df[col].mode().empty else "Unknown"
                elif categorical_strategy == "unknown":
                    fill_value = "Unknown"
                elif categorical_strategy == "forward_fill":
                    df[col].fillna(method="ffill", inplace=True)
                    reports.append(
                        {
                            "column": col,
                            "issue": "missing_values",
                            "action": "Filled with forward_fill",
                            "before": before_count,
                            "after": int(df[col].isna().sum()),
                        }
                    )
                    continue
                else:
                    fill_value = df[col].mode()[0] if not df[col].mode().empty else "Unknown"

                df[col].fillna(fill_value, inplace=True)
                reports.append(
                    {
                        "column": col,
                        "issue": "missing_values",
                        "action": f"Filled with {categorical_strategy}",
                        "before": before_count,
                        "after": int(df[col].isna().sum()),
                    }
                )

        return df, reports

    def _clean_duplicates(self, df: pd.DataFrame, strategy: str) -> tuple:
        """Remove duplicate rows according to the configured strategy."""
        before_count = len(df)

        if strategy == "first":
            df.drop_duplicates(keep="first", inplace=True)
        elif strategy == "last":
            df.drop_duplicates(keep="last", inplace=True)
        elif strategy == "most_complete":
            df["_missing_count"] = df.isna().sum(axis=1)
            df.sort_values("_missing_count", inplace=True)
            df.drop_duplicates(subset=df.columns.difference(["_missing_count"]), keep="first", inplace=True)
            df.drop("_missing_count", axis=1, inplace=True)
        else:
            df.drop_duplicates(keep="first", inplace=True)

        after_count = len(df)
        removed = before_count - after_count

        if removed > 0:
            return df, {
                "column": "ALL",
                "issue": "duplicates",
                "action": f"Removed duplicates (keep {strategy})",
                "before": int(before_count),
                "after": int(after_count),
                "removed": int(removed),
            }
        return df, None

    def _standardize_dates(self, df: pd.DataFrame, config: DataCleanserConfig) -> tuple:
        """Standardize date formats to the target pattern."""
        reports = []

        for col in df.columns:
            if not self._could_be_dates(df[col].dropna()):
                continue
            try:
                df[col] = pd.to_datetime(df[col], errors="coerce", infer_datetime_format=True)
                df[col] = df[col].dt.strftime(config.TARGET_DATE_FORMAT)
                reports.append(
                    {
                        "column": col,
                        "issue": "date_format",
                        "action": f"Standardized to {config.TARGET_DATE_FORMAT}",
                        "status": "success",
                    }
                )
            except Exception as exc:
                logger.warning(f"Could not standardize dates in {col}: {exc}")

        return df, reports

    def _standardize_text(self, df: pd.DataFrame) -> tuple:
        """Standardize text case to title case for string columns."""
        reports = []

        for col in df.columns:
            if df[col].dtype != "object":
                continue
            sample = df[col].dropna().head(5).astype(str)
            if not sample.str.contains(" ").any():
                continue
            try:
                df[col] = df[col].str.title()
                reports.append(
                    {
                        "column": col,
                        "issue": "text_case",
                        "action": "Standardized to title case",
                        "status": "success",
                    }
                )
            except Exception:
                continue

        return df, reports

    def _clean_whitespace(self, df: pd.DataFrame) -> pd.DataFrame:
        """Trim leading/trailing whitespace and collapse multiple spaces."""
        for col in df.columns:
            if df[col].dtype == "object":
                df[col] = df[col].str.strip().str.replace(r"\s+", " ", regex=True)
        return df

    def _standardize_phone_numbers(self, df: pd.DataFrame) -> tuple:
        """Standardize phone number formats when phonenumbers is available."""
        reports = []

        for col in df.columns:
            if not self._could_be_phones(df[col].dropna()):
                continue

            def format_phone(phone: Any):
                if pd.isna(phone):
                    return phone
                try:
                    parsed = phonenumbers.parse(str(phone), "US")
                    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
                except Exception:
                    return phone

            df[col] = df[col].apply(format_phone)
            reports.append(
                {
                    "column": col,
                    "issue": "phone_format",
                    "action": "Standardized to E.164 format",
                    "status": "success",
                }
            )

        return df, reports

    def _validate_emails(self, df: pd.DataFrame) -> tuple:
        """Validate and clean email addresses when email-validator is available."""
        reports = []

        for col in df.columns:
            if not self._could_be_emails(df[col].dropna()):
                continue

            def clean_email(email: Any):
                if pd.isna(email):
                    return email
                try:
                    validated = validate_email(str(email), check_deliverability=False)
                    return validated.normalized
                except EmailNotValidError:
                    return None

            before_valid = int(df[col].notna().sum())
            df[col] = df[col].apply(clean_email)
            after_valid = int(df[col].notna().sum())

            reports.append(
                {
                    "column": col,
                    "issue": "email_validation",
                    "action": "Validated emails",
                    "before": before_valid,
                    "after": after_valid,
                    "invalid_removed": int(before_valid - after_valid),
                }
            )

        return df, reports

    def _fix_data_types(self, df: pd.DataFrame) -> tuple:
        """Convert columns to appropriate data types when possible."""
        reports = []

        for col in df.columns:
            if df[col].dtype != "object":
                continue

            cleaned = (
                df[col]
                .astype(str)
                .str.replace(",", "")
                .str.replace("$", "")
                .str.replace("€", "")
                .str.replace("USD", "")
                .str.strip()
            )

            try:
                df[col] = pd.to_numeric(cleaned, errors="raise")
                reports.append(
                    {
                        "column": col,
                        "issue": "data_type",
                        "action": "Converted to numeric",
                        "status": "success",
                    }
                )
            except Exception:
                continue

        return df, reports

    def _handle_outliers(self, df: pd.DataFrame, config: DataCleanserConfig) -> tuple:
        """Replace outliers with median values."""
        reports = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns

        for col in numeric_cols:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1

            lower_bound = Q1 - config.OUTLIER_IQR_MULTIPLIER * IQR
            upper_bound = Q3 + config.OUTLIER_IQR_MULTIPLIER * IQR

            outlier_mask = (df[col] < lower_bound) | (df[col] > upper_bound)
            outlier_count = int(outlier_mask.sum())

            if outlier_count > 0:
                median_val = df[col].median()
                df.loc[outlier_mask, col] = median_val

                reports.append(
                    {
                        "column": col,
                        "issue": "outliers",
                        "action": f"Replaced {outlier_count} outliers with median",
                        "median_value": float(median_val),
                        "count": outlier_count,
                    }
                )

        return df, reports

    def _could_be_dates(self, series: pd.Series) -> bool:
        """Check if a series could contain dates."""
        sample = series.head(10).astype(str)
        date_patterns = [
            r"\d{4}-\d{2}-\d{2}",
            r"\d{2}/\d{2}/\d{4}",
            r"\d{1,2}-\d{1,2}-\d{2,4}",
            r"\d{1,2}/\d{1,2}/\d{2,4}",
        ]

        return any(sample.str.contains(pattern, regex=True).any() for pattern in date_patterns)

    def _could_be_phones(self, series: pd.Series) -> bool:
        """Check if a series could contain phone numbers."""
        sample = series.head(10).astype(str)
        return sample.str.contains(r"\d{3}[-.\s]?\d{3}[-.\s]?\d{4}", regex=True).any()

    def _could_be_emails(self, series: pd.Series) -> bool:
        """Check if a series could contain emails."""
        sample = series.head(10).astype(str)
        return sample.str.contains(r"@", regex=False).any()

    def _generate_ai_insights(
        self,
        ai_client: Any,
        issues_detected: Dict[str, Any],
        summary: Dict[str, Any],
        config: DataCleanserConfig,
    ) -> Dict[str, Any]:
        """
        Generate AI recommendations based on detected issues and summary.
        The output is compact JSON to surface in the UI.
        """
        try:
            prompt = (
                "You are a senior data quality analyst. Summarize the main issues and recommend the top 3 fixes. "
                "Keep it concise and actionable. Return JSON with keys: "
                '{"overview": "...", "top_issues": ["..."], "recommended_actions": ["..."], "confidence": 0-1}. '
                "Issues: "
                + json.dumps(issues_detected)[:4000]
                + " Summary: "
                + json.dumps(summary)
            )

            resp = ai_client.chat.completions.create(
                model=config.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": config.AI_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=300,
            )
            content = resp.choices[0].message.content
            try:
                return json.loads(content)
            except Exception:
                return {"overview": content, "top_issues": [], "recommended_actions": [], "confidence": 0.5}
        except Exception as exc:
            logger.warning(f"AI insights generation failed: {exc}")
            return {"note": "AI call failed", "error": str(exc)}
