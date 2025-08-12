import React, { useState, useEffect } from 'react';
import { AppLayout } from '../layout/AppLayout';
import { useAuth } from '../auth/AuthContext';
import clsx from 'clsx';

interface Event {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  location: string;
  organizerId: string;
  organizerName: string;
  capacity: number;
  tags: string[];
  isVirtual?: boolean;
  imageUrl?: string;
  attendeeCount: number;
  userRsvpStatus: 'yes' | 'no' | 'maybe' | null;
  spotsLeft: number;
  isFull: boolean;
}

interface EventDetails extends Event {
  rsvpCounts: {
    yes: number;
    no: number;
    maybe: number;
  };
  attendees?: Array<{
    userId: string;
    userName: string;
    rsvpDate: string;
  }>;
}

export const EventGridPage: React.FC = () => {
  const { getAuthHeader, user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
  const [filterTag, setFilterTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form states for creating event
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventCapacity, setEventCapacity] = useState('50');
  const [eventTags, setEventTags] = useState<string[]>([]);
  const [isVirtual, setIsVirtual] = useState(false);

  const availableTags = [
    'tech-talk', 'team-building', 'training', 'social', 'all-hands',
    'workshop', 'hackathon', 'celebration', 'wellness', 'leadership'
  ];

  useEffect(() => {
    fetchEvents();
  }, [filterTag, searchQuery, showPastEvents]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (!showPastEvents) {
        params.append('from', new Date().toISOString());
      }
      if (filterTag) params.append('tag', filterTag);
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await fetch(`/api/eventgrid/events?${params}`, {
        headers: getAuthHeader()
      });
      
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data.events);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadEventDetails(eventId: string) {
    try {
      const res = await fetch(`/api/eventgrid/events/${eventId}`, {
        headers: getAuthHeader()
      });
      
      if (!res.ok) throw new Error('Failed to load event details');
      const data = await res.json();
      setSelectedEvent(data.event);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleRsvp(eventId: string, status: 'yes' | 'no' | 'maybe') {
    try {
      const res = await fetch(`/api/eventgrid/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to RSVP');
      }
      
      const data = await res.json();
      
      // Merge summary into the existing event to avoid losing fields (startAt, endAt, etc.)
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...data.event } : e));
      
      // Update selected event if open
      if (selectedEvent?.id === eventId) {
        // Merge as well to preserve details already loaded
        setSelectedEvent({ ...selectedEvent, ...data.event } as any);
        // Optionally reload full details
        loadEventDetails(eventId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function createEvent() {
    if (!eventTitle || !eventDate || !eventStartTime || !eventEndTime || !eventLocation) {
      alert('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const startAt = new Date(`${eventDate}T${eventStartTime}`).toISOString();
      const endAt = new Date(`${eventDate}T${eventEndTime}`).toISOString();
      
      const res = await fetch('/api/eventgrid/events', {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTitle,
          description: eventDescription,
          startAt,
          endAt,
          location: eventLocation,
          capacity: parseInt(eventCapacity),
          tags: eventTags,
          isVirtual
        })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create event');
      }
      
      setShowCreateModal(false);
      resetForm();
      fetchEvents();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadCalendar(eventId: string) {
    try {
      const res = await fetch(`/api/eventgrid/events/${eventId}/calendar`, {
        headers: getAuthHeader()
      });
      
      if (!res.ok) throw new Error('Failed to download calendar');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event-${eventId}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message);
    }
  }

  function resetForm() {
    setEventTitle('');
    setEventDescription('');
    setEventDate('');
    setEventStartTime('');
    setEventEndTime('');
    setEventLocation('');
    setEventCapacity('50');
    setEventTags([]);
    setIsVirtual(false);
  }

  function formatEventDate(startAt: string, endAt: string) {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (!startAt || isNaN(start.getTime()) || !endAt || isNaN(end.getTime())) {
      return 'TBD';
    }
    const dateOptions: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    };
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: 'numeric', 
      minute: '2-digit' 
    };
    
    const dateStr = start.toLocaleDateString('en-US', dateOptions);
    const startTime = start.toLocaleTimeString('en-US', timeOptions);
    const endTime = end.toLocaleTimeString('en-US', timeOptions);
    
    return `${dateStr} • ${startTime} - ${endTime}`;
  }

  function getRsvpButton(event: Event) {
    if (event.isFull && event.userRsvpStatus !== 'yes') {
      return (
        <button className="btn btn-secondary btn-sm" disabled>
          <i className="fas fa-ban me-1"></i> Full
        </button>
      );
    }
    
    if (event.userRsvpStatus === 'yes') {
      return (
        <button 
          className="btn btn-success btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            handleRsvp(event.id, 'no');
          }}
        >
          <i className="fas fa-check me-1"></i> Going
        </button>
      );
    }
    
    return (
      <button 
        className="btn btn-primary btn-sm"
        onClick={(e) => {
          e.stopPropagation();
          handleRsvp(event.id, 'yes');
        }}
      >
        <i className="fas fa-calendar-plus me-1"></i> RSVP
      </button>
    );
  }

  // Group events by date for calendar view
  const eventsByDate = events
    .filter(e => e.startAt && !isNaN(new Date(e.startAt).getTime()))
    .reduce((acc, event) => {
      const date = new Date(event.startAt).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
      return acc;
    }, {} as Record<string, Event[]>);

  return (
    <AppLayout title="Event Grid">
      <div className="eventgrid-container">
        {error && (
          <div className="alert alert-danger mb-3">{error}</div>
        )}

        {/* Header Controls */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-search"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-2">
            <select
              className="form-select"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
            >
              <option value="">All Tags</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <div className="form-check form-switch mt-2">
              <input
                className="form-check-input"
                type="checkbox"
                id="showPast"
                checked={showPastEvents}
                onChange={(e) => setShowPastEvents(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="showPast">
                Show Past
              </label>
            </div>
          </div>
          <div className="col-md-2">
            <div className="btn-group w-100" role="group">
              <button
                className={clsx('btn', viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary')}
                onClick={() => setViewMode('grid')}
              >
                <i className="fas fa-th"></i>
              </button>
              <button
                className={clsx('btn', viewMode === 'calendar' ? 'btn-primary' : 'btn-outline-primary')}
                onClick={() => setViewMode('calendar')}
              >
                <i className="fas fa-calendar"></i>
              </button>
              {user?.role !== 'user' && (
                <button
                  className="btn btn-success"
                  onClick={() => setShowCreateModal(true)}
                >
                  <i className="fas fa-plus"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Events Display */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="row">
            {events.map(event => (
              <div key={event.id} className="col-md-4 mb-4">
                <div 
                  className="card event-card h-100 animate__animated animate__fadeIn"
                  onClick={() => loadEventDetails(event.id)}
                >
                  {event.imageUrl && (
                    <div className="event-image" style={{ 
                      backgroundImage: `url(${event.imageUrl})`,
                      height: '150px',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}>
                      <div className="event-tags">
                        {event.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="badge bg-dark me-1">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="card-body">
                    <h5 className="card-title">{event.title || 'Untitled Event'}</h5>
                    <p className="text-muted small mb-2">
                      <i className="fas fa-clock me-1"></i>
                      {formatEventDate(event.startAt, event.endAt)}
                    </p>
                    <p className="text-muted small mb-2">
                      <i className="fas fa-map-marker-alt me-1"></i>
                      {event.location || 'TBD'}
                      {event.isVirtual && <span className="badge bg-info ms-2">Virtual</span>}
                    </p>
                    <p className="card-text small">{event.description}</p>
                    
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div className="text-muted small">
                        <i className="fas fa-users me-1"></i>
                        {(event.attendeeCount ?? 0)}/{(event.capacity ?? 0)}
                      </div>
                      {getRsvpButton(event)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="calendar-view">
            {Object.entries(eventsByDate).map(([date, dayEvents]) => (
              <div key={date} className="calendar-day mb-4">
                <h5 className="mb-3">{date}</h5>
                <div className="list-group">
                  {dayEvents.map(event => (
                    <div 
                      key={event.id}
                      className="list-group-item list-group-item-action"
                      onClick={() => loadEventDetails(event.id)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{event.title}</h6>
                          <p className="mb-1 small text-muted">
                            {new Date(event.startAt).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit' 
                            })} - {event.location}
                          </p>
                          <div>
                            {event.tags.map(tag => (
                              <span key={tag} className="badge bg-secondary me-1">{tag}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="mb-2">
                            <span className="text-muted small">
                              {event.attendeeCount}/{event.capacity}
                            </span>
                          </div>
                          {getRsvpButton(event)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {events.length === 0 && !loading && (
          <div className="text-center py-5">
            <i className="fas fa-calendar-times fa-4x text-muted mb-3"></i>
            <h5>No events found</h5>
            <p className="text-muted">Try adjusting your filters or search terms</p>
          </div>
        )}

        {/* Event Details Modal */}
        {selectedEvent && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{selectedEvent.title}</h5>
                  <button
                    className="btn-close"
                    onClick={() => setSelectedEvent(null)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-8">
                      <p>{selectedEvent.description}</p>
                      
                      <div className="event-details mt-4">
                        <div className="mb-3">
                          <i className="fas fa-clock me-2"></i>
                          <strong>When:</strong> {formatEventDate(selectedEvent.startAt, selectedEvent.endAt)}
                        </div>
                        <div className="mb-3">
                          <i className="fas fa-map-marker-alt me-2"></i>
                          <strong>Where:</strong> {selectedEvent.location}
                          {selectedEvent.isVirtual && <span className="badge bg-info ms-2">Virtual</span>}
                        </div>
                        <div className="mb-3">
                          <i className="fas fa-user me-2"></i>
                          <strong>Organizer:</strong> {selectedEvent.organizerName}
                        </div>
                        <div className="mb-3">
                          <i className="fas fa-tags me-2"></i>
                          <strong>Tags:</strong> {selectedEvent.tags.map(tag => (
                            <span key={tag} className="badge bg-secondary me-1">{tag}</span>
                          ))}
                        </div>
                      </div>

                      {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                        <div className="mt-4">
                          <h6>Attendees ({selectedEvent.rsvpCounts.yes})</h6>
                          <div className="attendee-list">
                            {selectedEvent.attendees.map(attendee => (
                              <span key={attendee.userId} className="badge bg-light text-dark me-1 mb-1">
                                {attendee.userName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="col-md-4">
                      <div className="card">
                        <div className="card-body">
                          <h6>RSVP Status</h6>
                          <div className="mb-3">
                            <div className="progress mb-2" style={{ height: '25px' }}>
                              <div 
                                className="progress-bar bg-success"
                                style={{ width: `${(selectedEvent.attendeeCount / selectedEvent.capacity) * 100}%` }}
                              >
                                {selectedEvent.attendeeCount} Going
                              </div>
                            </div>
                            <small className="text-muted">
                              {selectedEvent.spotsLeft} spots remaining
                            </small>
                          </div>
                          
                          <div className="d-grid gap-2">
                            <button
                              className={clsx('btn', {
                                'btn-outline-success': selectedEvent.userRsvpStatus === 'yes',
                                'btn-success': selectedEvent.userRsvpStatus !== 'yes'
                              })}
                              onClick={() => handleRsvp(selectedEvent.id, 'yes')}
                              disabled={selectedEvent.isFull && selectedEvent.userRsvpStatus !== 'yes'}
                            >
                              <i className="fas fa-check me-2"></i>
                              {selectedEvent.userRsvpStatus === 'yes' ? 'Going' : 'Yes, I\'ll attend'}
                            </button>
                            <button
                              className={clsx('btn', {
                                'btn-outline-warning': selectedEvent.userRsvpStatus === 'maybe',
                                'btn-outline-secondary': selectedEvent.userRsvpStatus !== 'maybe'
                              })}
                              onClick={() => handleRsvp(selectedEvent.id, 'maybe')}
                            >
                              <i className="fas fa-question me-2"></i>
                              Maybe
                            </button>
                            <button
                              className={clsx('btn', {
                                'btn-outline-danger': selectedEvent.userRsvpStatus === 'no',
                                'btn-outline-secondary': selectedEvent.userRsvpStatus !== 'no'
                              })}
                              onClick={() => handleRsvp(selectedEvent.id, 'no')}
                            >
                              <i className="fas fa-times me-2"></i>
                              Can't make it
                            </button>
                          </div>
                          
                          <hr />
                          
                          <button
                            className="btn btn-outline-primary btn-sm w-100"
                            onClick={() => downloadCalendar(selectedEvent.id)}
                          >
                            <i className="fas fa-download me-2"></i>
                            Add to Calendar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Event Modal */}
        {showCreateModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Create Event</h5>
                  <button
                    className="btn-close"
                    onClick={() => setShowCreateModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-12 mb-3">
                      <label className="form-label">Event Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="Team Building: Escape Room"
                      />
                    </div>
                    <div className="col-md-12 mb-3">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        placeholder="Join us for an exciting team building event..."
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Start Time *</label>
                      <input
                        type="time"
                        className="form-control"
                        value={eventStartTime}
                        onChange={(e) => setEventStartTime(e.target.value)}
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">End Time *</label>
                      <input
                        type="time"
                        className="form-control"
                        value={eventEndTime}
                        onChange={(e) => setEventEndTime(e.target.value)}
                      />
                    </div>
                    <div className="col-md-8 mb-3">
                      <label className="form-label">Location *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="Conference Room A"
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Capacity *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={eventCapacity}
                        onChange={(e) => setEventCapacity(e.target.value)}
                        min="1"
                      />
                    </div>
                    <div className="col-md-12 mb-3">
                      <label className="form-label">Tags</label>
                      <div className="tag-selector">
                        {availableTags.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            className={clsx('btn btn-sm me-2 mb-2', {
                              'btn-primary': eventTags.includes(tag),
                              'btn-outline-primary': !eventTags.includes(tag)
                            })}
                            onClick={() => {
                              if (eventTags.includes(tag)) {
                                setEventTags(eventTags.filter(t => t !== tag));
                              } else {
                                setEventTags([...eventTags, tag]);
                              }
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="col-md-12 mb-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="isVirtual"
                          checked={isVirtual}
                          onChange={(e) => setIsVirtual(e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="isVirtual">
                          This is a virtual event
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={createEvent}
                    disabled={loading}
                  >
                    Create Event
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .eventgrid-container {
          padding: 20px;
        }

        .event-card {
          cursor: pointer;
          transition: all 0.3s;
          overflow: hidden;
        }

        .event-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }

        .event-image {
          position: relative;
        }

        .event-tags {
          position: absolute;
          top: 10px;
          left: 10px;
        }

        .attendee-list {
          max-height: 100px;
          overflow-y: auto;
        }

        .calendar-view .list-group-item {
          cursor: pointer;
        }

        .calendar-view .list-group-item:hover {
          background-color: var(--vc-hover);
        }

        .tag-selector {
          display: flex;
          flex-wrap: wrap;
        }
      `}</style>
    </AppLayout>
  );
}; 
