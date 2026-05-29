// client/src/components/MessageFeed.tsx
import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../hooks/useSocket';

interface Message {
  id: number;
  content: string;
  user_id: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
  edited_at?: string;
  reactions?: { emoji: string; count: number }[];
  file_url?: string;
}

interface Props {
  channelId: string;
  currentUserId: string;
}

export default function MessageFeed({ channelId, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(true);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const { socket, joinChannel } = useSocket();

  // Load history
  useEffect(() => {
    if (!channelId) return;
    setLoading(true);
    fetch(`/api/channels/${channelId}/messages`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('id_token')}` },
    })
      .then(r => r.json())
      .then(data => { setMessages(data); setLoading(false); });

    joinChannel(channelId);
  }, [channelId]);

  // Live updates
  useEffect(() => {
    if (!socket) return;

    socket.on('message:new', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('message:reactions_updated', ({ messageId, reactions }: any) => {
      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, reactions } : m)
      );
    });

    return () => {
      socket.off('message:new');
      socket.off('message:reactions_updated');
    };
  }, [socket]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) return <div className="feed-loading">Loading messages…</div>;

  return (
    <div className="message-feed">
      {messages.map(msg => (
        <div key={msg.id} className={`message ${msg.user_id === currentUserId ? 'own' : ''}`}>
          <div className="message-avatar">
            {msg.avatar_url
              ? <img src={msg.avatar_url} alt={msg.display_name} />
              : <span>{msg.display_name[0]}</span>}
          </div>
          <div className="message-body">
            <div className="message-meta">
              <span className="message-author">{msg.display_name}</span>
              <span className="message-time">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {msg.edited_at && <span className="message-edited">(edited)</span>}
            </div>
            <div className="message-content">{msg.content}</div>
            {msg.file_url && (
              <a href={msg.file_url} className="message-file" target="_blank" rel="noreferrer">
                📎 Attachment
              </a>
            )}
            {msg.reactions?.length ? (
              <div className="message-reactions">
                {msg.reactions.map(r => (
                  <span key={r.emoji} className="reaction-pill">
                    {r.emoji} {r.count}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
