import { Server } from 'socket.io';

let io: Server;

export const setSocketServerInstance = (ioInstance: Server) => {
  io = ioInstance;
};

export const getSocketServerInstance = (): Server => {
  if (!io) {
    throw new Error('Socket.io server instance has not been initialized.');
  }
  return io;
};
