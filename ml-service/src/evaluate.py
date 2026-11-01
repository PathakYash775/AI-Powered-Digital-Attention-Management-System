"""
Model Evaluation and Metrics Module
Calculates MAE, RMSE, R2, accuracy, precision, recall, F1-score, and confusion matrix.
Generates evaluation visual artifacts.
"""

import json
import os
from typing import Any, Dict
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    precision_score,
    recall_score,
    root_mean_squared_error,
    r2_score,
)


def evaluate_regression(y_true, y_pred) -> Dict[str, float]:
    """
    Evaluates regression model: MAE, RMSE, and R2.
    """
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(root_mean_squared_error(y_true, y_pred))
    r2 = float(r2_score(y_true, y_pred))

    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "r2_score": round(r2, 4),
    }


def evaluate_classification(y_true, y_pred) -> Dict[str, Any]:
    """
    Evaluates binary classification model: Accuracy, Precision, Recall, F1, and Confusion Matrix.
    """
    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    cm = confusion_matrix(y_true, y_pred).tolist()
    report = classification_report(
        y_true, y_pred, target_names=["Focused (0)", "Distracted (1)"], output_dict=True
    )

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "confusion_matrix": cm,
        "classification_report": report,
    }


def save_evaluation_artifacts(
    reg_metrics: Dict[str, float],
    clf_metrics: Dict[str, Any],
    y_test_reg,
    y_pred_reg,
    y_test_clf,
    y_pred_clf,
    artifacts_dir: str,
):
    """
    Saves evaluation metrics JSON and visualization plots to artifacts directory.
    """
    os.makedirs(artifacts_dir, exist_ok=True)

    # 1. Save JSON metrics
    metrics_path = os.path.join(artifacts_dir, "evaluation_metrics.json")
    payload = {
        "attention_score_regression": reg_metrics,
        "distraction_classification": {
            "accuracy": clf_metrics["accuracy"],
            "precision": clf_metrics["precision"],
            "recall": clf_metrics["recall"],
            "f1_score": clf_metrics["f1_score"],
            "confusion_matrix": clf_metrics["confusion_matrix"],
        },
    }
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print(f"[+] Evaluation metrics saved to: {metrics_path}")

    # 2. Confusion matrix plot
    try:
        cm = np.array(clf_metrics["confusion_matrix"])
        fig, ax = plt.subplots(figsize=(6, 5))
        sns.heatmap(
            cm,
            annot=True,
            fmt="d",
            cmap="Blues",
            xticklabels=["Focused (0)", "Distracted (1)"],
            yticklabels=["Focused (0)", "Distracted (1)"],
            ax=ax,
        )
        ax.set_title("Distraction Detection — Confusion Matrix")
        ax.set_xlabel("Predicted Label")
        ax.set_ylabel("True Label")
        fig.tight_layout()
        cm_path = os.path.join(artifacts_dir, "confusion_matrix.png")
        fig.savefig(cm_path, dpi=150)
        plt.close(fig)
        print(f"[+] Confusion matrix plot saved to: {cm_path}")
    except Exception as e:
        print(f"[!] Warning: Could not plot confusion matrix: {e}")

    # 3. Regression residuals plot
    try:
        residuals = np.array(y_test_reg) - np.array(y_pred_reg)
        fig, ax = plt.subplots(figsize=(7, 5))
        sns.histplot(residuals, kde=True, color="#0284c7", ax=ax)
        ax.axvline(0, color="red", linestyle="--", alpha=0.7)
        ax.set_title("Attention Score Regressor — Residual Distribution")
        ax.set_xlabel("Error (True Score - Predicted Score)")
        ax.set_ylabel("Frequency")
        fig.tight_layout()
        res_path = os.path.join(artifacts_dir, "regression_residuals.png")
        fig.savefig(res_path, dpi=150)
        plt.close(fig)
        print(f"[+] Residuals plot saved to: {res_path}")
    except Exception as e:
        print(f"[!] Warning: Could not plot residuals: {e}")
