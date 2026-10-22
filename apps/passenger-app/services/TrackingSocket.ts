import { io, Socket } from 'socket.io-client';

const TRACKING_URL = process.env.EXPO_PUBLIC_TRACKING_URL;

let socket: Socket | null = null;

export function connect(token: string): void {
  if (socket?.connected) return;
  if (!TRACKING_URL) {
    console.warn('[TrackingSocket] EXPO_PUBLIC_TRACKING_URL is not configured');
    return;
  }
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

export function joinTrip(tripId: string): void {
  if (!socket) {
    console.warn('[TrackingSocket] joinTrip called but socket is null');
    return;
  }
  socket.emit('trip:join', { tripId });
}

export function leaveTrip(): void {
  if (!socket?.connected) {
    console.warn('[TrackingSocket] leaveTrip called but socket is not connected');
    return;
  }
  socket.emit('trip:leave');
}

export function onDriverMoved(cb: (data: any) => void): () => void {
  if (!socket) {
    console.warn('[TrackingSocket] onDriverMoved called but socket is null');
    return () => {};
  }
  socket.on('driver:moved', cb);
  return () => {
    socket?.off('driver:moved', cb);
  };
}

export function onTripStatus(cb: (data: any) => void): () => void {
  if (!socket) {
    console.warn('[TrackingSocket] onTripStatus called but socket is null');
    return () => {};
  }
  socket.on('trip:status', cb);
  return () => {
    socket?.off('trip:status', cb);
  };
}

export function onETAChanged(cb: (data: any) => void): () => void {
  if (!socket) {
    console.warn('[TrackingSocket] onETAChanged called but socket is null');
    return () => {};
  }
  socket.on('eta:changed', cb);
  return () => {
    socket?.off('eta:changed', cb);
  };
}

export function disconnect(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
