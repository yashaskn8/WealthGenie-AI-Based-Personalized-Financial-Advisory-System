import numpy as np
import pytest
from pydantic import ValidationError

from feature_engineering import engineer_features, to_model_array
from schemas import PredictRequest


def test_predict_request_rejects_monthly_savings_above_income():
    with pytest.raises(ValidationError):
        PredictRequest(
            age=30,
            annual_income=120000,
            monthly_savings=20000,
            risk_category='Moderate',
        )


def test_feature_order_matches_training_pipeline():
    features = engineer_features(
        age=34,
        annual_income=1500000,
        monthly_savings=35000,
        risk_score=3,
    )
    model_input = to_model_array(features)

    assert model_input.shape == (1, 4)
    np.testing.assert_array_equal(model_input[0], np.array([34, 1500000, 35000, 3]))
