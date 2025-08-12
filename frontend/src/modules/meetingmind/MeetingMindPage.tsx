import React, { useState, useEffect } from 'react';
import { AppLayout } from '../layout/AppLayout';
import { useAuth } from '../auth/AuthContext';
import { useUsers } from '../../hooks/useUsers';
import clsx from 'clsx';

interface Meeting {
  id: string;
  title: string;
  type: string;
  attendees: string[];
  attendeeNames?: string[];
  agendaItems: string[];
  proposedTimes?: string[];
  decidedTime: string | null;
  duration: number;
  notes: string;
  status: 'scheduled' | 'in-progress' | 'completed';
  createdAt: string;
}

interface ActionItem {
  id: string;
  meetingId: string;
  meetingTitle?: string;
  title: string;
  description?: string;
  ownerId: string;
  ownerName?: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  completedAt?: string;
}

interface TimeSlot {
  time: string;
  score: number;
  availability: Array<{
    userId: string;
    available: boolean;
    conflicts: string[];
  }>;
}

export const MeetingMindPage: React.FC = () => {
  const { getAuthHeader, user } = useAuth();
  const { users: availableUsers } = useUsers({ excludeSelf: true });
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [myActions, setMyActions] = useState<ActionItem[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetingActions, setMeetingActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'actions'>('upcoming');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  
  // Form states
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingType, setMeetingType] = useState('general');
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [duration, setDuration] = useState(60);
  const [customAgenda, setCustomAgenda] = useState<string[]>([]);
  const [actionTitle, setActionTitle] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [actionOwner, setActionOwner] = useState('');
  const [actionDueDate, setActionDueDate] = useState('');

  const meetingTypes = [
    { value: 'general', label: 'General Meeting' },
    { value: 'standup', label: 'Daily Standup' },
    { value: 'sprint-planning', label: 'Sprint Planning' },
    { value: 'retrospective', label: 'Retrospective' },
    { value: 'one-on-one', label: 'One-on-One' },
    { value: 'project-kickoff', label: 'Project Kickoff' },
    { value: 'design-review', label: 'Design Review' },
    { value: 'technical-review', label: 'Technical Review' }
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'actions') {
        const res = await fetch('/api/meetingmind/my-actions', {
          headers: getAuthHeader()
        });
        if (!res.ok) throw new Error('Failed to fetch actions');
        const data = await res.json();
        setMyActions(data.actions || []);
      } else {
        const status = activeTab === 'upcoming' ? 'upcoming' : 'past';
        const res = await fetch(`/api/meetingmind/meetings?status=${status}`, {
          headers: getAuthHeader()
        });
        if (!res.ok) throw new Error('Failed to fetch meetings');
        const data = await res.json();
        setMeetings(data.meetings || []);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMeetingDetails(meetingId: string) {
    try {
      const res = await fetch(`/api/meetingmind/meetings/${meetingId}`, {
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to load meeting details');
      const data = await res.json();
      setSelectedMeeting(data.meeting);
      setMeetingActions(data.actionItems || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading meeting details:', err);
    }
  }

  async function createMeeting() {
    if (!meetingTitle || selectedAttendees.length < 1) {
      alert('Please provide a title and select at least 1 attendee');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/meetingmind/meetings', {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: meetingTitle,
          type: meetingType,
          attendees: [user?.id, ...selectedAttendees].filter(Boolean),
          duration,
          agendaItems: customAgenda.length > 0 ? customAgenda : undefined
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create meeting');
      }
      
      setShowCreateModal(false);
      resetMeetingForm();
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function selectMeetingTime(meetingId: string, time: string) {
    try {
      const res = await fetch(`/api/meetingmind/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ decidedTime: time })
      });
      
      if (!res.ok) throw new Error('Failed to update meeting');
      
      // Refresh meeting details
      loadMeetingDetails(meetingId);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function createActionItem() {
    if (!actionTitle || !actionOwner || !actionDueDate || !selectedMeeting) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      const res = await fetch(`/api/meetingmind/meetings/${selectedMeeting.id}/actions`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: actionTitle,
          description: actionDescription,
          ownerId: actionOwner,
          dueDate: new Date(actionDueDate).toISOString()
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create action item');
      }
      
      setShowActionModal(false);
      resetActionForm();
      loadMeetingDetails(selectedMeeting.id);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function updateActionStatus(actionId: string, status: 'pending' | 'in-progress' | 'completed') {
    try {
      const res = await fetch(`/api/meetingmind/actions/${actionId}`, {
        method: 'PUT',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (!res.ok) throw new Error('Failed to update action');
      
      if (activeTab === 'actions') {
        fetchData();
      } else if (selectedMeeting) {
        loadMeetingDetails(selectedMeeting.id);
      }
    } catch (err: any) {
      alert(err.message);
    }
  }

  function resetMeetingForm() {
    setMeetingTitle('');
    setMeetingType('general');
    setSelectedAttendees([]);
    setDuration(60);
    setCustomAgenda([]);
  }

  function resetActionForm() {
    setActionTitle('');
    setActionDescription('');
    setActionOwner('');
    setActionDueDate('');
  }

  function formatMeetingTime(dateStr: string, duration: number) {
    const date = new Date(dateStr);
    const endDate = new Date(date.getTime() + duration * 60000);
    
    return `${date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })} ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    })} - ${endDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    })}`;
  }

  function getActionStatusBadge(status: string) {
    const classes: Record<string, string> = {
      'pending': 'bg-secondary',
      'in-progress': 'bg-warning',
      'completed': 'bg-success'
    };
    return classes[status] || 'bg-secondary';
  }

  function isOverdue(dueDate: string, status: string) {
    return status !== 'completed' && new Date(dueDate) < new Date();
  }

  return (
    <AppLayout title="Meeting Mind">
      <div className="meetingmind-container">
        {error && (
          <div className="alert alert-danger mb-3">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </div>
        )}

        {/* Tabs */}
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button
              className={clsx('nav-link', { active: activeTab === 'upcoming' })}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming Meetings
            </button>
          </li>
          <li className="nav-item">
            <button
              className={clsx('nav-link', { active: activeTab === 'past' })}
              onClick={() => setActiveTab('past')}
            >
              Past Meetings
            </button>
          </li>
          <li className="nav-item">
            <button
              className={clsx('nav-link', { active: activeTab === 'actions' })}
              onClick={() => setActiveTab('actions')}
            >
              My Action Items
              {myActions.filter(a => a.status !== 'completed').length > 0 && (
                <span className="badge bg-danger ms-2">
                  {myActions.filter(a => a.status !== 'completed').length}
                </span>
              )}
            </button>
          </li>
          <li className="nav-item ms-auto">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowCreateModal(true)}
            >
              <i className="fas fa-plus me-2"></i>
              Schedule Meeting
            </button>
          </li>
        </ul>

        {/* Content */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : activeTab === 'actions' ? (
          <div className="row">
            {myActions.length === 0 ? (
              <div className="col-12">
                <div className="text-center py-5">
                  <i className="fas fa-check-circle text-muted fa-3x mb-3"></i>
                  <h5 className="text-muted">No action items</h5>
                  <p className="text-muted">You're all caught up! No pending action items.</p>
                </div>
              </div>
            ) : (
              myActions.map(action => (
                <div key={action.id} className="col-md-6 mb-3">
                  <div className={clsx('card', {
                    'border-danger': isOverdue(action.dueDate, action.status)
                  })}>
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="card-title mb-0">{action.title}</h6>
                        <span className={`badge ${getActionStatusBadge(action.status)}`}>
                          {action.status}
                        </span>
                      </div>
                      {action.description && (
                        <p className="text-muted small mb-2">{action.description}</p>
                      )}
                      <p className="small mb-2">
                        <i className="fas fa-calendar me-1"></i>
                        Due: {new Date(action.dueDate).toLocaleDateString()}
                        {isOverdue(action.dueDate, action.status) && (
                          <span className="text-danger ms-2">
                            <i className="fas fa-exclamation-circle"></i> Overdue
                          </span>
                        )}
                      </p>
                      <p className="small mb-3">
                        <i className="fas fa-users me-1"></i>
                        From: {action.meetingTitle}
                      </p>
                      <div className="btn-group btn-group-sm w-100" role="group">
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => updateActionStatus(action.id, 'pending')}
                          disabled={action.status === 'pending'}
                        >
                          Pending
                        </button>
                        <button
                          className="btn btn-outline-warning"
                          onClick={() => updateActionStatus(action.id, 'in-progress')}
                          disabled={action.status === 'in-progress'}
                        >
                          In Progress
                        </button>
                        <button
                          className="btn btn-outline-success"
                          onClick={() => updateActionStatus(action.id, 'completed')}
                          disabled={action.status === 'completed'}
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="row">
            {meetings.length === 0 ? (
              <div className="col-12">
                <div className="text-center py-5">
                  <i className="fas fa-calendar text-muted fa-3x mb-3"></i>
                  <h5 className="text-muted">No {activeTab} meetings</h5>
                  <p className="text-muted">
                    {activeTab === 'upcoming' 
                      ? 'No upcoming meetings scheduled. Create a new meeting to get started!' 
                      : 'No past meetings found.'}
                  </p>
                </div>
              </div>
            ) : (
              meetings.map(meeting => (
                <div key={meeting.id} className="col-md-6 mb-4">
                  <div 
                    className="card meeting-card h-100"
                    onClick={() => loadMeetingDetails(meeting.id)}
                  >
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h5 className="card-title">{meeting.title}</h5>
                        <span className={clsx('badge', {
                          'bg-primary': meeting.status === 'scheduled',
                          'bg-warning': meeting.status === 'in-progress',
                          'bg-success': meeting.status === 'completed'
                        })}>
                          {meeting.status}
                        </span>
                      </div>
                      
                      {meeting.decidedTime ? (
                        <p className="text-muted mb-2">
                          <i className="fas fa-clock me-1"></i>
                          {formatMeetingTime(meeting.decidedTime, meeting.duration)}
                        </p>
                      ) : (
                        <p className="text-warning mb-2">
                          <i className="fas fa-clock me-1"></i>
                          Time not selected
                        </p>
                      )}
                      
                      <p className="small mb-2">
                        <i className="fas fa-users me-1"></i>
                        {meeting.attendeeNames?.slice(0, 3).join(', ')}
                        {meeting.attendeeNames && meeting.attendeeNames.length > 3 && 
                          ` +${meeting.attendeeNames.length - 3} more`}
                      </p>
                      
                      {meeting.agendaItems.length > 0 && (
                        <div className="agenda-preview">
                          <p className="small text-muted mb-1">Agenda:</p>
                          <ul className="small mb-0">
                            {meeting.agendaItems.slice(0, 2).map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                            {meeting.agendaItems.length > 2 && (
                              <li className="text-muted">+{meeting.agendaItems.length - 2} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Meeting Details Modal */}
        {selectedMeeting && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{selectedMeeting.title}</h5>
                  <button
                    className="btn-close"
                    onClick={() => setSelectedMeeting(null)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-8">
                      {/* Meeting Info */}
                      <div className="mb-4">
                        <h6>Meeting Details</h6>
                        <p className="mb-2">
                          <strong>Type:</strong> {meetingTypes.find(t => t.value === selectedMeeting.type)?.label}
                        </p>
                        <p className="mb-2">
                          <strong>Duration:</strong> {selectedMeeting.duration} minutes
                        </p>
                        <p className="mb-2">
                          <strong>Status:</strong> 
                          <span className={clsx('badge ms-2', {
                            'bg-primary': selectedMeeting.status === 'scheduled',
                            'bg-warning': selectedMeeting.status === 'in-progress',
                            'bg-success': selectedMeeting.status === 'completed'
                          })}>
                            {selectedMeeting.status}
                          </span>
                        </p>
                      </div>

                      {/* Time Selection */}
                      {!selectedMeeting.decidedTime && selectedMeeting.proposedTimes && (
                        <div className="mb-4">
                          <h6>Select Meeting Time</h6>
                          <div className="list-group">
                            {selectedMeeting.proposedTimes.map((time, i) => (
                              <button
                                key={i}
                                className="list-group-item list-group-item-action"
                                onClick={() => selectMeetingTime(selectedMeeting.id, time)}
                              >
                                {formatMeetingTime(time, selectedMeeting.duration)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Decided Time */}
                      {selectedMeeting.decidedTime && (
                        <div className="mb-4">
                          <h6>Scheduled Time</h6>
                          <p className="text-primary">
                            <i className="fas fa-calendar-check me-2"></i>
                            {formatMeetingTime(selectedMeeting.decidedTime, selectedMeeting.duration)}
                          </p>
                        </div>
                      )}

                      {/* Agenda */}
                      <div className="mb-4">
                        <h6>Agenda</h6>
                        <ol>
                          {selectedMeeting.agendaItems.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ol>
                      </div>

                      {/* Action Items */}
                      <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6>Action Items</h6>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => setShowActionModal(true)}
                          >
                            <i className="fas fa-plus"></i> Add
                          </button>
                        </div>
                        {meetingActions.length === 0 ? (
                          <p className="text-muted">No action items yet</p>
                        ) : (
                          <div className="list-group">
                            {meetingActions.map(action => (
                              <div key={action.id} className="list-group-item">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div>
                                    <h6 className="mb-1">{action.title}</h6>
                                    <p className="mb-1 small text-muted">
                                      {action.ownerName} • Due {new Date(action.dueDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <span className={`badge ${getActionStatusBadge(action.status)}`}>
                                    {action.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Attendees */}
                    <div className="col-md-4">
                      <div className="card">
                        <div className="card-body">
                          <h6>Attendees</h6>
                          <div className="attendee-list">
                            {selectedMeeting.attendeeNames?.map((name, i) => (
                              <div key={i} className="d-flex align-items-center mb-2">
                                <div className="avatar-circle me-2">
                                  {name.charAt(0)}
                                </div>
                                <span className="small">{name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Meeting Modal */}
        {showCreateModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Schedule Meeting</h5>
                  <button
                    className="btn-close"
                    onClick={() => setShowCreateModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Meeting Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Meeting Type</label>
                    <select
                      className="form-select"
                      value={meetingType}
                      onChange={(e) => setMeetingType(e.target.value)}
                    >
                      {meetingTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Duration (minutes)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      min="15"
                      max="480"
                      step="15"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Attendees</label>
                    <div className="text-muted small mb-2">Select attendees for the meeting</div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {availableUsers.length > 0 ? (
                        availableUsers.map(availableUser => (
                          <div key={availableUser.id} className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`user-${availableUser.id}`}
                              checked={selectedAttendees.includes(availableUser.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAttendees([...selectedAttendees, availableUser.id]);
                                } else {
                                  setSelectedAttendees(selectedAttendees.filter(id => id !== availableUser.id));
                                }
                              }}
                            />
                            <label className="form-check-label" htmlFor={`user-${availableUser.id}`}>
                              {availableUser.name}
                              <span className="text-muted ms-2 small">({availableUser.email})</span>
                            </label>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted">Loading users...</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetMeetingForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={createMeeting}
                    disabled={loading || !meetingTitle.trim() || selectedAttendees.length === 0}
                  >
                    {loading ? 'Creating...' : 'Create Meeting'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Action Item Modal */}
        {showActionModal && selectedMeeting && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add Action Item</h5>
                  <button
                    className="btn-close"
                    onClick={() => setShowActionModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={actionTitle}
                      onChange={(e) => setActionTitle(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description (optional)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={actionDescription}
                      onChange={(e) => setActionDescription(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Owner</label>
                    <select
                      className="form-select"
                      value={actionOwner}
                      onChange={(e) => setActionOwner(e.target.value)}
                    >
                      <option value="">Select owner</option>
                      {selectedMeeting.attendees.map(attendeeId => {
                        const name = selectedMeeting.attendeeNames?.[
                          selectedMeeting.attendees.indexOf(attendeeId)
                        ] || attendeeId;
                        return (
                          <option key={attendeeId} value={attendeeId}>{name}</option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Due Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={actionDueDate}
                      onChange={(e) => setActionDueDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowActionModal(false);
                      resetActionForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={createActionItem}
                  >
                    Create Action
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .meetingmind-container {
          padding: 20px;
        }

        .meeting-card {
          cursor: pointer;
          transition: all 0.3s;
        }

        .meeting-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .agenda-preview {
          background-color: #f8f9fa;
          padding: 10px;
          border-radius: 5px;
        }

        .attendee-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .avatar-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: var(--vc-primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
        }
      `}</style>
    </AppLayout>
  );
}; 
