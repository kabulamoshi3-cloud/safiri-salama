/**
 * Tracking Socket Service — web-platform singleton
 * Connects to tracking-service via Socket.io WebSocket.
 * Uses import.meta.env.VITE_TRACKING_URL (falls back to localhost:3001).
 */

import { io, Socket } from 'socket.io-client';

const TRACKING_URL = import.meta.env.VITE_TRACKING_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

function connect(token: string): void {
  if (socket?.connected) {
    console.log('[trackingSocket] already connected, skipping');
    return;
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  console.log('[trackingSocket] connecting to', TRACKING_URL);
  socket = io(TRACKING_URL, {
    auth: { token },
    transports: ['websocket'],
  });
  socket.on('connect', () => console.log('[trackingSocket] connected', socket?.id));
  socket.on('connect_error', (err) => console.error('[trackingSocket] connect_error', err.message));
  socket.on('disconnect', (reason) => console.log('[trackingSocket] disconnected', reason));
}

function joinTrip(tripId: string): void {
  if (!socket?.connected) {
    console.warn('[trackingSocket] joinTrip called before connected');
    return;
  }
  socket.emit('trip:join', { tripId });
}

function leaveTrip(): void {
  if (!socket?.connected) return;
  socket.emit('trip:leave');
}

function onDriverMoved(cb: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('driver:moved', cb);
  return () => socket?.off('driver:moved', cb);
}

function onTripStatus(cb: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('trip:status', cb);
  return () => socket?.off('trip:status', cb);
}

function onTripStarted(cb: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('trip:started', cb);
  return () => socket?.off('trip:started', cb);
}

function onTripCompleted(cb: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('trip:completed', cb);
  return () => socket?.off('trip:completed', cb);
}

function onETAChanged(cb: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('eta:changed', cb);
  return () => socket?.off('eta:changed', cb);
}

function onConnect(cb: () => void): () => void {
  if (!socket) return () => {};
  socket.on('connect', cb);
  return () => socket?.off('connect', cb);
}

function onConnectError(cb: (err: Error) => void): () => void {
  if (!socket) return () => {};
  socket.on('connect_error', cb);
  return () => socket?.off('connect_error', cb);
}

function disconnect(): void {
  if (socket) {
    console.log('[trackingSocket] disconnecting');
    socket.disconnect();
    socket = null;
  }
}

function isConnected(): boolean {
  return socket?.connected ?? false;
}

const trackingSocket = {
  connect,
  joinTrip,
  leaveTrip,
  onDriverMoved,
  onTripStatus,
  onTripStarted,
  onTripCompleted,
  onETAChanged,
  onConnect,
  onConnectError,
  disconnect,
  isConnected,
};

export default trackingSocket;
