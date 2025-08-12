import React, { useState, useEffect } from 'react';
import { AppLayout } from '../layout/AppLayout';
import { EmptyState } from '../common/EmptyState';
import { useAuth } from '../auth/AuthContext';
import { useUsers } from '../../hooks/useUsers';
import clsx from 'clsx';

interface Birthday {
  id: string;
  userId: string;
  userName: string;
  date: string;
  visibility: 'team' | 'org' | 'private';
  messageBoardId: string | null;
  daysUntil?: number;
}

interface MessageBoard {
  id: string;
  birthdayId: string;
  userId: string;
  userName: string;
  title: string;
  messageCount: number;
  participants: string[];
}

interface Message {
  id: string;
  boardId: string;
  authorId: string;
  authorName: string;
  content: string;
  sticker?: string;
  createdAt: string;
}

const stickers = ['🎂', '🎉', '🎈', '🎁', '🥳', '🍰', '✨', '🎊', '💐', '🌟'];

export const BirthdayPage: React.FC = () => {
  const { getAuthHeader } = useAuth();
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [selectedBirthday, setSelectedBirthday] = useState<Birthday | null>(null);
  const [board, setBoard] = useState<MessageBoard | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [selectedSticker, setSelectedSticker] = useState('🎂');
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [window, setWindow] = useState(90);

  // Fetch upcoming birthdays
  useEffect(() => {
    fetchBirthdays();
  }, [window]);

  async function fetchBirthdays() {
    try {
      const res = await fetch(`/api/birthday/upcoming?window=${window}`, {
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to fetch birthdays');
      const data = await res.json();
      setBirthdays(data.birthdays);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function createOrLoadBoard(birthday: Birthday) {
    setLoading(true);
    try {
      // Create board if doesn't exist
      const createRes = await fetch('/api/birthday/boards', {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthdayId: birthday.id })
      });
      
      if (!createRes.ok) throw new Error('Failed to create board');
      const { board } = await createRes.json();
      
      // Load board details
      const boardRes = await fetch(`/api/birthday/boards/${board.id}`, {
        headers: getAuthHeader()
      });
      
      if (!boardRes.ok) throw new Error('Failed to load board');
      const boardData = await boardRes.json();
      
      setBoard(boardData.board);
      setMessages(boardData.messages);
      setSelectedBirthday(birthday);
      
      // Get share URL
      const shareRes = await fetch(`/api/birthday/boards/${board.id}/share`, {
        headers: getAuthHeader()
      });
      if (shareRes.ok) {
        const { shareUrl } = await shareRes.json();
        setShareUrl(shareUrl);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!board || !messageContent.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/birthday/boards/${board.id}/messages`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageContent,
          sticker: selectedSticker
        })
      });
      
      if (!res.ok) throw new Error('Failed to send message');
      const { message } = await res.json();
      
      setMessages([...messages, message]);
      setMessageContent('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyShareLink() {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    }
  }

  function getDaysUntilText(days: number | undefined) {
    if (!days) return '';
    if (days === 0) return 'Today! 🎉';
    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `In ${days} days`;
    if (days <= 30) return `In ${Math.floor(days / 7)} weeks`;
    return `In ${Math.floor(days / 30)} months`;
  }

  function getMonthName(date: string) {
    return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }

  return (
    <AppLayout title="Birthday Tracker">
      <div className="birthday-container">
        {error && (
          <div className="alert alert-danger mb-3">{error}</div>
        )}

        <div className="row">
          {/* Upcoming Birthdays */}
          <div className="col-md-4">
            <div className="card vc-card">
              <div className="card-header">
                <h5 className="mb-0">Upcoming Birthdays</h5>
                <div className="mt-2">
                  <select 
                    className="form-select form-select-sm"
                    value={window}
                    onChange={(e) => setWindow(parseInt(e.target.value))}
                  >
                    <option value={7}>Next 7 days</option>
                    <option value={30}>Next 30 days</option>
                    <option value={60}>Next 60 days</option>
                    <option value={90}>Next 90 days</option>
                  </select>
                </div>
              </div>
              <div className="card-body">
                {birthdays.length === 0 ? (
                  <p className="text-muted">No upcoming birthdays in this period</p>
                ) : (
                  <div className="birthday-list">
                    {birthdays.map(birthday => (
                      <div
                        key={birthday.id}
                        className={clsx('birthday-item', {
                          'selected': selectedBirthday?.id === birthday.id,
                          'today': birthday.daysUntil === 0
                        })}
                        onClick={() => createOrLoadBoard(birthday)}
                      >
                        <div className="d-flex align-items-center">
                          <div className="birthday-avatar">
                            {birthday.userName.charAt(0)}
                          </div>
                          <div className="flex-grow-1 ms-3">
                            <div className="fw-semibold">{birthday.userName}</div>
                            <div className="small text-muted">
                              {getMonthName(birthday.date)}
                            </div>
                          </div>
                          <div className="text-end">
                            <div className={clsx('small', {
                              'text-danger fw-bold': birthday.daysUntil === 0,
                              'text-warning': birthday.daysUntil && birthday.daysUntil <= 7
                            })}>
                              {getDaysUntilText(birthday.daysUntil)}
                            </div>
                            {birthday.messageBoardId && (
                              <i className="fas fa-envelope text-primary small"></i>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* E-Card Board */}
          <div className="col-md-8">
            {selectedBirthday && board ? (
              <div className="card vc-card">
                <div className="card-header">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">{board.title}</h5>
                    <div>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={copyShareLink}
                      >
                        <i className="fas fa-share"></i> Share
                      </button>
                      <span className="badge bg-secondary">
                        {board.messageCount} messages
                      </span>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {/* Messages */}
                  <div className="messages-container mb-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-5">
                        <i className="fas fa-envelope-open-text fa-3x text-muted mb-3"></i>
                        <p className="text-muted">Be the first to sign the birthday card!</p>
                      </div>
                    ) : (
                      <div className="messages-grid">
                        {messages.map(message => (
                          <div key={message.id} className="message-card animate__animated animate__fadeIn">
                            <div className="message-sticker">{message.sticker}</div>
                            <div className="message-content">{message.content}</div>
                            <div className="message-author">- {message.authorName}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Message Composer */}
                  <div className="message-composer">
                    <h6>Add your message</h6>
                    
                    {/* Sticker Selector */}
                    <div className="sticker-selector mb-3">
                      {stickers.map(sticker => (
                        <button
                          key={sticker}
                          className={clsx('sticker-btn', {
                            'selected': selectedSticker === sticker
                          })}
                          onClick={() => setSelectedSticker(sticker)}
                        >
                          {sticker}
                        </button>
                      ))}
                    </div>

                    {/* Message Input */}
                    <div className="input-group">
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Write your birthday wish..."
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        maxLength={500}
                      />
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <small className="text-muted">
                        {messageContent.length}/500 characters
                      </small>
                      <button
                        className="btn btn-primary"
                        onClick={sendMessage}
                        disabled={loading || !messageContent.trim()}
                      >
                        <i className="fas fa-paper-plane me-2"></i>
                        Send Message
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card vc-card">
                <div className="card-body text-center py-5">
                  <i className="fas fa-birthday-cake fa-4x text-muted mb-3"></i>
                  <h5>Select a birthday to create or view their card</h5>
                  <p className="text-muted">
                    Click on any upcoming birthday to send your wishes
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}; 
