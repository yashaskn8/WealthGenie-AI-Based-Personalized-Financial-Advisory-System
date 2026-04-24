"""
WealthGenie SHAP Explainability Layer
Uses TreeExplainer for fast, exact SHAP values on RandomForest.
"""

import numpy as np
import joblib
import os

# Feature names matching the training pipeline
FEATURE_NAMES = ['age', 'annual_income', 'monthly_savings', 'risk_score']
FEATURE_DISPLAY = {
    'age': 'Your Age',
    'annual_income': 'Annual Income',
    'monthly_savings': 'Monthly Savings',
    'risk_score': 'Risk Appetite',
}


class ModelExplainer:
    """Wraps the trained pipeline with SHAP TreeExplainer."""

    def __init__(self, pipeline, label_encoder):
        self.pipeline = pipeline
        self.label_encoder = label_encoder

        # Extract the RandomForest step from the sklearn Pipeline
        self.rf_model = pipeline.named_steps['clf']
        self.scaler = pipeline.named_steps['scaler']
        self.class_names = label_encoder.classes_

        # TreeExplainer is the most efficient for tree-based models
        try:
            import shap
            self.explainer = shap.TreeExplainer(self.rf_model)
            self._shap_available = True
            print("[OK] SHAP TreeExplainer initialized")
        except ImportError:
            print("[WARN] shap not installed, using feature_importances_ fallback")
            self._shap_available = False
        except Exception as e:
            print(f"[WARN] SHAP init failed ({e}), using fallback")
            self._shap_available = False

    def explain(self, raw_features):
        """
        Generate human-readable explanation for a prediction.

        Args:
            raw_features: numpy array shape (1, 4) — [age, income, savings, risk_score]

        Returns:
            dict with predicted_class, confidence, feature_contributions, top_reason
        """
        # Scale features using the pipeline's scaler
        scaled = self.scaler.transform(raw_features)

        # Get prediction probabilities
        proba = self.rf_model.predict_proba(scaled)[0]
        pred_class_idx = int(np.argmax(proba))
        predicted_class = self.class_names[pred_class_idx]
        confidence = round(float(proba[pred_class_idx]), 4)

        if self._shap_available:
            contributions = self._shap_explain(scaled, pred_class_idx, raw_features)
        else:
            contributions = self._fallback_explain(raw_features)

        # Sort by magnitude descending
        contributions.sort(key=lambda x: x['magnitude'], reverse=True)

        # Build human-readable top reason
        top = contributions[0]
        top_reason = (
            f"Your {FEATURE_DISPLAY.get(top['feature'], top['feature'])} "
            f"{top['direction']} the likelihood of "
            f"{predicted_class.replace('_', ' ')} being recommended."
        )

        return {
            'predicted_class': predicted_class,
            'confidence': confidence,
            'feature_contributions': contributions,
            'top_reason': top_reason,
        }

    def _shap_explain(self, scaled_features, pred_class_idx, raw_features):
        """Use SHAP TreeExplainer for exact feature contributions.

        Version-safe: handles both legacy list format and new 3D array format.
        - Legacy (SHAP <0.40): shap_values is a list of length n_classes,
          each element shape (n_samples, n_features).
        - New (SHAP >=0.40): shap_values is a single ndarray of shape
          (n_samples, n_features, n_classes).
        """
        raw = self.explainer.shap_values(scaled_features)

        if isinstance(raw, list):
            # Legacy format: list of (n_samples, n_features) arrays
            class_shap = raw[pred_class_idx][0]   # shape: (n_features,)
        else:
            # New format: single (n_samples, n_features, n_classes) array
            class_shap = raw[0, :, pred_class_idx]  # shape: (n_features,)

        contributions = []
        for i, feat_name in enumerate(FEATURE_NAMES):
            val = float(class_shap[i])
            contributions.append({
                'feature': feat_name,
                'display_name': FEATURE_DISPLAY.get(feat_name, feat_name),
                'shap_value': round(val, 4),
                'direction': 'increased' if val > 0 else 'decreased',
                'magnitude': abs(round(val, 4)),
                'raw_value': float(raw_features[0][i]),
            })

        return contributions

    def _fallback_explain(self, raw_features):
        """Fallback using feature_importances_ when SHAP is unavailable.
        Uses population mean comparison to determine direction."""
        importances = self.rf_model.feature_importances_

        # Reasonable population means for Indian salaried investors
        FEATURE_MEANS = {
            'age': 35,
            'annual_income': 800000,
            'monthly_savings': 15000,
            'risk_score': 2,
        }

        contributions = []
        for i, feat_name in enumerate(FEATURE_NAMES):
            imp = float(importances[i])
            raw_val = float(raw_features[0][i])
            mean_val = FEATURE_MEANS.get(feat_name, 0)
            direction = 'increased' if raw_val > mean_val else 'decreased'
            contributions.append({
                'feature': feat_name,
                'display_name': FEATURE_DISPLAY.get(feat_name, feat_name),
                'shap_value': round(imp, 4),
                'direction': direction,
                'magnitude': abs(round(imp, 4)),
                'raw_value': raw_val,
            })

        return contributions



def load_explainer():
    """Load the pipeline and create a ModelExplainer instance."""
    model_dir = os.path.join(os.path.dirname(__file__), 'model')
    pipeline_path = os.path.join(model_dir, 'model.pkl')
    le_path = os.path.join(model_dir, 'label_encoder.pkl')

    try:
        pipeline = joblib.load(pipeline_path)
        label_encoder = joblib.load(le_path)
        return ModelExplainer(pipeline, label_encoder)
    except FileNotFoundError:
        print("[WARN] Model files not found. Run ml-service/model/train.py first.")
        return None
    except Exception as e:
        print(f"[ERROR] Failed to initialise explainer: {e}")
        return None
