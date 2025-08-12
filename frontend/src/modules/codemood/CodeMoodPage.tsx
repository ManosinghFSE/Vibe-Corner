import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from '../layout/AppLayout';
import { useAuth } from '../auth/AuthContext';
import './CodeMood.css';

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: string;
  actionable: boolean;
  action?: {
    label: string;
    url: string;
  };
  metadata: {
    category: string;
    animated: boolean;
  };
}

export const CodeMoodPage: React.FC = () => {
  const { getAuthHeader } = useAuth();
  const [moodData, setMoodData] = useState<any>(null);
  const [teamData, setTeamData] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedMood, setSelectedMood] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const moodSelectorRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const teamStatsRef = useRef<HTMLDivElement>(null);
  const trendsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!loading) {
      // Page is ready
    }
  }, [loading]);

  const animateNotifications = () => {
    if (notificationsRef.current) {
      const notifItems = notificationsRef.current.querySelectorAll('.notification-item');
      
      // Simple notification display
    }
  };

  useEffect(() => {
    animateNotifications();
  }, [showNotifications, notifications]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [moodRes, teamRes, notifRes] = await Promise.all([
        fetch('/api/codemood/mood', { headers: getAuthHeader() }),
        fetch('/api/codemood/team', { headers: getAuthHeader() }),
        fetch('/api/codemood/notifications?limit=20', { headers: getAuthHeader() })
      ]);
      
      const [mood, team, notif] = await Promise.all([
        moodRes.json(),
        teamRes.json(),
        notifRes.json()
      ]);
      
      // Normalize shapes
      const normalizedTeam = team?.team || team;
      const normalizedMood = mood?.mood || mood;
      setMoodData(normalizedMood);
      setTeamData({
        averageMood: normalizedTeam?.averageMood ?? 0,
        productivity: normalizedTeam?.productivity ?? 0,
        recentMoods: normalizedTeam?.recentMoods ?? []
      });
      setNotifications((notif?.notifications || []).map((n: any, i: number) => ({
        id: String(n.id ?? i + 1),
        type: n.type || 'insight',
        message: n.message || n.title || 'Update',
        timestamp: n.timestamp ? new Date(n.timestamp) : new Date(),
        read: !!n.read,
        priority: n.priority || 'low',
        actionable: !!n.action,
        action: n.action,
        metadata: n.metadata || { category: 'info', animated: false }
      })));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/codemood/notifications?limit=20', {
        headers: getAuthHeader()
      });
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }

  async function submitMood(mood: string) {
    const moodEmojis: { [key: string]: string } = {
      happy: '😊',
      productive: '🚀',
      focused: '🎯',
      stressed: '😰',
      tired: '😴',
      excited: '🎉'
    };

    // Simple visual feedback
    const selectedBtn = document.querySelector(`[data-mood="${mood}"]`);
    if (selectedBtn) {
      // Simple button feedback
    }

    try {
      const res = await fetch('/api/codemood/checkin', {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mood,
          energy: Math.floor(Math.random() * 5) + 1,
          stress: Math.floor(Math.random() * 5) + 1,
          notes: `Feeling ${mood} today!`
        })
      });
      
      if (res.ok) {
        setSelectedMood(mood);
        await fetchData();
        
        // Show emoji feedback
        const emoji = document.createElement('div');
        emoji.innerHTML = moodEmojis[mood] || '😊';
        emoji.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 4rem;
          z-index: 9999;
          pointer-events: none;
        `;
        document.body.appendChild(emoji);
        
        // Simple emoji animation
        setTimeout(() => {
          if (emoji.parentNode) {
            emoji.parentNode.removeChild(emoji);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to submit mood:', error);
    }
  }

  async function markNotificationRead(id: string) {
    try {
      await fetch(`/api/codemood/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getAuthHeader()
      });
      
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
          <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  const moods = ['happy', 'productive', 'focused', 'stressed', 'tired', 'excited'];
  const moodEmojis: { [key: string]: string } = {
    happy: '😊',
    productive: '🚀',
    focused: '🎯',
    stressed: '😰',
    tired: '😴',
    excited: '🎉'
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppLayout>
      <div ref={containerRef} className="codemood-container">
        <div className="container-fluid">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="display-6">CodeMood - Team Sentiment Tracker</h1>
            <button
              className="btn btn-primary position-relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <i className="fas fa-bell"></i>
              {unreadCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {unreadCount}
                  <span className="visually-hidden">unread notifications</span>
                </span>
              )}
            </button>
          </div>

          {/* Notifications Panel */}
          {showNotifications && (
            <div ref={notificationsRef} className="notifications-panel mb-4">
              <div className="card shadow">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Notifications</h5>
                  <button 
                    className="btn-close" 
                    onClick={() => setShowNotifications(false)}
                  ></button>
                </div>
                <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <p className="text-muted text-center">No notifications</p>
                  ) : (
                    notifications.map((notif, index) => (
                      <div 
                        key={notif.id} 
                        className={`notification-item d-flex align-items-start p-3 mb-2 rounded ${
                          notif.read ? 'bg-light' : 'bg-info bg-opacity-10'
                        }`}
                        onClick={() => !notif.read && markNotificationRead(notif.id)}
                        style={{ cursor: notif.read ? 'default' : 'pointer' }}
                      >
                        <div className="notif-badge me-3">
                          {notif.type === 'achievement' && '🏆'}
                          {notif.type === 'mood_change' && '📊'}
                          {notif.type === 'insight' && '💡'}
                          {notif.type === 'reminder' && '⏰'}
                          {notif.type === 'social' && '👥'}
                        </div>
                        <div className="flex-grow-1">
                          <p className="mb-1">{notif.message}</p>
                          <small className="text-muted">
                            {new Date(notif.timestamp).toLocaleString()}
                          </small>
                          {notif.actionable && notif.action && (
                            <button className="btn btn-sm btn-primary mt-2">
                              {notif.action.label}
                            </button>
                          )}
                        </div>
                        {!notif.read && (
                          <span className="badge bg-primary">New</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mood Selector */}
          <div ref={moodSelectorRef} className="mood-selector text-center mb-5">
            <h3 className="mb-4">How are you feeling today?</h3>
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              {moods.map(mood => (
                <button
                  key={mood}
                  data-mood={mood}
                  className={`mood-btn btn btn-lg ${
                    selectedMood === mood ? 'btn-primary' : 'btn-outline-primary'
                  }`}
                  onClick={() => submitMood(mood)}
                  style={{ minWidth: '120px' }}
                >
                  <div className="fs-1">{moodEmojis[mood]}</div>
                  <div className="mood-label text-capitalize">{mood}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="row">
            {/* Team Stats */}
            <div className="col-lg-6">
              <div ref={teamStatsRef} className="card shadow mb-4">
                <div className="card-header">
                  <h5 className="mb-0">Team Mood Overview</h5>
                </div>
                <div className="card-body">
                  {teamData && (
                    <div className="team-stats">
                      <div className="row mb-4">
                        <div className="col-6">
                          <div className="stat-card text-center p-3 bg-light rounded">
                            <div className="fs-1">😊</div>
                            <h3 className="text-primary">{teamData.averageMood || 0}%</h3>
                            <p className="mb-0">Team Happiness</p>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="stat-card text-center p-3 bg-light rounded">
                            <div className="fs-1">🚀</div>
                            <h3 className="text-success">{teamData.productivity || 0}%</h3>
                            <p className="mb-0">Productivity</p>
                          </div>
                        </div>
                      </div>
                      
                      <h6>Recent Team Moods</h6>
                      <div className="d-flex justify-content-around">
                        {(teamData.recentMoods || []).map((mood: any, index: number) => (
                          <div key={index} className="text-center">
                            <div className="fs-2">{moodEmojis[mood.mood] || '😊'}</div>
                            <small>{mood.count}</small>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Trends */}
            <div className="col-lg-6">
              <div ref={trendsRef} className="trends-section">
                <h5 className="mb-3">Insights & Trends</h5>
                {[
                  { icon: '📈', title: 'Mood Trend', value: '+12%', desc: 'This week vs last' },
                  { icon: '⚡', title: 'Energy Levels', value: 'High', desc: '85% feeling energetic' },
                  { icon: '🎯', title: 'Focus Score', value: '8.5/10', desc: 'Team average' },
                  { icon: '💡', title: 'Top Insight', value: 'Morning Boost', desc: '9-11 AM most productive' }
                ].map((trend, index) => (
                  <div key={index} className="trend-card card mb-3">
                    <div className="card-body d-flex align-items-center">
                      <div className="fs-2 me-3">{trend.icon}</div>
                      <div className="flex-grow-1">
                        <h6 className="mb-1">{trend.title}</h6>
                        <p className="fs-5 fw-bold mb-0 text-primary">{trend.value}</p>
                        <small className="text-muted">{trend.desc}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}; 
