"""
End-to-End Model Training Pipeline
Trains RandomForestRegressor (Attention Score) and RandomForestClassifier (Distraction Detection)
and serializes fitted pipelines using joblib.
"""

import os
import joblib
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.pipeline import Pipeline

from src.preprocessing import (
    ALL_FEATURES,
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
    create_preprocessor,
    load_and_validate_data,
    split_data,
)
from src.evaluate import (
    evaluate_classification,
    evaluate_regression,
    save_evaluation_artifacts,
)


def train_and_evaluate(data_path: str, models_dir: str, artifacts_dir: str):
    print("=" * 65)
    print("AI-Powered Digital Attention Management System — Model Training")
    print("=" * 65)

    # 1. Load data
    print(f"\n[1/5] Loading training dataset from: {data_path}")
    df = load_and_validate_data(data_path)
    print(f"[+] Successfully loaded {len(df)} samples.")
    print(f"[+] Categorical features: {CATEGORICAL_FEATURES}")
    print(f"[+] Numerical features:   {NUMERICAL_FEATURES}")

    # 2. Train/Test Split
    print("\n[2/5] Performing stratified train/test split (80/20)...")
    X_train, X_test, y_dist_train, y_dist_test, y_score_train, y_score_test = split_data(
        df, test_size=0.2, random_state=42
    )
    print(f"[+] Training set: {len(X_train)} samples")
    print(f"[+] Testing set:  {len(X_test)} samples")

    # 3. Train Model 1: Attention Score Regressor
    print("\n[3/5] Fitting Model 1: RandomForestRegressor (target='attention_score')...")
    preprocessor_reg = create_preprocessor()
    reg_pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor_reg),
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=100, max_depth=12, random_state=42, n_jobs=-1
                ),
            ),
        ]
    )
    reg_pipeline.fit(X_train, y_score_train)
    y_score_pred = reg_pipeline.predict(X_test)
    reg_metrics = evaluate_regression(y_score_test, y_score_pred)
    print("     Regressor Metrics:")
    print(f"       * Mean Absolute Error (MAE): {reg_metrics['mae']}")
    print(f"       * Root Mean Squared Error (RMSE): {reg_metrics['rmse']}")
    print(f"       * R² Score:                  {reg_metrics['r2_score']}")

    # 4. Train Model 2: Distraction Classifier
    print("\n[4/5] Fitting Model 2: RandomForestClassifier (target='is_distracted')...")
    preprocessor_clf = create_preprocessor()
    clf_pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor_clf),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=100, max_depth=12, random_state=42, n_jobs=-1
                ),
            ),
        ]
    )
    clf_pipeline.fit(X_train, y_dist_train)
    y_dist_pred = clf_pipeline.predict(X_test)
    clf_metrics = evaluate_classification(y_dist_test, y_dist_pred)
    print("     Classifier Metrics:")
    print(f"       * Accuracy:  {clf_metrics['accuracy'] * 100:.2f}%")
    print(f"       * Precision: {clf_metrics['precision'] * 100:.2f}%")
    print(f"       * Recall:    {clf_metrics['recall'] * 100:.2f}%")
    print(f"       * F1-Score:  {clf_metrics['f1_score'] * 100:.2f}%")
    print(f"       * Confusion Matrix: {clf_metrics['confusion_matrix']}")

    # 5. Persist Models & Artifacts
    print("\n[5/5] Persisting fitted pipelines and evaluation artifacts...")
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(artifacts_dir, exist_ok=True)

    bundle = {
        "regressor": reg_pipeline,
        "classifier": clf_pipeline,
        "features": ALL_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "numerical_features": NUMERICAL_FEATURES,
        "metrics": {
            "regressor": reg_metrics,
            "classifier": {
                "accuracy": clf_metrics["accuracy"],
                "precision": clf_metrics["precision"],
                "recall": clf_metrics["recall"],
                "f1_score": clf_metrics["f1_score"],
            },
        },
    }

    model_path = os.path.join(models_dir, "attention_model.joblib")
    joblib.dump(bundle, model_path)
    print(f"[+] Saved model bundle to: {model_path}")

    save_evaluation_artifacts(
        reg_metrics,
        clf_metrics,
        y_score_test,
        y_score_pred,
        y_dist_test,
        y_dist_pred,
        artifacts_dir,
    )

    print("\n" + "=" * 65)
    print("TRAINING COMPLETE: All models and artifacts successfully saved!")
    print("=" * 65)
    return model_path


if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    ml_root = os.path.abspath(os.path.join(current_dir, ".."))

    candidate_data = [
        os.path.join(ml_root, "data", "attention_training_dataset.csv"),
        os.path.join(ml_root, "dataset", "attention_training_dataset.csv"),
    ]

    data_file = None
    for p in candidate_data:
        if os.path.exists(p):
            data_file = p
            break

    if not data_file:
        raise FileNotFoundError("Could not find attention_training_dataset.csv in data/ or dataset/")

    models_directory = os.path.join(ml_root, "models")
    artifacts_directory = os.path.join(ml_root, "artifacts")

    train_and_evaluate(data_file, models_directory, artifacts_directory)
