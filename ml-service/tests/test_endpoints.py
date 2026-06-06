import pytest
import numpy as np
import sys
import os
import joblib
from fastapi import HTTPException

# Add parent directory to path to import ml-service modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import main
from schemas import PredictRequest

@pytest.fixture(scope='module', autouse=True)
def load_app_models():
    """Load models into main module globals for direct endpoint function testing."""
    try:
        main.model = joblib.load(main.MODEL_PATH)
        main.label_encoder = joblib.load(main.LE_PATH)
    except FileNotFoundError:
        pytest.skip("Model files not found — run train.py first")
    
    # Load explainer if available
    try:
        from explainer import ModelExplainer
        main.explainer_instance = ModelExplainer(main.model, main.label_encoder)
    except Exception:
        main.explainer_instance = None

def test_predict_endpoint_success():
    req = PredictRequest(
        age=32,
        annual_income=800000.0,
        monthly_savings=12000.0,
        risk_category='Moderate'
    )
    res = main.predict(req)
    assert res is not None
    assert res.primary in main.label_encoder.classes_
    assert res.secondary in main.label_encoder.classes_
    assert res.tertiary in main.label_encoder.classes_
    assert len(res.confidence_scores) > 0
    assert 0.0 <= res.confidence_scores[res.primary] <= 1.0

@pytest.mark.anyio
async def test_predict_enriched_endpoint_success():
    req = PredictRequest(
        age=28,
        annual_income=1200000.0,
        monthly_savings=30000.0,
        risk_category='Aggressive'
    )
    res = await main.predict_enriched(req)
    assert res is not None
    assert "primary" in res
    assert "enriched_features" in res
    assert res["enriched_features"]["savings_rate"] == 0.3  # 30K / 100K = 0.3

@pytest.mark.anyio
async def test_backtest_endpoint_success():
    # Test valid instrument backtest
    res = await main.backtest_instrument(
        instrument_type="Equity_MF",
        monthly_sip=10000.0,
        years=5
    )
    assert res is not None
    assert res["instrument"] == "Equity_MF"
    assert res["periods_analysed"] > 0
    assert len(res["scenarios"]) > 0
    
    # Verify scenarios have required fields
    scenario = res["scenarios"][0]
    assert "period" in scenario
    assert "return" in scenario
    assert "sharpe" in scenario
    assert "max_drawdown" in scenario

@pytest.mark.anyio
async def test_backtest_endpoint_unknown_instrument():
    # Test invalid instrument backtest (should raise 400 HTTPException)
    with pytest.raises(HTTPException) as exc_info:
        await main.backtest_instrument(
            instrument_type="Crypto_Coin",
            monthly_sip=10000.0,
            years=5
        )
    assert exc_info.value.status_code == 400
    assert "Unknown instrument type" in exc_info.value.detail
