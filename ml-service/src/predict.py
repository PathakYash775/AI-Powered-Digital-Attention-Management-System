"""
Model Inference and Prediction Service
Loads fitted pipelines from models/attention_model.joblib and provides:
1. Python prediction APIs (predict_single, predict_batch)
2. FastAPI REST endpoints (/healthz, /predict, /predict/batch)
Runs internally on port 8001.
"""

import os
from typing import Any, Dict, List, Optional
import joblib
import pandas as pd
from pydantic import BaseModel, Field

# Lazy load container
_LOADED_BUNDLE: Optional[Dict[str, Any]] = None


def get_default_model_path() -> str:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    ml_root = os.path.abspath(os.path.join(current_dir, ".."))
    return os.path.join(ml_root, "models", "attention_model.joblib")


def load_model_bundle(model_path: Optional[str] = None) -> Dict[str, Any]:
    global _LOADED_BUNDLE
    if _LOADED_BUNDLE is not None:
        return _LOADED_BUNDLE

    target_path = model_path or get_default_model_path()
    if not os.path.exists(target_path):
        raise FileNotFoundError(
            f"Trained model bundle not found at: {target_path}. Please run train.py first."
        )

    _LOADED_BUNDLE = joblib.load(target_path)
    return _LOADED_BUNDLE


def predict_single(data: Dict[str, Any], model_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Predicts attention_score and is_distracted for a single behavioral feature dictionary.
    """
    bundle = load_model_bundle(model_path)
    features_order = bundle.get("features", [
        "app_name", "category", "day_used", "hours_used",
        "number_events", "number_interactions", "switches", "event_span"
    ])

    df = pd.DataFrame([data])
    df = df[[f for f in features_order if f in df.columns]]

    reg_pipeline = bundle["regressor"]
    clf_pipeline = bundle["classifier"]

    # Predict continuous attention score
    score = float(reg_pipeline.predict(df)[0])
    score = max(10.0, min(100.0, round(score, 1)))

    # Predict binary distraction & probability
    is_distracted = int(clf_pipeline.predict(df)[0])
    probabilities = clf_pipeline.predict_proba(df)[0]
    distraction_prob = float(probabilities[1]) if len(probabilities) > 1 else (1.0 if is_distracted else 0.0)

    return {
        "attention_score": score,
        "is_distracted": is_distracted,
        "distraction_probability": round(distraction_prob, 4),
        "status": "Distracted" if is_distracted == 1 else "Focused",
    }


def predict_batch(records: List[Dict[str, Any]], model_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Predicts for a batch of feature dictionaries.
    """
    bundle = load_model_bundle(model_path)
    features_order = bundle.get("features", [
        "app_name", "category", "day_used", "hours_used",
        "number_events", "number_interactions", "switches", "event_span"
    ])

    df = pd.DataFrame(records)
    df = df[[f for f in features_order if f in df.columns]]

    reg_pipeline = bundle["regressor"]
    clf_pipeline = bundle["classifier"]

    scores = reg_pipeline.predict(df)
    distractions = clf_pipeline.predict(df)
    probabilities = clf_pipeline.predict_proba(df)

    results = []
    for i in range(len(records)):
        score = max(10.0, min(100.0, round(float(scores[i]), 1)))
        is_dist = int(distractions[i])
        prob = float(probabilities[i][1]) if probabilities.shape[1] > 1 else (1.0 if is_dist else 0.0)
        results.append({
            "attention_score": score,
            "is_distracted": is_dist,
            "distraction_probability": round(prob, 4),
            "status": "Distracted" if is_dist == 1 else "Focused",
        })
    return results


# --- FastAPI REST Application ---
try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware

    class PredictionInput(BaseModel):
        app_name: str = Field(..., example="Visual Studio Code")
        category: str = Field(..., example="productive")
        hours_used: float = Field(..., ge=0, example=2.5)
        day_used: str = Field(..., example="Wednesday")
        number_events: int = Field(..., ge=0, example=150)
        number_interactions: int = Field(..., ge=0, example=2500)
        switches: int = Field(..., ge=0, example=8)
        event_span: float = Field(..., ge=0, example=150.0)

    class PredictionResponse(BaseModel):
        attention_score: float
        is_distracted: int
        distraction_probability: float
        status: str

    app = FastAPI(
        title="Attention Management ML Inference API",
        description="Internal real-time attention scoring and distraction classification microservice.",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/healthz")
    def health():
        try:
            load_model_bundle()
            return {"status": "ok", "service": "ml-service", "models_loaded": True}
        except Exception as e:
            return {"status": "ok", "service": "ml-service", "models_loaded": False, "note": str(e)}

    @app.post("/predict", response_model=PredictionResponse)
    def predict_endpoint(payload: PredictionInput):
        try:
            result = predict_single(payload.model_dump())
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/predict/batch", response_model=List[PredictionResponse])
    def predict_batch_endpoint(payload: List[PredictionInput]):
        try:
            records = [item.model_dump() for item in payload]
            return predict_batch(records)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

except ImportError:
    app = None


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.predict:app", host="127.0.0.1", port=8001, reload=False)
