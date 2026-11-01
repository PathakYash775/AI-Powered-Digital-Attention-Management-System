"""
Convenience entry point for training models.
Can be executed as: python train.py
"""

import os
import sys

# Ensure ml-service root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.train import train_and_evaluate

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidate_paths = [
        os.path.join(base_dir, "data", "attention_training_dataset.csv"),
        os.path.join(base_dir, "dataset", "attention_training_dataset.csv"),
    ]

    data_path = None
    for p in candidate_paths:
        if os.path.exists(p):
            data_path = p
            break

    if not data_path:
        raise FileNotFoundError("Could not find attention_training_dataset.csv in data/ or dataset/")

    models_dir = os.path.join(base_dir, "models")
    artifacts_dir = os.path.join(base_dir, "artifacts")

    train_and_evaluate(data_path, models_dir, artifacts_dir)
