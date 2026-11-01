# AI-Powered Digital Attention Management System — ML Service

This service provides end-to-end Machine Learning capabilities for attention monitoring and distraction detection based on desktop and browser telemetry features.

---

## 1. Directory Structure

```text
ml-service/
├── README.md                          # Documentation and quickstart guide
├── requirements.txt                   # Production & training dependencies
├── .gitignore                         # Python, environment & cache ignore rules
│
├── data/
│   └── attention_training_dataset.csv # 5,000-sample training dataset
│
├── notebooks/
│   └── attention_model_training.ipynb # Beginner-friendly step-by-step training notebook
│
├── src/
│   ├── __init__.py                    # Package initializer
│   ├── preprocessing.py               # ColumnTransformer pipeline and dataset loaders
│   ├── train.py                       # Fits RandomForest pipelines and saves joblib bundle
│   ├── evaluate.py                    # Computes regression & classification metrics
│   ├── predict.py                     # Inference engine & FastAPI REST prediction server
│   └── generator.py                   # Synthetic telemetry generator matching Prisma schema
│
├── models/
│   ├── .gitkeep
│   └── attention_model.joblib         # Fitted pipelines bundle (Regressor + Classifier)
│
├── artifacts/
│   ├── .gitkeep
│   ├── evaluation_metrics.json        # Saved performance metrics (MAE, R2, F1, etc.)
│   ├── confusion_matrix.png           # Confusion matrix visualization
│   └── regression_residuals.png       # Residual distribution plot
│
└── tests/
    └── test_preprocessing.py          # Pytest unit tests for preprocessing & inference
```

---

## 2. Dataset & Features

The models train on 8 behavioral telemetry features extracted from user interactions:

### Input Features:
| Feature | Type | Description |
| :--- | :--- | :--- |
| `app_name` | Categorical | Active application or web domain (e.g. `VS Code`, `GitHub`, `YouTube`) |
| `category` | Categorical | Category: `productive`, `communication`, `social`, `entertainment`, `other` |
| `day_used` | Categorical | Day of the week (e.g. `Monday`, `Wednesday`) |
| `hours_used` | Numerical | Active duration in hours (e.g. `2.5`) |
| `number_events` | Numerical | Count of recorded telemetry events in the session |
| `number_interactions`| Numerical | Active keystrokes, clicks, and interaction ticks |
| `switches` | Numerical | Count of window/tab context switches |
| `event_span` | Numerical | Span between initial and final event in minutes |

### Target Columns:
- `attention_score` *(Continuous Regression target, 10–100)*: Overall cognitive focus score.
- `is_distracted` *(Binary Classification target, 0 or 1)*: 0 = Focused, 1 = Distracted.

---

## 3. Installation & Setup

1. **Navigate to the ML service directory:**
   ```powershell
   cd ml-service
   ```

2. **Activate the virtual environment:**
   ```powershell
   .\.venv\Scripts\activate
   ```

3. **Install dependencies (if not already installed):**
   ```powershell
   pip install -r requirements.txt
   ```

---

## 4. Model Training & Evaluation

To train both the Attention Score Regressor and Distraction Classifier:

```powershell
python -m src.train
```

### Typical Output:
- **Model 1: Attention Score Regressor (RandomForestRegressor)**
  - MAE: ~11.66
  - RMSE: ~15.68
  - R² Score: ~0.6136
- **Model 2: Distraction Classifier (RandomForestClassifier)**
  - Accuracy: ~92.50%
  - Precision: ~98.58%
  - Recall: ~83.25%
  - F1-Score: ~90.27%
- **Artifacts Saved:**
  - `models/attention_model.joblib`
  - `artifacts/evaluation_metrics.json`
  - `artifacts/confusion_matrix.png`
  - `artifacts/regression_residuals.png`

---

## 5. Running the Unit Tests

Execute the unit tests to verify data preprocessing, unknown category handling, and pipeline transformations:

```powershell
pytest tests/
```

---

## 6. Running Inference & Prediction Server

### Option A: Using the Python API
```python
from src.predict import predict_single

result = predict_single({
    "app_name": "Visual Studio Code",
    "category": "productive",
    "hours_used": 2.5,
    "day_used": "Wednesday",
    "number_events": 150,
    "number_interactions": 2500,
    "switches": 5,
    "event_span": 150.0,
})

print(result)
# {'attention_score': 78.6, 'is_distracted': 0, 'distraction_probability': 0.0879, 'status': 'Focused'}
```

### Option B: Starting the FastAPI REST Microservice
```powershell
python -m src.predict
# or
uvicorn src.predict:app --host 127.0.0.1 --port 8001
```
- Interactive Docs: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)
- Health Check: `GET http://127.0.0.1:8001/healthz`
- Prediction Endpoint: `POST http://127.0.0.1:8001/predict`

---

## 7. Interactive Jupyter Notebook

For an exploratory walkthrough with beginner-friendly explanations and interactive visualizations:

```powershell
jupyter notebook notebooks/attention_model_training.ipynb
```
The notebook covers 13 structured sections:
1. Library imports
2. Loading dataset
3. Schema and missing value inspection
4. Exploratory Data Analysis (EDA)
5. Target validation and leakage audit
6. Preprocessing design (OneHotEncoder + StandardScaler)
7. Train / Test splitting
8. Regression model fitting
9. Regression model evaluation
10. Classification model fitting
11. Classification model evaluation
12. Saving model bundle
13. Sample test predictions
