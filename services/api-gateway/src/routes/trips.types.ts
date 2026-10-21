/**
 * Trip state machine types
 * Shared between trips.ts and any future code that needs trip-related types.
 */

// ── State ─────────────────────────────────────────────────────────────────────

export type TripStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'DRIVER_ARRIVING'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

// ── DB row shapes ─────────────────────────────────────────────────────────────

export interface TripRow {
  id: string;
  passenger_id: string;
  driver_id: string | null;
  status: TripStatus;
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_address: string | null;
  dropoff_latitude: number;
  dropoff_longitude: number;
  dropoff_address: string | null;
  vehicle_type: string;
  estimated_fare: number | null;
  estimated_distance: number | null;
  estimated_duration: number | null;
  payment_method: string;
  final_fare: number | null;
  transaction_id: string | null;
  created_at: Date;
  updated_at: Date | null;
  accepted_at: Date | null;
  driver_arriving_at: Date | null;
  arrived_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  passenger_rating: number | null;
  passenger_review: string | null;
  driver_rating: number | null;
  driver_review: string | null;
}

export interface TripStateLogRow {
  id: string;
  trip_id: string;
  from_state: TripStatus | null;
  to_state: TripStatus;
  actor_id: string;
  actor_type: string;
  note: string | null;
  created_at: Date;
}

// ── Transition table ──────────────────────────────────────────────────────────

export interface AllowedTransition {
  to: TripStatus;
  actor: 'driver' | 'passenger' | 'any';
  /** trips column to set to NOW() when this transition fires */
  timestampCol?: keyof TripRow;
}

export const TRANSITIONS: Record<TripStatus, AllowedTransition[]> = {
  REQUESTED: [
    { to: 'ACCEPTED',        actor: 'driver',    timestampCol: 'accepted_at' },
    { to: 'CANCELLED',       actor: 'any',       timestampCol: 'cancelled_at' },
  ],
  ACCEPTED: [
    { to: 'DRIVER_ARRIVING', actor: 'driver',    timestampCol: 'driver_arriving_at' },
    { to: 'CANCELLED',       actor: 'any',       timestampCol: 'cancelled_at' },
  ],
  DRIVER_ARRIVING: [
    { to: 'ARRIVED',         actor: 'driver',    timestampCol: 'arrived_at' },
    { to: 'CANCELLED',       actor: 'driver',    timestampCol: 'cancelled_at' },
  ],
  ARRIVED: [
    { to: 'IN_PROGRESS',     actor: 'driver',    timestampCol: 'started_at' },
    { to: 'CANCELLED',       actor: 'driver',    timestampCol: 'cancelled_at' },
  ],
  IN_PROGRESS: [
    { to: 'COMPLETED',       actor: 'driver',    timestampCol: 'completed_at' },
  ],
  COMPLETED: [],
  CANCELLED: [],
};
