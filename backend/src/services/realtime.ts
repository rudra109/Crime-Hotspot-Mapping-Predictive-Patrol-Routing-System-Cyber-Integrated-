import { Server } from 'socket.io';

let io: Server | null = null;

export const setRealtimeServer = (server: Server) => {
  io = server;
};

export const emitCrimeCreated = (crime: any) => {
  io?.emit('crime:new', crime);
};

export const emitAlertCreated = (alert: any) => {
  io?.emit('alert:new', alert);
};

export const emitRouteOptimized = (payload: any) => {
  io?.emit('route:optimized', payload);
};
