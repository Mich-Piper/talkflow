// client/src/hooks/useSocket.ts
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuth } from 'firebase/auth';

let socketInstance: Socket | null = null;

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    async function connect() {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      if (!socketInstance) {
        socketInstance = io(import.meta.env.VITE_API_URL || 'http://localhost:4001', {
          auth: { token },
          transports: ['websocket'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });
      }

      socketRef.current = socketInstance;

      socketInstance.on('connect',    () => setConnected(true));
      socketInstance.on('disconnect', () => setConnected(false));

      // Presence heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        socketInstance?.emit('presence:heartbeat');
      }, 30_000);

      return () => {
        clearInterval(heartbeat);
        socketInstance?.off('connect');
        socketInstance?.off('disconnect');
      };
    }

    connect();
  }, []);

  function joinChannel(channelId: string) {
    socketRef.current?.emit('channel:join', { channelId });
  }

  function leaveChannel(channelId: string) {
    socketRef.current?.emit('channel:leave', { channelId });
  }

  function sendMessage(payload: { channelId: string; content: string; threadId?: number }) {
    socketRef.current?.emit('message:send', payload);
  }

  function reactToMessage(messageId: number, emoji: string) {
    socketRef.current?.emit('message:react', { messageId, emoji });
  }

  return { socket: socketRef.current, connected, joinChannel, leaveChannel, sendMessage, reactToMessage };
}
