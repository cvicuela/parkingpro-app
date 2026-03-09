import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

let socket = null;

export function getSocket() {
  if (!socket) {
    const token = localStorage.getItem('pp_token');
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      auth: { token },
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    s.emit('join_dashboard');
  }
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}
