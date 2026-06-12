import { Server } from 'socket.io';

let io: Server | null = null;

export function initSocket(server: any) {
  io = new Server(server, { path: '/ws' });
  io.on('connection', (socket) => {
    console.log('Realtime client connected', socket.id);
    socket.on('disconnect', () => console.log('Realtime client disconnected', socket.id));
  });
}

export function broadcastEvent(event: string, payload: any) {
  if (!io) return;
  io.emit(event, payload);
}

export function getSocketInstance() {
  return io;
}
