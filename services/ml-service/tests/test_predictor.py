import importlib.util
from pathlib import Path
import tempfile
import unittest


MODULE_PATH = Path(__file__).resolve().parents[1] / "predictor.py"
SPEC = importlib.util.spec_from_file_location("traffic_predictor", MODULE_PATH)
predictor_module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(predictor_module)
TrafficPredictor = predictor_module.TrafficPredictor


class FakeEncoder:
    classes_ = ["nyerere-n-001"]

    def transform(self, values):
        return [0]


class FakeModel:
    def __init__(self, speed):
        self.speed = speed
        self.features = None

    def predict(self, features):
        self.features = features
        return [self.speed]


class TrafficPredictorTests(unittest.TestCase):
    def test_returns_fallback_when_model_file_is_missing(self):
        with tempfile.TemporaryDirectory() as directory:
            predictor = TrafficPredictor(str(Path(directory) / "missing.pkl"))

        result = predictor.predict("nyerere-n-001", "2025-01-06T06:00:00Z")
        self.assertEqual(result["predicted_speed_kmh"], 35.0)
        self.assertEqual(result["confidence"], 0.2)
        self.assertEqual(result["model_type"], "fallback")

    def test_returns_unknown_segment_fallback_when_segment_is_not_encoded(self):
        predictor = TrafficPredictor("unused")
        predictor.model_loaded = True
        predictor.label_encoder = FakeEncoder()
        predictor.model = FakeModel(32)

        result = predictor.predict("unknown-road", "2025-01-06T06:00:00Z")
        self.assertEqual(result["predicted_speed_kmh"], 40.0)
        self.assertEqual(result["confidence"], 0.1)
        self.assertEqual(result["model_type"], "unknown_segment")

    def test_encodes_eat_time_and_clamps_model_speed(self):
        predictor = TrafficPredictor("unused")
        model = FakeModel(120)
        predictor.model_loaded = True
        predictor.label_encoder = FakeEncoder()
        predictor.model = model

        result = predictor.predict("nyerere-n-001", "2025-01-06T22:30:00Z")
        self.assertEqual(model.features, [[1, 1, 0]])  # Tuesday, 01:00 EAT
        self.assertEqual(result["predicted_speed_kmh"], 80.0)
        self.assertEqual(result["confidence"], 0.75)
        self.assertEqual(result["model_type"], "ml")

    def test_clamps_low_predictions_and_rounds_speed(self):
        predictor = TrafficPredictor("unused")
        predictor.model_loaded = True
        predictor.label_encoder = FakeEncoder()
        predictor.model = FakeModel(2.24)

        result = predictor.predict("nyerere-n-001", "2025-01-06T06:00:00Z")
        self.assertEqual(result["predicted_speed_kmh"], 5.0)


if __name__ == "__main__":
    unittest.main()
