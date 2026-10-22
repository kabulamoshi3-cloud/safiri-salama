-- Migration 017: Add UNIQUE constraint on traffic_predictions_cache
-- Required for ON CONFLICT (segment_id, predicted_for) upserts in tracking.ts

ALTER TABLE traffic_predictions_cache
  ADD CONSTRAINT traffic_predictions_cache_segment_predicted_unique
  UNIQUE (segment_id, predicted_for);
