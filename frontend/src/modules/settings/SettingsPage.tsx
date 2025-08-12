import React, { useState } from 'react';
import { AppLayout } from '../layout/AppLayout';
import { useAuth } from '../auth/AuthContext';
import clsx from 'clsx';

interface SettingSection {
  id: string;
  title: string;
  icon: string;
  description: string;
}

const settingSections: SettingSection[] = [
  {
    id: 'profile',
    title: 'Profile',
    icon: 'fa-user',
    description: 'Manage your personal information'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: 'fa-bell',
    description: 'Configure how you receive updates'
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: 'fa-plug',
    description: 'Connect with external services'
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    icon: 'fa-shield-halved',
    description: 'Control your data and access'
  }
];

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    teams: true,
    calendar: true
  });
  const [integrations, setIntegrations] = useState({
    teams: true,
    outlook: false,
    google: false,
    slack: false
  });

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div>
            <h5 className="mb-4">Profile Information</h5>
            <form>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    defaultValue={user?.name}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    defaultValue={user?.email}
                    disabled
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Department</label>
                  <select className="form-select">
                    <option>Engineering</option>
                    <option>Design</option>
                    <option>Product</option>
                    <option>Marketing</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Location</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g., New York, NY"
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Bio</label>
                  <textarea 
                    className="form-control" 
                    rows={3}
                    placeholder="Tell us about yourself..."
                  ></textarea>
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        );

      case 'notifications':
        return (
          <div>
            <h5 className="mb-4">Notification Preferences</h5>
            <div className="list-group">
              <div className="list-group-item">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Email Notifications</h6>
                    <p className="mb-0 text-muted small">Receive updates via email</p>
                  </div>
                  <div className="form-check form-switch">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      checked={notifications.email}
                      onChange={(e) => setNotifications({...notifications, email: e.target.checked})}
                    />
                  </div>
                </div>
              </div>
              <div className="list-group-item">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Push Notifications</h6>
                    <p className="mb-0 text-muted small">Browser push notifications</p>
                  </div>
                  <div className="form-check form-switch">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      checked={notifications.push}
                      onChange={(e) => setNotifications({...notifications, push: e.target.checked})}
                    />
                  </div>
                </div>
              </div>
              <div className="list-group-item">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Teams Updates</h6>
                    <p className="mb-0 text-muted small">Get notified about team activities</p>
                  </div>
                  <div className="form-check form-switch">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      checked={notifications.teams}
                      onChange={(e) => setNotifications({...notifications, teams: e.target.checked})}
                    />
                  </div>
                </div>
              </div>
              <div className="list-group-item">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Calendar Reminders</h6>
                    <p className="mb-0 text-muted small">Notifications for upcoming events</p>
                  </div>
                  <div className="form-check form-switch">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      checked={notifications.calendar}
                      onChange={(e) => setNotifications({...notifications, calendar: e.target.checked})}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div>
            <h5 className="mb-4">Connected Services</h5>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="vc-card p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-3">
                      <i className="fa-brands fa-microsoft fa-2x text-primary"></i>
                      <div>
                        <h6 className="mb-0">Microsoft Teams</h6>
                        <small className="text-muted">Connected</small>
                      </div>
                    </div>
                    <div className="form-check form-switch">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        checked={integrations.teams}
                        onChange={(e) => setIntegrations({...integrations, teams: e.target.checked})}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="vc-card p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-3">
                      <i className="fa-brands fa-microsoft fa-2x text-info"></i>
                      <div>
                        <h6 className="mb-0">Outlook Calendar</h6>
                        <small className="text-muted">Not connected</small>
                      </div>
                    </div>
                    <button className="btn btn-sm btn-outline-primary">Connect</button>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="vc-card p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-3">
                      <i className="fa-brands fa-google fa-2x text-danger"></i>
                      <div>
                        <h6 className="mb-0">Google Calendar</h6>
                        <small className="text-muted">Not connected</small>
                      </div>
                    </div>
                    <button className="btn btn-sm btn-outline-primary">Connect</button>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="vc-card p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-3">
                      <i className="fa-brands fa-slack fa-2x text-warning"></i>
                      <div>
                        <h6 className="mb-0">Slack</h6>
                        <small className="text-muted">Not connected</small>
                      </div>
                    </div>
                    <button className="btn btn-sm btn-outline-primary">Connect</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div>
            <h5 className="mb-4">Privacy & Security Settings</h5>
            <div className="alert alert-info mb-4">
              <i className="fa-solid fa-info-circle me-2"></i>
              Your data is encrypted and secure. We follow industry best practices to protect your information.
            </div>
            <div className="list-group">
              <div className="list-group-item">
                <h6 className="mb-1">Two-Factor Authentication</h6>
                <p className="mb-2 text-muted small">Add an extra layer of security to your account</p>
                <button className="btn btn-sm btn-outline-primary">Enable 2FA</button>
              </div>
              <div className="list-group-item">
                <h6 className="mb-1">Login Sessions</h6>
                <p className="mb-2 text-muted small">Manage your active sessions</p>
                <button className="btn btn-sm btn-outline-secondary">View Sessions</button>
              </div>
              <div className="list-group-item">
                <h6 className="mb-1">Data Export</h6>
                <p className="mb-2 text-muted small">Download a copy of your data</p>
                <button className="btn btn-sm btn-outline-secondary">Export Data</button>
              </div>
              <div className="list-group-item">
                <h6 className="mb-1">Delete Account</h6>
                <p className="mb-2 text-muted small">Permanently delete your account and all data</p>
                <button className="btn btn-sm btn-outline-danger">Delete Account</button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AppLayout title="Settings">
      <div className="container-fluid">
        <div className="row">
          {/* Settings Navigation */}
          <div className="col-md-3">
            <div className="list-group">
              {settingSections.map(section => (
                <button
                  key={section.id}
                  className={clsx('list-group-item list-group-item-action d-flex align-items-center gap-3', {
                    'active': activeSection === section.id
                  })}
                  onClick={() => setActiveSection(section.id)}
                >
                  <i className={`fa-solid ${section.icon}`}></i>
                  <div className="text-start">
                    <div className="fw-medium">{section.title}</div>
                    <small className={activeSection === section.id ? 'text-white-50' : 'text-muted'}>
                      {section.description}
                    </small>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Settings Content */}
          <div className="col-md-9">
            <div className="vc-card p-4">
              {renderSectionContent()}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}; 
