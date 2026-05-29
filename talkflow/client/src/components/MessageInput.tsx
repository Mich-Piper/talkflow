// client/src/components/MessageInput.tsx
import { useState, useRef, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';

interface Props {
  channelId: string;
  placeholder?: string;
}

export default function MessageInput({ channelId, placeholder = 'Message #general' }: Props) {
  const [content, setContent]   = useState('');
  const { sendMessage, socket } = useSocket();
  const typingTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTyping = useCallback(() => {
    socket?.emit('typing:start', { channelId });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket?.emit('typing:stop', { channelId });
    }, 2000);
  }, [channelId, socket]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = content.trim();
    if (!trimmed) return;
    sendMessage({ channelId, content: trimmed });
    setContent('');
    socket?.emit('typing:stop', { channelId });
    if (typingTimer.current) clearTimeout(typingTimer.current);
  }

  return (
    <div className="message-input-wrap">
      <textarea
        className="message-input"
        value={content}
        onChange={e => { setContent(e.target.value); handleTyping(); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
      />
      <button
        className="send-btn"
        onClick={handleSend}
        disabled={!content.trim()}
      >
        ↑
      </button>
    </div>
  );
}
