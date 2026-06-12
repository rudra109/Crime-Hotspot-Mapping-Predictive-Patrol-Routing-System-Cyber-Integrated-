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

export const emitAlertUpdated = (alert: any) => {
  io?.emit('alert:update', alert);
};

export const emitRouteOptimized = (payload: any) => {
  io?.emit('route:optimized', payload);
};

export const emitGpsUpdate = (positions: any[]) => {
  io?.emit('gps:positions', { positions, timestamp: new Date().toISOString() });
};

export const emitConstraintChanged = (constraint: any) => {
  io?.emit('patrol:constraint', constraint);
};

