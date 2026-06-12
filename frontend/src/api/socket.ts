import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket() {
  if (socket) return socket;
  socket = io(undefined as any, { path: '/ws', transports: ['websocket'] });
  return socket;
}

export function getSocket() {
  return socket;
}
