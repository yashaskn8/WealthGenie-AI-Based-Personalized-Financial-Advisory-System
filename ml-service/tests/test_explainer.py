import numpy as np
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from explainer import load_explainer, FEATURE_NAMES


@pytest.fixture(scope='module')
def explainer():
    e = load_explainer()
    if e is None:
        pytest.skip("Model not found — run train.py first")
    return e


def test_no_attribute_error(explainer):
    """Fix 1 regression test: _shap_explain must not crash."""
    try:
        result = explainer.explain(np.array([[28, 780000, 15000, 3]]))
        assert result is not None
    except AttributeError as e:
        pytest.fail(f"AttributeError: {e}")
    except TypeError as e:
        pytest.fail(f"TypeError (likely SHAP indexing bug): {e}")
    except KeyError as e:
        pytest.fail(f"KeyError (likely pipeline step name bug): {e}")


def test_four_contributions_returned(explainer):
    result = explainer.explain(np.array([[35, 1200000, 25000, 2]]))
    assert len(result['feature_contributions']) == len(FEATURE_NAMES)


def test_confidence_is_probability(explainer):
    result = explainer.explain(np.array([[45, 600000, 8000, 1]]))
    assert 0 < result['confidence'] <= 1.0


def test_contributions_sorted_descending(explainer):
    result = explainer.explain(np.array([[28, 780000, 15000, 3]]))
    mags = [c['magnitude'] for c in result['feature_contributions']]
    assert mags == sorted(mags, reverse=True)


def test_direction_field_valid(explainer):
    result = explainer.explain(np.array([[28, 780000, 15000, 3]]))
    for c in result['feature_contributions']:
        assert c['direction'] in ('increased', 'decreased'), \
            f"Invalid direction: {c['direction']}"


def test_shap_values_are_floats(explainer):
    result = explainer.explain(np.array([[50, 500000, 5000, 0]]))
    for c in result['feature_contributions']:
        assert isinstance(c['shap_value'], float)
