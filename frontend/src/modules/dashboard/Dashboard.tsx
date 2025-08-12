import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../layout/AppLayout';
import { useAuth } from '../auth/AuthContext';
import './Dashboard.css';

interface Recommendation {
  id: string;
  eventId: string;
  type: 'birthday' | 'holiday';
  title: string;
  description: string;
  date: Date;
  suggestions: any[];
  activities: any[];
  budget: number;
  priority: string;
  animation: string;
}

interface DashboardStats {
  upcomingBirthdays: number;
  plannedActivities: number;
  activeCollaborations: number;
  teamMembers: number;
  upcomingHolidays: number;
  monthlyBudget: number;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    upcomingBirthdays: 0,
    plannedActivities: 0,
    activeCollaborations: 0,
    teamMembers: 0,
    upcomingHolidays: 0,
    monthlyBudget: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [bountyLeaderboard, setBountyLeaderboard] = useState<{ userId: string; name: string; points: number }[]>([]);
  
  // GSAP animation refs
  const containerRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const recommendationsRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  
  // Initialize GSAP animations
  // const { fadeIn, staggerFadeIn, scaleIn, slideIn, hover, pulse } = useGSAPAnimations();

  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
    // fetch bounty leaderboard (best effort)
    (async () => {
      try {
        const res = await fetch('/api/bounty/leaderboard', { headers: getAuthHeader() });
        if (res.ok) {
          const data = await res.json();
          setBountyLeaderboard(data.leaderboard || []);
        }
      } catch {}
    })();
    
