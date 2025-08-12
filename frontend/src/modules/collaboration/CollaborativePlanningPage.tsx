import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../layout/AppLayout';
import { useCollaboration } from './CollaborationProvider';
import { VotingInterface } from './VotingInterface';
import { useAuth } from '../auth/AuthContext';
import { CollaborationDebug } from './CollaborationDebug';
import clsx from 'clsx';

export const CollaborativePlanningPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const {
    currentSession,
    sessions,
    isConnected,
    joinSession,
    createSession,
    updateItinerary,
    addComment,
    endSession
  } = useCollaboration();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [commentText, setCommentText] = useState('');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // Try to join on mount/param change
  useEffect(() => {
    if (sessionId && isConnected) {
      joinSession(sessionId);
    }
  }, [sessionId, isConnected, joinSession]);

  // Create session (inside component scope)
  const handleCreateSession = async () => {
    if (!sessionName.trim()) return;
    try {
      const session = await createSession(sessionName);
      setShowCreateModal(false);
      setSessionName('');
      if (session && (session as any).id) {
        navigate(`/collaborate/${(session as any).id}`);
      } else {
        console.error('Session created but no id returned', session);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  // helper functions inside component scope
  const handleAddToItinerary = (item: any) => {
    if (!currentSession) return;
    const newItinerary = { ...currentSession.itinerary, items: [...currentSession.itinerary.items, item] };
    updateItinerary(newItinerary);
  };

  const handleRemoveFromItinerary = (itemId: string) => {
    if (!currentSession) return;
    const newItinerary = { ...currentSession.itinerary, items: currentSession.itinerary.items.filter(item => item.id !== itemId) };
    updateItinerary(newItinerary);
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !activeItemId) return;
    addComment(activeItemId, commentText);
    setCommentText('');
  };

  const handleShareSession = () => {
    if (!currentSession?.id) return;
    const shareUrl = `${window.location.origin}/collaborate/${currentSession.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Session link copied to clipboard!');
  };

  // Normalize participants as an array to avoid runtime errors
  const participantsList = useMemo(() => {
    const p: any = currentSession?.participants as any;
    if (!p) return [] as any[];
    if (Array.isArray(p)) return p as any[];
    if (typeof p?.values === 'function') return Array.from(p.values());
    try { return Object.values(p); } catch { return [] as any[]; }
  }, [currentSession?.participants]);

  // If on a session route but no session yet, show a lightweight loading state
  if (sessionId && !currentSession) {
    return (
      <AppLayout title="Planning Session">
        <div className="container-fluid py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Joining session...</span>
          </div>
          <p className="text-muted mt-3">Joining session…</p>
        </div>
        <CollaborationDebug />
      </AppLayout>
    );
  }

  // List view when no sessionId
  if (!sessionId) {
    return (
      <AppLayout title="Collaborative Planning">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Planning Sessions</h2>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(true)}
                >
                  <i className="fa-solid fa-plus me-2"></i>
                  New Session
                </button>
              </div>

              {!isConnected && (
                <div className="alert alert-warning">
                  <i className="fa-solid fa-exclamation-triangle me-2"></i>
                  Connecting to collaboration server...
                </div>
              )}

              <div className="row g-3">
                {sessions.map(session => (
                  <div key={session.id} className="col-md-6 col-lg-4">
                    <div className="vc-card h-100 hover-lift">
                      <div className="card-body">
                        <h5 className="card-title d-flex align-items-center justify-content-between">
                          <span>{session.name}</span>
                          {session.status === 'ended' && <span className="badge bg-secondary">Ended</span>}
                        </h5>
                        <div className="mb-3">
                          <span className="badge bg-primary me-2">
                            <i className="fa-solid fa-users me-1"></i>
                            {session.participants.length} participants
                          </span>
                          <span className="badge bg-secondary">
                            <i className="fa-solid fa-list me-1"></i>
                            {session.itinerary.items.length} activities
                          </span>
                        </div>
                        <div className="d-grid gap-2">
                          <button 
                            className="btn btn-secondary"
                            disabled={session.status === 'ended'}
                            onClick={() => navigate(`/collaborate/${session.id}`)}
                          >
                            {session.status === 'ended' ? 'Session Ended' : 'Join Session'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {sessions.length === 0 && (
                  <div className="col-12 text-center py-5">
                    <i className="fa-solid fa-users fa-3x text-muted mb-3"></i>
                    <h4>No active sessions</h4>
                    <p className="text-muted">Create a new session to start collaborative planning</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create Session Modal */}
        {showCreateModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Create Planning Session</h5>
                  <button 
                    className="btn-close"
                    onClick={() => setShowCreateModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Session Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="e.g., Q4 Team Outing"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn vc-btn-primary"
                    onClick={handleCreateSession}
                    disabled={!sessionName.trim()}
                  >
                    Create Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    );
  }

  // Session detail view
  return (
    <AppLayout title={currentSession?.name || 'Planning Session'}>
      <div className="container-fluid">
        {/* Session Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="vc-card p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="mb-1">{currentSession?.name || 'Loading...'}</h3>
                  <div className="d-flex gap-3">
                    <span className="text-muted">
                      <i className="fa-solid fa-users me-1"></i>
                      {participantsList.length} participants
                    </span>
                    <span className={clsx('text-muted', isConnected ? 'text-success' : 'text-danger')}>
                      <i className={clsx('fa-solid me-1', isConnected ? 'fa-circle' : 'fa-circle-exclamation')}></i>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-primary" onClick={() => {
                    if (currentSession?.id) {
                      const shareUrl = `${window.location.origin}/collaborate/${currentSession.id}`;
                      navigator.clipboard.writeText(shareUrl);
                      alert('Session link copied to clipboard!');
                    }
                  }}>
                    <i className="fa-solid fa-share me-2"></i>
                    Share
                  </button>
                  <button className="btn btn-secondary" disabled={!currentSession?.id || currentSession?.status === 'ended'} onClick={async () => {
                    if (!currentSession?.id) return;
                    const ok = await endSession(currentSession.id);
                    if (!ok) alert('Failed to end session');
                  }}>
                    <i className="fa-solid fa-stop-circle me-2"></i>
                    {currentSession?.status === 'ended' ? 'Ended' : 'End Session'}
                  </button>
                  <button className="btn btn-outline-secondary" onClick={() => navigate('/collaborate')}>
                    <i className="fa-solid fa-arrow-left me-2"></i>
                    Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Activities Column */}
          <div className="col-lg-8">
            <div className="vc-card">
              <div className="card-header">
                <h5 className="mb-0">Available Activities</h5>
              </div>
              <div className="card-body">
                {/* Mock activities for demo */}
                {mockActivities.map(activity => (
                  <div key={activity.id} className="activity-item mb-3 p-3 border rounded">
                    <div className="row align-items-center">
                      <div className="col-md-8">
                        <h6 className="mb-1">{activity.title}</h6>
                        <p className="text-muted mb-2">{activity.description}</p>
                        <div className="d-flex gap-3 small">
                          <span><i className="fa-solid fa-location-dot me-1"></i>{activity.location}</span>
                          <span><i className="fa-solid fa-dollar-sign me-1"></i>{activity.price}/person</span>
                          <span><i className="fa-solid fa-star me-1 text-warning"></i>{activity.rating}</span>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <VotingInterface itemId={activity.id} />
                        <button 
                          className="btn btn-sm btn-outline-primary mt-2 w-100 add-to-itinerary-btn"
                          onClick={() => handleAddToItinerary(activity)}
                        >
                          <i className="fa-solid fa-plus me-1"></i>
                          Add to Itinerary
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Itinerary Column */}
          <div className="col-lg-4">
            <div className="vc-card sticky-top" style={{ top: 20 }}>
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="fa-solid fa-calendar-days me-2"></i>
                  Itinerary
                </h5>
              </div>
              <div className="card-body">
                {(currentSession?.itinerary?.items?.length ?? 0) === 0 ? (
                  <p className="text-muted text-center py-3">
                    No activities added yet
                  </p>
                ) : (
                  <div className="timeline">
                    {(currentSession?.itinerary?.items ?? []).map((item: any) => (
                      <div key={item.id} className="timeline-item mb-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="mb-1">{item.title}</h6>
                            <small className="text-muted">{item.location}</small>
                          </div>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleRemoveFromItinerary(item.id)}
                          >
                            <i className="fa-solid fa-times"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {currentSession && (currentSession.itinerary?.items?.length ?? 0) > 0 && (
                  <div className="mt-3 pt-3 border-top">
                    <button className="btn vc-btn-primary w-100">
                      <i className="fa-solid fa-calendar-plus me-2"></i>
                      Schedule to Calendar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="row mt-4">
          <div className="col-12">
            <div className="vc-card">
              <div className="card-header">
                <h5 className="mb-0">Active Participants</h5>
              </div>
              <div className="card-body">
                <div className="d-flex flex-wrap gap-3">
                  {participantsList.map((participant: any) => (
                    <div key={participant.id} className="participant-chip">
                      <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name)}&background=random`}
                        alt={participant.name}
                        className="rounded-circle me-2"
                        width="32"
                        height="32"
                      />
                      <span>{participant.name}</span>
                      <span className={clsx('status-dot ms-2', {
                        'bg-success': participant.presence === 'active',
                        'bg-warning': participant.presence === 'away',
                        'bg-secondary': participant.presence === 'offline'
                      })}></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debug info in development */}
      <CollaborationDebug />

      <style>{`
        .activity-item {
          transition: all 0.3s ease;
          background: white;
        }
        
        .activity-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .timeline-item {
          position: relative;
          padding-left: 30px;
        }
        
        .timeline-item::before {
          content: '';
          position: absolute;
          left: 8px;
          top: 8px;
          width: 8px;
          height: 8px;
          background: var(--vc-primary);
          border-radius: 50%;
        }
        
        .timeline-item::after {
          content: '';
          position: absolute;
          left: 11px;
          top: 16px;
          bottom: -16px;
          width: 2px;
          background: #e9ecef;
        }
        
        .timeline-item:last-child::after {
          display: none;
        }
        
        .participant-chip {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          background: #f8f9fa;
          border-radius: 20px;
          font-size: 14px;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        
        /* Fix hover states for buttons */
        .add-to-itinerary-btn:hover {
          background-color: #0d6efd !important;
          border-color: #0d6efd !important;
          color: white !important;
        }
        
        /* Fix voting button hover states */
        .voting-interface .btn-outline-success:hover {
          background-color: #198754 !important;
          border-color: #198754 !important;
          color: white !important;
        }
        
        .voting-interface .btn-outline-danger:hover {
          background-color: #dc3545 !important;
          border-color: #dc3545 !important;
          color: white !important;
        }
        
        .voting-interface .btn-success:hover {
          background-color: #157347 !important;
          border-color: #146c43 !important;
        }
        
        .voting-interface .btn-danger:hover {
          background-color: #b02a37 !important;
          border-color: #a02834 !important;
        }
        
        /* Ensure buttons are visible and have proper transitions */
        .voting-interface .btn {
          transition: all 0.2s ease-in-out;
          opacity: 1;
        }
        
        .add-to-itinerary-btn {
          transition: all 0.2s ease-in-out;
          opacity: 1;
        }
      `}</style>
    </AppLayout>
  );
};

