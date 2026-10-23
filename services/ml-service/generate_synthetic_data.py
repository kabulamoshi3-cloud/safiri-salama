"""
Generate synthetic GPS observations for model training before the app goes live.
Creates realistic traffic patterns for Dar es Salaam roads.
"""
import os
import psycopg2
import random
from datetime import datetime, timedelta

DATABASE_URL = os.environ.get("DATABASE_URL", "")

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Get all road segments
    cur.execute("SELECT id FROM road_segments")
    segments = [row[0] for row in cur.fetchall()]
    print(f"Found {len(segments)} road segments")
    
    if len(segments) == 0:
        print("No road segments found. Migrations not complete.")
        return
    
    # Generate observations for the past 30 days
    observations = []
    base_date = datetime.now() - timedelta(days=30)
    
    for day_offset in range(30):
        current_date = base_date + timedelta(days=day_offset)
        day_of_week = current_date.weekday()  # Python: Mon=0, Sun=6
        day_of_week_pg = (day_of_week + 1) % 7  # Convert to Postgres: Sun=0, Sat=6
        is_weekday = day_of_week < 5  # Mon-Fri
        
        # Generate observations throughout the day
        for hour in range(24):
            # More observations during peak hours
            is_morning_peak = hour >= 6 and hour <= 8
            is_evening_peak = hour >= 16 and hour <= 18
            
            # Number of observations per hour
            if is_weekday and (is_morning_peak or is_evening_peak):
                num_obs = random.randint(15, 25)  # Busy periods
            elif hour >= 22 or hour <= 5:
                num_obs = random.randint(2, 5)    # Night time
            else:
                num_obs = random.randint(8, 15)   # Normal hours
            
            for _ in range(num_obs):
                segment_id = random.choice(segments)
                
                # Realistic speed based on time
                if is_weekday and is_morning_peak:
                    # Morning rush: slow speeds
                    base_speed = random.uniform(10, 30)
                elif is_weekday and is_evening_peak:
                    # Evening rush: slow speeds
                    base_speed = random.uniform(12, 32)
                elif hour >= 22 or hour <= 5:
                    # Night: fast speeds
                    base_speed = random.uniform(45, 65)
                else:
                    # Normal: moderate speeds
                    base_speed = random.uniform(30, 55)
                
                # Add random variation
                speed = max(5, min(120, base_speed + random.gauss(0, 8)))
                
                # Random minute within the hour
                minute = random.randint(0, 59)
                obs_time = current_date.replace(hour=hour, minute=minute, second=0)
                
                observations.append((
                    segment_id,
                    day_of_week_pg,
                    hour,
                    round(speed, 1),
                    obs_time
                ))
    
    # Insert in batches
    print(f"Inserting {len(observations)} synthetic observations...")
    batch_size = 1000
    for i in range(0, len(observations), batch_size):
        batch = observations[i:i+batch_size]
        cur.executemany(
            """INSERT INTO segment_speed_observations 
               (segment_id, day_of_week, hour_of_day, observed_speed_kmh, observed_at)
               VALUES (%s, %s, %s, %s, %s)""",
            batch
        )
        conn.commit()
        print(f"Inserted {min(i+batch_size, len(observations))}/{len(observations)}")
    
    # Verify
    cur.execute("SELECT COUNT(*) FROM segment_speed_observations")
    count = cur.fetchone()[0]
    print(f"\n✓ Total observations in database: {count}")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
