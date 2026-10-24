"""
XGBoost model trainer for traffic speed prediction.

Reads segment_speed_observations from PostgreSQL, trains an XGBoost regressor,
and saves the model to MODEL_PATH.
"""
import os
import sys
import pickle
import psycopg2
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBRegressor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
MODEL_PATH = os.getenv("MODEL_PATH", "model.pkl")
MIN_TRAINING_SAMPLES = int(os.getenv("MIN_TRAINING_SAMPLES", "500"))

# Known segment IDs from migration 016 seed data
KNOWN_SEGMENTS = [
    'nyerere-n-001', 'nyerere-s-001', 'morogoro-001', 'morogoro-002',
    'sam-nujoma-001', 'bagamoyo-001', 'ali-mwinyi-001', 'mandela-001',
    'kilwa-001', 'pugu-001', 'bibi-titi-001', 'kivukoni-001'
]


def fetch_training_data():
    """Fetch all segment_speed_observations from the database."""
    conn = psycopg2.connect(DATABASE_URL)
    query = """
        SELECT segment_id, day_of_week, hour_of_day, observed_speed_kmh
        FROM segment_speed_observations
        WHERE observed_speed_kmh IS NOT NULL
        ORDER BY observed_at DESC
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df


def train_model(df):
    """
    Train XGBoost regressor on the observations.
    
    Features: day_of_week (0-6), hour_of_day (0-23), segment_id (label-encoded)
    Target: observed_speed_kmh
    """
    # Encode segment_id
    label_encoder = LabelEncoder()
    # Fit on known segments + any additional segments in the data
    all_segments = list(set(KNOWN_SEGMENTS) | set(df['segment_id'].unique()))
    label_encoder.fit(all_segments)
    df['segment_encoded'] = label_encoder.transform(df['segment_id'])
    
    # Features and target
    X = df[['day_of_week', 'hour_of_day', 'segment_encoded']]
    y = df['observed_speed_kmh']
    
    # Train XGBoost
    model = XGBRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X, y)
    
    return model, label_encoder


def save_model(model, label_encoder, path):
    """Save trained model and label encoder to disk."""
    with open(path, 'wb') as f:
        pickle.dump({'model': model, 'label_encoder': label_encoder}, f)
    print(f"Model saved to {path}")


def main():
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not set in environment.")
        sys.exit(1)
    
    print("Fetching training data from database...")
    df = fetch_training_data()
    
    if len(df) < MIN_TRAINING_SAMPLES:
        print(f"Training data insufficient: {len(df)} < {MIN_TRAINING_SAMPLES}")
        print("Baseline rules in api-gateway will be used until more data is collected.")
        sys.exit(0)
    
    print(f"Training on {len(df)} observations...")
    model, label_encoder = train_model(df)
    
    save_model(model, label_encoder, MODEL_PATH)
    
    # Print basic stats
    print(f"\nTraining complete:")
    print(f"  Samples: {len(df)}")
    print(f"  Unique segments: {df['segment_id'].nunique()}")
    print(f"  Mean speed: {df['observed_speed_kmh'].mean():.1f} km/h")
    print(f"  Std dev: {df['observed_speed_kmh'].std():.1f} km/h")


if __name__ == "__main__":
    main()
