"""
WealthGenie ML Microservice � FastAPI
Serves RandomForest predictions with SHAP explainability on port 8000.

=========================================================================
📘 BEGINNER NOTE: RANDOM FOREST & SHAP VALUES
=========================================================================
1. Random Forest Classifier:
   Imagine asking a single person for financial advice. They might have biases.
   Now imagine asking 100 diverse financial advisors and letting them vote on
   the best advice. This is a Random Forest!
   It trains 100 individual "Decision Trees" on different subsets of data.
   When a new prediction comes in, all 100 trees vote on which portfolio category
   (e.g., Aggressive or Moderate) fits the user best. The category with the 
   most votes is returned as the primary recommendation.

2. SHAP (Shapley Additive exPlanations):
   Machine learning models are often "black boxes" � we get an answer, but we
   don't know *why*. SHAP uses game theory (Shapley values) to break down the
   contribution of each feature.
   It calculates: "By how much did your Age push the recommendation towards
   Conservative?" or "How much did your high Income pull it towards Aggressive?"
   This lets us explain the model's recommendation to the user in plain English.
"""

import os
import numpy as np
import joblib
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import PredictRequest, HealthResponse
from explainer import ModelExplainer
from feature_engineering import engineer_features, to_model_array

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

    # Initialize SHAP explainer from preloaded model and label encoder to avoid double-loading
    if model is not None and label_encoder is not None:
        try:
            explainer_instance = ModelExplainer(model, label_encoder)
            print("[OK] SHAP Explainer initialized from preloaded model")
        except Exception as e:
            print(f"[WARN] SHAP Explainer initialization failed: {e}")
            explainer_instance = None
    else:
        explainer_instance = None
        print("[WARN] Model files not loaded, SHAP Explainer not available")

    yield
    # Cleanup on shutdown (if needed)


app = FastAPI(title="WealthGenie ML Service", version="2.0.0", lifespan=lifespan)

cors_origins_env = os.environ.get("CORS_ORIGINS")
origins = cors_origins_env.split(",") if cors_origins_env else ["http://localhost:5000", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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


@app.get("/health", response_model=HealthResponse)
def health():
    status = "ok" if model is not None else "model_not_loaded"
    return HealthResponse(
        status=status,
        model_version="2.0",
        model_accuracy=model_accuracy,
        explainer_loaded=explainer_instance is not None,
    )

@app.post("/predict/enriched")
async def predict_enriched(data: PredictRequest):
    """
    Extended prediction endpoint.
    
    BEGINNER NOTE: FEATURE ENGINEERING ENRICHMENT
    This endpoint derives advanced metrics like:
    - Savings Rate (savings divided by monthly income)
    - Retirement Horizon (years remaining until age 60)
    - Risk Age Score (compounding risk score relative to age)
    
    The current Random Forest was trained on the original four features, so the
    derived variables are returned as context while to_model_array preserves the
    exact training feature order for inference.
    """
    risk_score = RISK_ENCODING.get(data.risk_category, 2)
    features = engineer_features(
        age=data.age,
        annual_income=data.annual_income,
        monthly_savings=data.monthly_savings,
        risk_score=risk_score
    )
    model_input = to_model_array(features)
    
    if model is None or label_encoder is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Run train.py first.")

    proba = model.predict_proba(model_input)[0]
    ranked = np.argsort(proba)[::-1]

    explanation = None
    if explainer_instance is not None:
        try:
            explanation = explainer_instance.explain(model_input)
        except Exception as e:
            print(f"[WARN] Explainer failed: {e}")

    return {
        "primary": label_encoder.classes_[ranked[0]],
        "secondary": label_encoder.classes_[ranked[1]],
        "tertiary": label_encoder.classes_[ranked[2]],
        "confidence_scores": {
            cls: round(float(p), 4)
            for cls, p in zip(label_encoder.classes_, proba)
        },
        "explanation": explanation,
        "decision_path": get_decision_path_description(data.age, data.annual_income, data.risk_category),
        "enriched_features": {
            "savings_rate": features.savings_rate,
            "income_bracket": features.income_bracket,
            "retirement_years": features.retirement_years,
            "risk_age_score": features.risk_age_score,
        },
        "model_version": "1.0",
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

