import React, { useEffect, useState } from 'react';
import { AppLayout } from '../layout/AppLayout';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../auth/AuthContext';

interface Team {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  avatar?: string;
  lastActivity?: string;
  status?: 'active' | 'planning' | 'idle';
  upcomingEvents?: number;
}

export const TeamsPage: React.FC = () => {
  const navigate = useNavigate();
  const { getAuthHeader } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/teams', { headers: getAuthHeader() });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        const mapped: Team[] = (data.teams || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          memberCount: t.memberCount ?? 0,
          avatar: '👥',
          lastActivity: '',
          status: 'active',
          upcomingEvents: 0,
        }));
        setTeams(mapped);
      } catch (e) {
        setTeams([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getAuthHeader]);

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (team.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || team.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Team['status'] = 'active') => {
    const statusConfig: Record<string, { class: string; label: string }> = {
      active: { class: 'badge-success', label: 'Active' },
      planning: { class: 'badge-warning', label: 'Planning' },
      idle: { class: 'badge-secondary', label: 'Idle' }
    };
    const config = statusConfig[status] || statusConfig.active;
    return <span className={`badge ${config.class}`}>{config.label}</span>;
  };

  return (
    <AppLayout title="Teams">
      <div className="container-fluid">
        {/* Header Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-muted mb-0">Manage your teams and plan activities together</p>
              </div>
              <button className="btn btn-primary">
                <i className="fa-solid fa-plus me-2"></i>
                Create New Team
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="fa-solid fa-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="btn-group w-100" role="group">
              {['all', 'active', 'planning', 'idle'].map(status => (
                <button
                  key={status}
                  className={clsx('btn', {
                    'btn-primary': selectedStatus === status,
                    'btn-outline-secondary': selectedStatus !== status
                  })}
                  onClick={() => setSelectedStatus(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Teams Grid */}
        <div className="row g-4">
          {!loading && filteredTeams.map(team => (
            <div key={team.id} className="col-lg-4 col-md-6">
              <div className="vc-card h-100 p-4 hover-lift">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="d-flex align-items-center gap-3">
                    <div className="team-avatar">{team.avatar || '👥'}</div>
                    <div>
                      <h5 className="mb-1">{team.name}</h5>
                      {getStatusBadge(team.status)}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-light">
                    <i className="fa-solid fa-ellipsis-vertical"></i>
                  </button>
                </div>

                <p className="text-muted mb-3">{team.description || ''}</p>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center gap-3">
                    <div className="text-center">
                      <div className="fw-bold">{team.memberCount}</div>
                      <small className="text-muted">Members</small>
                    </div>
                    <div className="text-center">
                      <div className="fw-bold">{team.upcomingEvents || 0}</div>
                      <small className="text-muted">Events</small>
                    </div>
                  </div>
                  <small className="text-muted">
                    <i className="fa-regular fa-clock me-1"></i>
                    {team.lastActivity || ''}
                  </small>
                </div>

                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-primary btn-sm flex-fill"
                    onClick={() => navigate('/collaborate')}
                  >
                    Plan Activity
                  </button>
                  <button className="btn btn-outline-primary btn-sm flex-fill">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {!loading && filteredTeams.length === 0 && (
          <div className="text-center py-5">
            <i className="fa-solid fa-people-group fa-3x text-muted mb-3"></i>
            <h5>No teams found</h5>
            <p className="text-muted">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      <style>{`
        .team-avatar {
          width: 48px;
          height: 48px;
          background: var(--vc-gray-100);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .hover-lift {
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
      `}</style>
    </AppLayout>
  );
}; 
