import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import clsx from 'clsx';

export const AppLayout: React.FC<{ children: React.ReactNode; title?: string }> = ({ 
  children, 
  title = 'VibeCorner' 
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Refs
  const sidebarRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: 'fa-house' },
    { name: 'Activity Planner', href: '/activity-planner', icon: 'fa-calendar' },
    { name: 'Collaboration', href: '/collaborate', icon: 'fa-users' },
    { name: 'Bill Splitter', href: '/billsplitter', icon: 'fa-receipt' },
    { name: 'Birthday Tracker', href: '/birthday', icon: 'fa-cake-candles' },
    { name: 'Budget Manager', href: '/budget', icon: 'fa-chart-pie' },
    { name: 'Code Mood', href: '/codemood', icon: 'fa-face-smile' },
    { name: 'Event Grid', href: '/eventgrid', icon: 'fa-calendar-days' },
    { name: 'Meeting Mind', href: '/meetingmind', icon: 'fa-brain' },
    { name: 'Memory Lane', href: '/memorylane', icon: 'fa-book' },
    { name: 'Skill Swap', href: '/skillswap', icon: 'fa-right-left' },
    { name: 'Bounty Hunter', href: '/bounty', icon: 'fa-bullseye' },
    { name: 'Story Craft', href: '/storycraft', icon: 'fa-pen-fancy' },
    { name: 'Teams', href: '/teams', icon: 'fa-user-group' },
    { name: 'Calendar', href: '/calendar', icon: 'fa-calendar' },
    { name: 'Settings', href: '/settings', icon: 'fa-gear' }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleNavClick = () => {
    // Close mobile sidebar when navigation item is clicked
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    // Set document title
    document.title = title;
  }, [title]);

  return (
    <div className={clsx('app-container', sidebarCollapsed && 'collapsed')}>
      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={clsx('sidebar', sidebarOpen && 'open', sidebarCollapsed && 'collapsed')}
        style={{
          width: sidebarCollapsed ? '80px' : '250px',
          transition: 'width 0.3s ease'
        }}
      >
        <div className="p-3 d-flex flex-column h-100">
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div className="logo-tile fw-bold d-flex align-items-center justify-content-center" 
              style={{width: sidebarCollapsed ? '40px' : '48px', height: sidebarCollapsed ? '40px' : '48px'}}>
              VC
            </div>
            {!sidebarCollapsed && (
              <button 
                className="btn btn-secondary btn-sm"
                onClick={toggleSidebarCollapse}
                title="Collapse sidebar"
                style={{
                  width: '32px',
                  height: '32px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px'
                }}
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
            )}
          </div>
          
          <nav className="nav flex-column flex-grow-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href === '/collaborate' && location.pathname.startsWith('/collaborate'));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'nav-link sidebar-link d-flex align-items-center gap-3 py-2 px-3 rounded text-decoration-none',
                    isActive && 'active'
                  )}
                  onClick={handleNavClick}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <i className={`fa-solid ${item.icon}`} style={{width: '20px', textAlign: 'center'}}></i>
                  {!sidebarCollapsed && <span className="nav-text">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content" style={{
        marginLeft: sidebarCollapsed ? '80px' : '250px',
        width: sidebarCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 250px)',
        transition: 'margin-left 0.3s ease, width 0.3s ease'
      }}>
        {/* Header */}
        <header 
          ref={headerRef}
          className="app-header"
        >
          <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-3">
                <button 
                  className="btn btn-link d-md-none p-0"
                  onClick={toggleSidebar}
                >
                  <i className="fa-solid fa-bars fa-lg"></i>
                </button>
                {sidebarCollapsed && (
                  <button 
                    className="btn btn-outline-primary btn-sm d-none d-md-block"
                    onClick={toggleSidebarCollapse}
                    title="Expand sidebar"
                    style={{
                      width: '36px',
                      height: '36px',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px'
                    }}
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                )}
                <h4 className="mb-0">{title}</h4>
              </div>
              
              <div className="d-flex align-items-center gap-3">
                {/* Search */}
                <div className="position-relative d-none d-md-block">
                  <input 
                    type="text" 
                    className="form-control search-input" 
                    placeholder="Search..."
                    style={{width: '300px'}}
                  />
                  <i className="fa-solid fa-search search-icon"></i>
                </div>
                
                {/* Notifications */}
                <div className="position-relative">
                  <button 
                    className="btn btn-link position-relative"
                    onClick={() => setShowNotifications(!showNotifications)}
                  >
                    <i className="fa-solid fa-bell fa-lg"></i>
                    {notifications.length > 0 && (
                      <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger notification-dot">
                        {notifications.length}
                      </span>
                    )}
                  </button>
                  
                  {showNotifications && (
                    <div className="dropdown-menu show position-absolute end-0 mt-2" style={{width: '300px'}}>
                      <div className="p-3">
                        <h6 className="mb-2">Notifications</h6>
                        {notifications.length === 0 ? (
                          <p className="text-muted small mb-0">No new notifications</p>
                        ) : (
                          <div className="d-flex flex-column gap-2">
                            {notifications.slice(0, 3).map((notif, index) => (
                              <div key={index} className="d-flex gap-2 p-2 rounded bg-light">
                                <i className="fa-solid fa-circle-info text-primary mt-1"></i>
                                <div>
                                  <div className="small fw-semibold">{notif.title}</div>
                                  <div className="small text-muted">{notif.message}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* User Menu */}
                <div className="dropdown">
                  <button 
                    className="btn btn-link d-flex align-items-center gap-2 text-decoration-none"
                    data-bs-toggle="dropdown"
                  >
                    <div className="avatar rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" 
                      style={{width: '32px', height: '32px'}}>
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <span className="d-none d-md-block">{user?.name || 'User'}</span>
                    <i className="fa-solid fa-chevron-down small"></i>
                  </button>
                  <ul className="dropdown-menu">
                    <li><Link className="dropdown-item" to="/profile">Profile</Link></li>
                    <li><Link className="dropdown-item" to="/settings">Settings</Link></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><button className="dropdown-item text-danger" onClick={handleLogout}>Logout</button></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main 
          ref={contentRef}
          className="p-4"
        >
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay d-md-none"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
        />
      )}
    </div>
  );
}; 
