import pandas as pd
from ml_service.temporal_forecasting import TemporalForecasting
import traceback

forecasting_service = TemporalForecasting()

# Create mock history
history = pd.DataFrame([
    {"timestamp": "2026-06-11 00:00:00", "incident_count": 2},
    {"timestamp": "2026-06-11 01:00:00", "incident_count": 3},
    {"timestamp": "2026-06-11 02:00:00", "incident_count": 1},
    {"timestamp": "2026-06-11 03:00:00", "incident_count": 5},
    {"timestamp": "2026-06-11 04:00:00", "incident_count": 4},
])

try:
    print("Testing forecast_advanced...")
    res = forecasting_service.forecast_advanced(history, window="hourly")
    print("Result version:", res["model_version"])
    print("Forecast length:", len(res["forecast"]))
except Exception as e:
    print("Error during forecast_advanced:")
    traceback.print_exc()

try:
    print("\nTesting retrain_and_evaluate...")
    res = forecasting_service.retrain_and_evaluate(history)
    print("Retrain status:", res.get("status"))
except Exception as e:
    print("Error during retrain_and_evaluate:")
    traceback.print_exc()
