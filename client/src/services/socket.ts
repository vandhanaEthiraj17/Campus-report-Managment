import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Initializes and connects the Socket.IO client using current JWT session
 */
export const connectSocket = (): Socket => {
  if (socket && socket.connected) {
    return socket;
  }

  const token = localStorage.getItem('smart_campus_token');

  // In Vite dev or production, connect to the root host (which proxies /socket.io or backend port 5000)
  const socketUrl = window.location.port === '3000' ? 'http://localhost:5000' : '/';

  socket = io(socketUrl, {
    auth: {
      token: token || '',
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    // Socket connected
  });

  socket.on('connect_error', (error) => {
    console.warn('[Socket.IO Connection Notice]:', error.message);
  });

  return socket;
};

/**
 * Disconnects the active socket connection on logout
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Returns current socket instance
 */
export const getSocket = (): Socket | null => socket;
