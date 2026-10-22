import os
import sys
import psycopg2
import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
import xgboost as xgb

DATABASE_URL = os.environ.get("DATABASE_URL", "")
MODEL_PATH = os.environ.get("MODEL_PATH", "./models/traffic_speed_xgb.json")
MIN_TRAINING_SAMPLES = int(os.environ.get("MIN_TRAINING_SAMPLES", "500"))

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute(
        "SELECT segment_id, day_of_week, hour_of_day, observed_speed_kmh "
        "FROM segment_speed_observations"
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    if len(rows) < MIN_TRAINING_SAMPLES:
        print(f"Only {len(rows)} samples; need {MIN_TRAINING_SAMPLES}. Skipping training.")
        sys.exit(0)

    df = pd.DataFrame(rows, columns=["segment_id", "day_of_week", "hour_of_day", "observed_speed_kmh"])
    # Use hash-based encoding to match predictor.py (stateless, no pickle needed)
    df["segment_encoded"] = df["segment_id"].apply(lambda sid: abs(hash(sid)) % 1000)

    X = df[["segment_encoded", "day_of_week", "hour_of_day"]].values
    y = df["observed_speed_kmh"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = xgb.XGBRegressor(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, y_pred))
    print(f"Training complete. MAE: {mae:.2f} km/h. Samples: {len(rows)}")

    os.makedirs(os.path.dirname(MODEL_PATH) if os.path.dirname(MODEL_PATH) else ".", exist_ok=True)
    model.save_model(MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

    try:
        conn2 = psycopg2.connect(DATABASE_URL)
        cur2 = conn2.cursor()
        cur2.execute(
            "INSERT INTO ml_model_versions (model_type, version, training_samples, accuracy_mae, trained_at, is_active, notes) "
            "VALUES ('traffic_speed', '1.0', %s, %s, NOW(), true, 'XGBoost regressor') "
            "ON CONFLICT DO NOTHING",
            (len(rows), mae)
        )
        conn2.commit()
        cur2.close()
        conn2.close()
    except Exception as e:
        print(f"Warning: could not record model version: {e}")

if __name__ == "__main__":
    main()
