import { io, Socket } from 'socket.io-client';

const TRACKING_URL = process.env.EXPO_PUBLIC_TRACKING_URL ?? 'https://dalasmart-tracking.fly.dev';

let socket: Socket | null = null;
let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function connect(token: string): void {
  if (socket?.connected) return;
  try {
    socket = io(TRACKING_URL, {
      auth: { token },
      transports: ['websocket'],
    });
    socket.on('connect_error', (err) => {
      console.warn('[TrackingSocket] connection error:', err.message);
    });
  } catch (err) {
    console.warn('[TrackingSocket] connect threw:', err);
  }
}

export function startLocationEmit(
  tripId: string,
  getLocation: () => Promise<{
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  }>
): void {
  if (!socket) {
    console.warn('[TrackingSocket] startLocationEmit called but socket is null');
    return;
  }

  if (intervalHandle !== null) {
    clearInterval(intervalHandle);
  }

  // Decode driver id from JWT payload
  let driverId: string = '';
  try {
    const auth = socket.auth as { token?: string };
    const token: string = auth?.token ?? '';
    driverId = JSON.parse(atob(token.split('.')[1])).id ?? '';
  } catch {
    console.warn('[TrackingSocket] could not decode driverId from token');
  }

  intervalHandle = setInterval(async () => {
    if (!socket?.connected) return;
    try {
      const loc = await getLocation();
      socket.emit('driver:location:update', {
        driverId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        heading: loc.heading,
        speed: loc.speed,
        currentTripId: tripId,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('[TrackingSocket] getLocation error:', err);
    }
  }, 5000);
}

export function stopLocationEmit(): void {
  if (intervalHandle !== null) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

export function disconnect(): void {
  stopLocationEmit();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