    const timer = setTimeout(() => {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
      // Page is ready
    }
  }, [loading]);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      
      const headers = getAuthHeader();
      const requests = [
        fetch('/api/recommendations/dashboard', { headers }),
        fetch('/api/recommendations/events?days=365', { headers }),
        fetch('/api/birthday/upcoming?window=90', { headers }),
        fetch('/api/collaboration/sessions?all=1', { headers }),
        fetch('/api/budget', { headers }),
        fetch('/api/teams/me', { headers })
      ];

      const [recRes, eventsRes, bdayRes, collabRes, budgetRes, teamRes] = await Promise.all(requests);
      const [recData, eventsData, bdayData, collabData, budgetData, teamData] = await Promise.all([
        recRes.json(),
        eventsRes.json(),
        bdayRes.json(),
        collabRes.json(),
        budgetRes.json(),
        teamRes.json()
      ]);

      setRecommendations(recData.recommendations || []);

      const now = new Date();
      const cutoff = new Date();
      cutoff.setDate(now.getDate() + 90);

      const events = Array.isArray(eventsData?.events) ? eventsData.events : [];
      const holidaysInWindow = events.filter((e: any) => e.type === 'holiday' && new Date(e.date) >= now && new Date(e.date) <= cutoff).length;

      const birthdaysUpcoming = recData.upcomingEvents?.filter((e: any) => e.type === 'birthday').length || 0;

      const activeSessions = Array.isArray(collabData?.sessions) ? collabData.sessions.filter((s: any) => s.status !== 'ended').length : 0;

      const resolvedTeamId = teamData?.team?.id;
      let resolvedTeamMembers = teamData?.team?.memberCount || 0;
      if ((!resolvedTeamMembers || resolvedTeamMembers === 0) && resolvedTeamId) {
        try {
          const usersRes = await fetch(`/api/users?teamId=${encodeURIComponent(resolvedTeamId)}`, { headers });
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            if (Array.isArray(usersData?.users)) {
              resolvedTeamMembers = usersData.users.length;
            }
          }
        } catch {}
      }

      const calculated: DashboardStats = {
        upcomingBirthdays: birthdaysUpcoming,
        upcomingHolidays: holidaysInWindow,
        plannedActivities: activeSessions, // align with collaboration sessions
        activeCollaborations: activeSessions,
        teamMembers: resolvedTeamMembers,
        monthlyBudget: Math.floor((budgetData?.summary?.totalSpent || 0) / 12)
      };
      setStats(calculated);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNotifications() {
    // Mock notifications for CodeMood
    const mockNotifications = [
      {
        id: 1,
        type: 'codemood',
        title: 'Team Mood Alert',
        message: 'Your team\'s code sentiment has improved by 15% this week!',
        icon: '😊',
        color: 'success',
        timestamp: new Date()
      },
      {
        id: 2,
        type: 'birthday',
        title: 'Birthday Reminder',
        message: 'John\'s birthday is in 3 days. Plan something special!',
        icon: '🎂',
        color: 'info',
        timestamp: new Date()
      },
      {
        id: 3,
        type: 'budget',
        title: 'Budget Update',
        message: 'You\'ve used 65% of this month\'s team budget',
        icon: '💰',
        color: 'warning',
        timestamp: new Date()
      },
      {
        id: 4,
        type: 'story',
        title: 'New Story Chapter',
        message: 'Your team added a new chapter to "The Great Adventure"',
        icon: '📖',
        color: 'primary',
        timestamp: new Date()
      }
    ];
    setNotifications(mockNotifications);
  }

  const moduleCards = [
    {
      id: 'activity-planner',
      title: 'Activity Planner',
      description: 'Plan team outings and activities',
      icon: '🎯',
      color: 'primary',
      path: '/activity-planner',
      animation: 'pulse'
    },
    {
      id: 'bill-splitter',
      title: 'Bill Splitter',
      description: 'Split expenses fairly',
      icon: '💸',
      color: 'success',
      path: '/billsplitter',
      animation: 'shake'
    },
    {
      id: 'birthday-tracker',
      title: 'Birthday Tracker',
      description: 'Never miss a birthday',
      icon: '🎂',
      color: 'info',
      path: '/birthday',
      animation: 'bounce'
    },
    {
      id: 'budget-manager',
      title: 'Budget Manager',
      description: 'Track team expenses',
      icon: '💰',
      color: 'warning',
      path: '/budget',
      animation: 'rotate'
    },
    {
      id: 'code-mood',
      title: 'Code Mood',
      description: 'Analyze team sentiment',
      icon: '😊',
      color: 'danger',
      path: '/codemood',
      animation: 'flip'
    },
    {
      id: 'story-craft',
      title: 'Story Craft',
      description: 'Build stories together',
      icon: '📚',
      color: 'secondary',
      path: '/storycraft',
      animation: 'slideIn'
    }
  ];

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  }

  function getPriorityColor(priority: string) {
    const colors = {
      urgent: 'danger',
      high: 'warning',
      medium: 'info',
      low: 'secondary'
    };
    return colors[priority as keyof typeof colors] || 'secondary';
  }

  return (
    <AppLayout>
      <div ref={containerRef} className="dashboard-container animate__animated animate__fadeIn">
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="confetti-container">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b'][Math.floor(Math.random() * 5)]
                }}
              />
            ))}
          </div>
        )}

        {/* Welcome Section */}
        <div ref={welcomeRef} className="welcome-section mb-4">
          <h1 className="animate__animated animate__bounceInDown">
            Welcome back, {user?.name}! 🎉
          </h1>
          <p className="text-white animate__animated animate__fadeIn animate__delay-1s">
            Here's what's happening with your team today
          </p>
        </div>

        {/* Notifications Bar */}
        <div ref={notificationsRef} className="notifications-bar mb-4">
          <div className="notifications-scroll">
            {notifications.map((notif, index) => (
              <div
                key={notif.id}
                className={`notification-item animate__animated animate__slideInRight bg-${notif.color}-subtle`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="notification-icon">{notif.icon}</span>
                <div className="notification-content">
                  <strong>{notif.title}</strong>
                  <p className="mb-0 small">{notif.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div ref={statsRef} className="row mb-4">
          <div className="col-md-2 col-sm-6 mb-3">
            <div className="stat-card animate__animated animate__flipInX">
              <div className="stat-icon">🎂</div>
              <div className="stat-value">{stats.upcomingBirthdays}</div>
              <div className="stat-label">Birthdays</div>
            </div>
          </div>
          <div className="col-md-2 col-sm-6 mb-3">
            <div className="stat-card animate__animated animate__flipInX" style={{ animationDelay: '0.1s' }}>
              <div className="stat-icon">🎉</div>
              <div className="stat-value">{stats.upcomingHolidays}</div>
              <div className="stat-label">Holidays</div>
            </div>
          </div>
          <div className="col-md-2 col-sm-6 mb-3">
            <div className="stat-card animate__animated animate__flipInX" style={{ animationDelay: '0.2s' }}>
              <div className="stat-icon">🎯</div>
              <div className="stat-value">{stats.plannedActivities}</div>
              <div className="stat-label">Activities</div>
            </div>
          </div>
          <div className="col-md-2 col-sm-6 mb-3">
            <div className="stat-card animate__animated animate__flipInX" style={{ animationDelay: '0.3s' }}>
              <div className="stat-icon">👥</div>
              <div className="stat-value">{stats.teamMembers}</div>
              <div className="stat-label">Team Size</div>
            </div>
          </div>
          <div className="col-md-2 col-sm-6 mb-3">
            <div className="stat-card animate__animated animate__flipInX" style={{ animationDelay: '0.4s' }}>
              <div className="stat-icon">🤝</div>
              <div className="stat-value">{stats.activeCollaborations}</div>
              <div className="stat-label">Collaborations</div>
            </div>
          </div>
          <div className="col-md-2 col-sm-6 mb-3">
            <div className="stat-card animate__animated animate__flipInX" style={{ animationDelay: '0.5s' }}>
              <div className="stat-icon">💰</div>
              <div className="stat-value">${stats.monthlyBudget}</div>
              <div className="stat-label">Budget</div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* AI Recommendations Section */}
          <div className="col-lg-8">
            <div ref={recommendationsRef} className="recommendations-section">
              <h3 className="mb-4">
                <span className="ai-badge animate__animated animate__pulse animate__infinite">AI</span>
                Smart Recommendations
              </h3>
              
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : recommendations.length > 0 ? (
                <div className="recommendations-grid">
                  {recommendations.map((rec, index) => (
                    <div
                      key={rec.id}
                      className={`recommendation-card animate__animated animate__${rec.animation}`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                      onMouseEnter={() => setActiveCard(rec.id)}
                      onMouseLeave={() => setActiveCard(null)}
                    >
                      <div className={`priority-badge bg-${getPriorityColor(rec.priority)}`}>
                        {rec.priority}
                      </div>
                      
                      <div className="rec-header">
                        <span className="rec-icon">
                          {rec.type === 'birthday' ? '🎂' : '🎉'}
                        </span>
                        <div className="rec-date">{formatDate(rec.date)}</div>
                      </div>
                      
                      <h5 className="rec-title">{rec.title}</h5>
                      <p className="rec-description">{rec.description}</p>
                      
                      <div className="rec-budget">
                        <span className="budget-label">Suggested Budget:</span>
                        <span className="budget-amount">${rec.budget}</span>
                      </div>
                      
                      {activeCard === rec.id && (
                        <div className="rec-details animate__animated animate__fadeIn">
                          <div className="suggestions">
                            <h6>Gift Ideas:</h6>
                            {rec.suggestions.slice(0, 3).map((s, i) => (
                              <div key={i} className="suggestion-item">
                                <span>{s.item}</span>
                                <span className="price">${s.price?.toFixed(0)}</span>
                              </div>
                            ))}
                          </div>
                          
                          <div className="activities mt-3">
                            <h6>Activity Ideas:</h6>
                            {rec.activities.slice(0, 2).map((a, i) => (
                              <div key={i} className="activity-item">
                                {a.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-recommendations">
                  <p>No upcoming events in the next 90 days</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="col-lg-4">
            <div ref={quickActionsRef} className="quick-actions">
              <h3 className="mb-4">Quick Actions</h3>
              <div className="module-cards">
                {moduleCards.map((module, index) => (
                  <div
                    key={module.id}
                    className={`module-card animate__animated animate__fadeInRight`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => navigate(module.path)}
                  >
                    <div className={`module-icon ${module.animation}`}>
                      {module.icon}
                    </div>
                    <div className="module-content">
                      <h6 className="module-title">{module.title}</h6>
                      <p className="module-description">{module.description}</p>
                    </div>
                    <div className="module-arrow">→</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bounty Leaderboard Widget */}
            <div className="card mt-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Bounty Leaderboard</h6>
                <button className="btn btn-sm btn-outline-primary" onClick={() => navigate('/bounty')}>View</button>
              </div>
              <div className="card-body">
                {bountyLeaderboard.length === 0 ? (
                  <div className="text-muted small">No points yet</div>
                ) : bountyLeaderboard.slice(0, 5).map((row, idx) => (
                  <div key={row.userId} className="d-flex justify-content-between mb-2">
                    <div><span className="badge bg-secondary me-2">#{idx + 1}</span>{row.name}</div>
                    <strong>{row.points} pts</strong>
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

export default Dashboard; 
