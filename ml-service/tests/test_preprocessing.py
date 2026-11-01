"""
Unit tests for ML feature preprocessing and pipeline transformers.
"""

import os
import numpy as np
import pandas as pd
import pytest
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier

from src.preprocessing import (
    ALL_FEATURES,
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
    create_preprocessor,
    load_and_validate_data,
    split_data,
)


@pytest.fixture
def sample_dataframe():
    """Generates synthetic DataFrame matching the expected schema."""
    data = {
        "app_name": ["Visual Studio Code", "YouTube", "Slack", "Instagram", "GitHub"],
        "category": ["productive", "entertainment", "communication", "social", "productive"],
        "hours_used": [2.5, 1.2, 0.8, 1.5, 3.0],
        "day_used": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "number_events": [120, 80, 50, 95, 160],
        "number_interactions": [2100, 450, 800, 900, 3200],
        "switches": [5, 18, 12, 25, 4],
        "event_span": [150.0, 72.0, 48.0, 90.0, 180.0],
        "is_distracted": [0, 1, 0, 1, 0],
        "attention_score": [88, 42, 68, 38, 92],
    }
    return pd.DataFrame(data)


def test_preprocessor_transformation(sample_dataframe):
    """Test that preprocessor transforms categorical and numerical features into dense float array."""
    preprocessor = create_preprocessor()
    X = sample_dataframe[ALL_FEATURES]
    
    transformed = preprocessor.fit_transform(X)
    
    assert isinstance(transformed, np.ndarray)
    assert transformed.shape[0] == len(sample_dataframe)
    # Number of transformed columns: len(NUMERICAL_FEATURES) + one-hot encoded categories
    assert transformed.shape[1] >= len(NUMERICAL_FEATURES)
    assert not np.isnan(transformed).any(), "Transformed output must not contain NaN values"


def test_preprocessor_handles_unknown_categories(sample_dataframe):
    """Verify that unseen categorical values at test time do not throw errors."""
    preprocessor = create_preprocessor()
    X_train = sample_dataframe[ALL_FEATURES]
    preprocessor.fit(X_train)

    unseen_row = pd.DataFrame([{
        "app_name": "CompletelyUnseenApp_XYZ",
        "category": "unseen_cat",
        "hours_used": 1.0,
        "day_used": "UnknownDay",
        "number_events": 10,
        "number_interactions": 100,
        "switches": 2,
        "event_span": 60.0,
    }])

    transformed = preprocessor.transform(unseen_row)
    assert transformed.shape[0] == 1
    assert not np.isnan(transformed).any()


def test_split_data_shapes(sample_dataframe):
    """Ensure stratified split produces correct lengths and no data leakage."""
    X_train, X_test, y_dist_train, y_dist_test, y_score_train, y_score_test = split_data(
        sample_dataframe, test_size=0.4, random_state=42
    )

    assert len(X_train) == 3
    assert len(X_test) == 2
    assert len(y_dist_train) == 3
    assert len(y_score_test) == 2
    assert set(X_train.columns) == set(ALL_FEATURES)


def test_pipeline_fit_and_predict(sample_dataframe):
    """Verify full scikit-learn Pipeline works seamlessly with ColumnTransformer."""
    preprocessor = create_preprocessor()
    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("regressor", RandomForestRegressor(n_estimators=10, random_state=42)),
    ])

    X = sample_dataframe[ALL_FEATURES]
    y = sample_dataframe["attention_score"]

    pipeline.fit(X, y)
    preds = pipeline.predict(X)

    assert len(preds) == len(sample_dataframe)
    assert all(10 <= p <= 100 for p in preds)


def test_load_and_validate_missing_columns(tmp_path):
    """Verify ValueError is raised if critical features are missing."""
    csv_file = tmp_path / "corrupt_dataset.csv"
    pd.DataFrame({"app_name": ["App1"], "hours_used": [1.0]}).to_csv(csv_file, index=False)

    with pytest.raises(ValueError) as excinfo:
        load_and_validate_data(str(csv_file))
    assert "missing required" in str(excinfo.value)
