import numpy as np
import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from explainer import load_explainer, FEATURE_NAMES


@pytest.fixture(scope='module')
def explainer():
    e = load_explainer()
    if e is None:
        pytest.skip("Model files not found — run train.py first")
    return e


def test_explain_returns_required_keys(explainer):
    result = explainer.explain(np.array([[28, 780000, 15000, 3]]))
    assert 'predicted_class' in result
    assert 'confidence' in result
    assert 'feature_contributions' in result
    assert 'top_reason' in result


def test_explain_returns_four_contributions(explainer):
    result = explainer.explain(np.array([[35, 1200000, 25000, 2]]))
    assert len(result['feature_contributions']) == len(FEATURE_NAMES)


def test_confidence_is_valid_probability(explainer):
    result = explainer.explain(np.array([[45, 600000, 8000, 1]]))
    assert 0 < result['confidence'] <= 1.0


def test_contributions_sorted_by_magnitude(explainer):
    result = explainer.explain(np.array([[55, 400000, 5000, 0]]))
    magnitudes = [c['magnitude'] for c in result['feature_contributions']]
    assert magnitudes == sorted(magnitudes, reverse=True)


def test_direction_field_is_valid(explainer):
    result = explainer.explain(np.array([[28, 780000, 15000, 3]]))
    for c in result['feature_contributions']:
        assert c['direction'] in ('increased', 'decreased')


def test_no_attribute_error_with_shap(explainer):
    """Ensures _shap_explain does not raise AttributeError."""
    features = np.array([[30, 900000, 20000, 3]])
    try:
        result = explainer.explain(features)
        assert result is not None
    except AttributeError as e:
        pytest.fail(f"AttributeError raised: {e}")


def test_each_contribution_has_required_fields(explainer):
    result = explainer.explain(np.array([[32, 1000000, 18000, 2]]))
    required_fields = {'feature', 'display_name', 'shap_value', 'direction', 'magnitude', 'raw_value'}
    for c in result['feature_contributions']:
        assert required_fields.issubset(c.keys()), f"Missing fields in contribution: {c}"


def test_predicted_class_is_string(explainer):
    result = explainer.explain(np.array([[40, 500000, 10000, 1]]))
    assert isinstance(result['predicted_class'], str)
    assert len(result['predicted_class']) > 0
