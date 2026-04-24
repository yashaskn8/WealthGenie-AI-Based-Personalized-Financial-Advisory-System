"""
WealthGenie ML Microservice — FastAPI
Serves RandomForest predictions with SHAP explainability on port 8000.
"""

import os
import numpy as np
import joblib
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import PredictRequest, PredictResponse, HealthResponse
from explainer import load_explainer

# ── Application State ─────────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'model')
MODEL_PATH = os.environ.get('MODEL_PATH', os.path.join(MODEL_DIR, 'model.pkl'))
LE_PATH = os.path.join(MODEL_DIR, 'label_encoder.pkl')
DT_PATH = os.path.join(MODEL_DIR, 'decision_tree.pkl')

model = None
label_encoder = None
dt_model = None
model_accuracy = None
explainer_instance = None


# ── Lifespan (replaces deprecated @app.on_event) ─────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, label_encoder, dt_model, explainer_instance
    try:
        model = joblib.load(MODEL_PATH)
        label_encoder = joblib.load(LE_PATH)
        print(f"[OK] RandomForest model loaded from {MODEL_PATH}")
    except FileNotFoundError:
        print("[WARN] Model not found. Run: python model/train.py first")

    try:
        dt_model = joblib.load(DT_PATH)
        print(f"[OK] DecisionTree model loaded from {DT_PATH}")
    except FileNotFoundError:
        pass
    except Exception as e:
        print(f"[WARN] DecisionTree load failed: {e}")

    # Initialize SHAP explainer
    explainer_instance = load_explainer()
    if explainer_instance:
        print("[OK] SHAP Explainer initialized")
    else:
        print("[WARN] SHAP Explainer not available, predictions will work without explanations")

    yield
    # Cleanup on shutdown (if needed)


app = FastAPI(title="WealthGenie ML Service", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)



RISK_ENCODING = {
    'Conservative': 0,
    'Conservative-Moderate': 1,
    'Moderate': 2,
    'Moderate-Aggressive': 3,
    'Aggressive': 4,
}


def get_decision_path_description(age, income, risk_category):
    """Generate human-readable decision path."""
    path = []
    if age < 30:
        path.append("age < 30")
    elif age <= 45:
        path.append("30 <= age <= 45")
    else:
        path.append("age > 45")

    if income > 1500000:
        path.append("income > 15L")
    elif income > 1000000:
        path.append("income > 10L")
    elif income > 600000:
        path.append("income > 6L")
    else:
        path.append("income <= 6L")

    path.append(f"risk = {risk_category}")
    return path


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None or label_encoder is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Run train.py first.")

    risk_score = RISK_ENCODING.get(req.risk_category, 2)
    features = np.array([[req.age, req.annual_income, req.monthly_savings, risk_score]])

    # Get probability scores from RandomForest
    probabilities = model.predict_proba(features)[0]
    classes = label_encoder.classes_

    # Sort by probability descending
    sorted_indices = np.argsort(probabilities)[::-1]
    primary = classes[sorted_indices[0]]
    secondary = classes[sorted_indices[1]]
    tertiary = classes[sorted_indices[2]]

    confidence_scores = {
        classes[i]: round(float(probabilities[i]), 4)
        for i in range(len(classes))
    }

    decision_path = get_decision_path_description(
        req.age, req.annual_income, req.risk_category
    )

    # Generate SHAP explanation
    explanation = None
    if explainer_instance:
        try:
            explanation_raw = explainer_instance.explain(features)
            explanation = explanation_raw
        except Exception as e:
            print(f"[WARN] SHAP explanation failed: {e}")

    return PredictResponse(
        primary=primary,
        secondary=secondary,
        tertiary=tertiary,
        confidence_scores=confidence_scores,
        decision_path=decision_path,
        model_used="RandomForest",
        explanation=explanation,
    )


@app.get("/health", response_model=HealthResponse)
def health():
    status = "ok" if model is not None else "model_not_loaded"
    return HealthResponse(
        status=status,
        model_version="2.0",
        model_accuracy=model_accuracy,
        explainer_loaded=explainer_instance is not None,
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
