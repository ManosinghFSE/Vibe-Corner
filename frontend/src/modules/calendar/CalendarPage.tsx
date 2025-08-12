import React, { useState, useEffect } from 'react';
import { AppLayout } from '../layout/AppLayout';
import { useAuth } from '../auth/AuthContext';
import './Calendar.css';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'meeting' | 'activity' | 'deadline' | 'birthday' | 'holiday' | 'team-event';
  description?: string;
  participants?: string[];
  location?: string;
  color: string;
  icon: string;
  isRecurring?: boolean;
  reminder?: boolean;
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarPage: React.FC = () => {
  const { getAuthHeader } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['all']);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [animations, setAnimations] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  useEffect(() => {
    filterEvents();
  }, [events, selectedTypes]);

  async function fetchEvents() {
    try {
      setLoading(true);
      
      // Fetch birthdays and holidays from recommendations
      const recRes = await fetch('/api/recommendations/events?days=365', {
        headers: getAuthHeader()
      });
      const recData = await recRes.json();
      
      // Transform recommendation events to calendar events
      const calendarEvents: CalendarEvent[] = [];
      
      recData.events?.forEach((event: any) => {
        if (event.type === 'birthday') {
          calendarEvents.push({
            id: `birthday-${event.person.id}-${event.date}`,
            title: event.name,
            date: new Date(event.date),
            type: 'birthday',
            description: `${event.person.name} turns ${event.age}!`,
            color: '#ff6b9d',
            icon: '🎂',
            isRecurring: true,
            reminder: true
          });
        } else if (event.type === 'holiday') {
          calendarEvents.push({
            id: `holiday-${event.name}-${event.date}`,
            title: event.name,
            date: new Date(event.date),
            type: 'holiday',
            description: `${event.holidayType} holiday`,
            color: '#48dbfb',
            icon: '🎉',
            reminder: true
          });
        }
      });
      
      // Add some mock team events
      const mockTeamEvents = [
        {
          id: 'team-1',
          title: 'Team Building Activity',
          date: addDays(new Date(), 7),
          type: 'team-event' as const,
          description: 'Quarterly team building at Adventure Park',
          participants: ['John', 'Sarah', 'Mike'],
          location: 'Adventure Park',
          color: '#00d2d3',
          icon: '🎯'
        },
        {
          id: 'meeting-1',
          title: 'Sprint Planning',
          date: addDays(new Date(), 2),
          type: 'meeting' as const,
          description: 'Plan next sprint activities',
          participants: ['Team Lead', 'Dev Team'],
          color: '#54a0ff',
          icon: '📅'
        },
        {
          id: 'deadline-1',
          title: 'Project Deadline',
          date: addDays(new Date(), 14),
          type: 'deadline' as const,
          description: 'Final submission for Q4 project',
          color: '#ee5a6f',
          icon: '⏰',
          reminder: true
        }
      ];
      
      setEvents([...calendarEvents, ...mockTeamEvents]);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterEvents() {
    if (selectedTypes.includes('all')) {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter(event => selectedTypes.includes(event.type)));
    }
  }

  function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function getFirstDayOfMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  }

  function getEventsForDate(date: Date): CalendarEvent[] {
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  }

  function navigateMonth(direction: number) {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  }

  function handleDateClick(date: Date) {
    setSelectedDate(date);
    const dayEvents = getEventsForDate(date);
    if (dayEvents.length > 0) {
      setSelectedEvent(dayEvents[0]);
      setShowEventDetails(true);
    }
  }

  function toggleType(type: string) {
    if (type === 'all') {
      setSelectedTypes(['all']);
    } else {
      const newTypes = selectedTypes.filter(t => t !== 'all');
      if (selectedTypes.includes(type)) {
        const filtered = newTypes.filter(t => t !== type);
        setSelectedTypes(filtered.length > 0 ? filtered : ['all']);
      } else {
        setSelectedTypes([...newTypes, type]);
      }
    }
  }

  function renderMonthView() {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-cell empty"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = isDateToday(date);
      const isSelected = selectedDate && isSameDate(date, selectedDate);
      
      days.push(
        <div
          key={day}
          className={`calendar-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
          onClick={() => handleDateClick(date)}
        >
          <div className="cell-date">{day}</div>
          {dayEvents.length > 0 && (
            <div className="cell-events">
              {dayEvents.slice(0, 3).map((event, index) => (
                <div
                  key={event.id}
                  className="cell-event"
                  style={{ backgroundColor: event.color }}
                  title={event.title}
                >
                  <span className="event-icon">{event.icon}</span>
                  <span className="event-title">{event.title}</span>
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="more-events">+{dayEvents.length - 3} more</div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    return days;
  }

  function isDateToday(date: Date): boolean {
    const today = new Date();
    return isSameDate(date, today);
  }

  function isSameDate(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  const eventTypes = [
    { id: 'all', label: 'All Events', icon: '📋', color: '#6c757d' },
    { id: 'birthday', label: 'Birthdays', icon: '🎂', color: '#ff6b9d' },
    { id: 'holiday', label: 'Holidays', icon: '🎉', color: '#48dbfb' },
    { id: 'meeting', label: 'Meetings', icon: '📅', color: '#54a0ff' },
    { id: 'team-event', label: 'Team Events', icon: '🎯', color: '#00d2d3' },
    { id: 'deadline', label: 'Deadlines', icon: '⏰', color: '#ee5a6f' }
  ];

  return (
    <AppLayout>
      <div className={`calendar-container ${animations ? 'animations-on' : ''}`}>
        <div className="calendar-header animate__animated animate__fadeInDown">
          <h1>
            <span className="header-icon">📅</span>
            Team Calendar
          </h1>
          <div className="header-actions">
            <button
              className="btn btn-outline-primary"
              onClick={() => setAnimations(!animations)}
            >
              {animations ? '🎭 Animations On' : '🎭 Animations Off'}
            </button>
          </div>
        </div>

        {/* Event Type Filters */}
        <div className="event-filters animate__animated animate__fadeIn">
          {eventTypes.map((type, index) => (
            <button
              key={type.id}
              className={`filter-chip ${selectedTypes.includes(type.id) ? 'active' : ''}`}
              onClick={() => toggleType(type.id)}
              style={{ 
                animationDelay: `${index * 0.1}s`,
                backgroundColor: selectedTypes.includes(type.id) ? type.color : 'transparent',
                borderColor: type.color
              }}
            >
              <span className="chip-icon">{type.icon}</span>
              <span className="chip-label">{type.label}</span>
              {type.id !== 'all' && (
                <span className="chip-count">
                  {events.filter(e => e.type === type.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="calendar-content">
          {/* Calendar Navigation */}
          <div className="calendar-nav animate__animated animate__fadeInLeft">
            <button
              className="nav-btn"
              onClick={() => navigateMonth(-1)}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <h2 className="current-month">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              className="nav-btn"
              onClick={() => navigateMonth(1)}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          {/* View Mode Selector */}
          <div className="view-modes animate__animated animate__fadeInRight">
            {['month', 'week', 'day', 'list'].map(mode => (
              <button
                key={mode}
                className={`view-btn ${viewMode === mode ? 'active' : ''}`}
                onClick={() => setViewMode(mode as any)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="calendar-loading">
              <div className="loading-spinner"></div>
              <p>Loading calendar events...</p>
            </div>
          ) : (
            <>
              {viewMode === 'month' && (
                <div className="calendar-grid animate__animated animate__fadeIn">
                  <div className="weekdays">
                    {weekDays.map(day => (
                      <div key={day} className="weekday">{day}</div>
                    ))}
                  </div>
                  <div className="days-grid">
                    {renderMonthView()}
                  </div>
                </div>
              )}

              {viewMode === 'list' && (
                <div className="events-list animate__animated animate__fadeIn">
                  {filteredEvents
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((event, index) => (
                      <div
                        key={event.id}
                        className="event-list-item animate__animated animate__fadeInUp"
                        style={{ animationDelay: `${index * 0.05}s` }}
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowEventDetails(true);
                        }}
                      >
                        <div 
                          className="event-date-block"
                          style={{ backgroundColor: event.color }}
                        >
                          <div className="event-day">
                            {new Date(event.date).getDate()}
                          </div>
                          <div className="event-month">
                            {months[new Date(event.date).getMonth()].slice(0, 3)}
                          </div>
                        </div>
                        <div className="event-details">
                          <h4 className="event-title">
                            <span className="event-icon">{event.icon}</span>
                            {event.title}
                          </h4>
                          {event.description && (
                            <p className="event-description">{event.description}</p>
                          )}
                          <div className="event-meta">
                            {event.location && (
                              <span className="meta-item">
                                <i className="fas fa-map-marker-alt"></i> {event.location}
                              </span>
                            )}
                            {event.participants && (
                              <span className="meta-item">
                                <i className="fas fa-users"></i> {event.participants.length} participants
                              </span>
                            )}
                            {event.reminder && (
                              <span className="meta-item reminder">
                                <i className="fas fa-bell"></i> Reminder set
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Event Details Modal */}
        {showEventDetails && selectedEvent && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered animate__animated animate__zoomIn">
              <div className="modal-content">
                <div 
                  className="modal-header"
                  style={{ backgroundColor: selectedEvent.color, color: 'white' }}
                >
                  <h5 className="modal-title">
                    <span className="me-2">{selectedEvent.icon}</span>
                    {selectedEvent.title}
                  </h5>
                  <button
                    className="btn-close btn-close-white"
                    onClick={() => setShowEventDetails(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="event-detail-row">
                    <i className="fas fa-calendar"></i>
                    <span>{new Date(selectedEvent.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                  {selectedEvent.description && (
                    <div className="event-detail-row">
                      <i className="fas fa-info-circle"></i>
                      <span>{selectedEvent.description}</span>
                    </div>
                  )}
                  {selectedEvent.location && (
                    <div className="event-detail-row">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}
                  {selectedEvent.participants && (
                    <div className="event-detail-row">
                      <i className="fas fa-users"></i>
                      <div className="participants-list">
                        {selectedEvent.participants.map((p, i) => (
                          <span key={i} className="participant-chip">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedEvent.isRecurring && (
                    <div className="event-detail-row">
                      <i className="fas fa-sync"></i>
                      <span>This event repeats yearly</span>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowEventDetails(false)}
                  >
                    Close
                  </button>
                  {selectedEvent.type === 'birthday' && (
                    <button className="btn btn-primary">
                      <i className="fas fa-gift"></i> Plan Celebration
                    </button>
                  )}
                  {selectedEvent.type === 'meeting' && (
                    <button className="btn btn-primary">
                      <i className="fas fa-video"></i> Join Meeting
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}; 