// Mock activities data
const mockActivities = [
  {
    id: 'act-1',
    title: 'Team Lunch at The Italian Corner',
    description: 'Authentic Italian cuisine with vegetarian and vegan options',
    location: '123 Downtown St',
    price: 35,
    rating: 4.5,
    type: 'restaurant'
  },
  {
    id: 'act-2',
    title: 'Escape Room Challenge - Mystery Mansion',
    description: 'Work together to solve puzzles and escape within 60 minutes',
    location: '456 Adventure Ave',
    price: 45,
    rating: 4.8,
    type: 'activity'
  },
  {
    id: 'act-3',
    title: 'Sunset Rooftop Bar',
    description: 'Cocktails and small plates with panoramic city views',
    location: '789 Sky Tower',
    price: 25,
    rating: 4.3,
    type: 'restaurant'
  },
  {
    id: 'act-4',
    title: 'Bowling & Arcade Night',
    description: 'Classic bowling with modern arcade games and prizes',
    location: '321 Fun Plaza',
    price: 30,
    rating: 4.2,
    type: 'activity'
  },
  {
    id: 'act-5',
    title: 'Spa & Wellness Retreat',
    description: 'Relaxing spa treatments and meditation sessions',
    location: '555 Serenity Way',
    price: 85,
    rating: 4.9,
    type: 'activity'
  }
]; 
