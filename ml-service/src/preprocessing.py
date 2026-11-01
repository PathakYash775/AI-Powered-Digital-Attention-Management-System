"""
Data Preprocessing & Feature Engineering Module
Builds standard scikit-learn transformers for tabular behavioral telemetry.
"""

import os
from typing import Tuple
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler

CATEGORICAL_FEATURES = ["app_name", "category", "day_used"]
NUMERICAL_FEATURES = [
    "hours_used",
    "number_events",
    "number_interactions",
    "switches",
    "event_span",
]
ALL_FEATURES = CATEGORICAL_FEATURES + NUMERICAL_FEATURES

TARGET_CLASSIFICATION = "is_distracted"
TARGET_REGRESSION = "attention_score"


def create_preprocessor() -> ColumnTransformer:
    """
    Creates a ColumnTransformer pipeline that:
    - Encodes categorical features with OneHotEncoder (handle_unknown='ignore', sparse_output=False)
    - Scales numerical features with StandardScaler
    """
    return ColumnTransformer(
        transformers=[
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
            (
                "num",
                StandardScaler(),
                NUMERICAL_FEATURES,
            ),
        ],
        remainder="drop",
    )


def load_and_validate_data(filepath: str) -> pd.DataFrame:
    """
    Loads dataset from CSV or Excel and validates expected schema and data types.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Dataset file not found at: {filepath}")

    if filepath.endswith(".xlsx") or filepath.endswith(".xls"):
        df = pd.read_excel(filepath)
    else:
        df = pd.read_csv(filepath)

    # Validate feature presence
    missing_features = [col for col in ALL_FEATURES if col not in df.columns]
    if missing_features:
        raise ValueError(f"Dataset missing required feature columns: {missing_features}")

    # Validate target presence
    for target in [TARGET_CLASSIFICATION, TARGET_REGRESSION]:
        if target not in df.columns:
            raise ValueError(f"Dataset missing required target column: {target}")

    # Drop missing values if any
    initial_count = len(df)
    df = df.dropna(subset=ALL_FEATURES + [TARGET_CLASSIFICATION, TARGET_REGRESSION]).copy()
    if len(df) < initial_count:
        print(f"[*] Dropped {initial_count - len(df)} rows with missing values.")

    return df


def split_data(
    df: pd.DataFrame, test_size: float = 0.2, random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series, pd.Series, pd.Series]:
    """
    Splits dataset into stratified training and testing sets to prevent data leakage.
    Returns: X_train, X_test, y_dist_train, y_dist_test, y_score_train, y_score_test
    """
    X = df[ALL_FEATURES]
    y_distracted = df[TARGET_CLASSIFICATION]
    y_score = df[TARGET_REGRESSION]

    return train_test_split(
        X,
        y_distracted,
        y_score,
        test_size=test_size,
        random_state=random_state,
        stratify=y_distracted,
    )
