import { io, Socket } from 'socket.io-client';

let socketRef: Socket | null = null;

export const getSocket = () => {
  if (socketRef) return socketRef;

  const fallbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : 'http://localhost:3001';
  const url = import.meta.env.VITE_SOCKET_URL || fallbackUrl;
  socketRef = io(url, {
    autoConnect: true,
    reconnection: true,
    timeout: 5000,
  });
  return socketRef;
};

export const disconnectSocket = () => {
  if (!socketRef) return;
  socketRef.disconnect();
  socketRef = null;
};
