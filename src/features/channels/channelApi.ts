import { io, type Socket } from 'socket.io-client';

const backendUrl = import.meta.env.VITE_API_URL || window.location.origin;

export const channelApi = {
  socket: (): Socket => io(`${backendUrl}/inbox`, {
    transports: ['polling', 'websocket'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
  }),
};
