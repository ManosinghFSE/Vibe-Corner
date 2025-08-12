import React, { useEffect, useState } from 'react';
import { AppLayout } from '../layout/AppLayout';
import { useAuth } from '../auth/AuthContext';
import clsx from 'clsx';

interface Bounty {
  id: string;
  title: string;
  description: string;
  category: string;
  points: number;
  start_at?: string | null;
  due_at?: string | null;
  status: 'open' | 'in-progress' | 'submitted' | 'approved' | 'completed' | 'cancelled';
  created_at: string;
}

interface LeaderboardRow { userId: string; name: string; points: number; }

export const BountyPage: React.FC = () => {
  const { getAuthHeader, user } = useAuth();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [points, setPoints] = useState('10');
  const [dueAt, setDueAt] = useState('');

  async function fetchAll() {
    try {
      setLoading(true);
      const [bRes, lRes] = await Promise.all([
        fetch('/api/bounty/bounties', { headers: getAuthHeader() }),
        fetch('/api/bounty/leaderboard', { headers: getAuthHeader() })
      ]);
      const [bData, lData] = await Promise.all([bRes.json(), lRes.json()]);
      setBounties(bData.bounties || []);
      setLeaderboard(lData.leaderboard || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load bounties');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  async function createBounty() {
    try {
      setLoading(true);
      const res = await fetch('/api/bounty/bounties', {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category, points: Number(points), dueAt: dueAt ? new Date(dueAt).toISOString() : null })
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg.error || 'Failed to create');
      }
      setShowCreate(false);
      setTitle(''); setDescription(''); setCategory('General'); setPoints('10'); setDueAt('');
      fetchAll();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function pickup(id: string) {
    await fetch(`/api/bounty/bounties/${id}/pickup`, { method: 'POST', headers: getAuthHeader() });
    fetchAll();
  }
  async function submit(id: string) {
    await fetch(`/api/bounty/bounties/${id}/submit`, { method: 'POST', headers: getAuthHeader() });
    fetchAll();
  }

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  return (
    <AppLayout title="Bounty Hunter">
      <div className="container-fluid" style={{ background: '#091e42', minHeight: '100vh', padding: '20px' }}>
        <div className="row mb-3">
          <div className="col d-flex align-items-center">
            <h3 className="mb-0" style={{ color: '#fff' }}>Bounties</h3>
          </div>
          <div className="col text-end">
            {isManager && (
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <i className="fas fa-plus me-2"></i>Create Bounty
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">{error}</div>
        )}

        <div className="row">
          <div className="col-lg-8">
            <div className="row g-3">
              {bounties.map(b => (
                <div className="col-md-6" key={b.id}>
                  <div className="card" style={{ border: '1px solid #1f2f4a', background: '#0c2b47', color: '#e6efff' }}>
                    <div className="card-body">
                      <div className="d-flex justify-content-between">
                        <h5 className="card-title" style={{ color: '#d1e4ff' }}>{b.title}</h5>
                        <span className={clsx('badge', {
                          'bg-secondary': b.status === 'open',
                          'bg-primary': b.status === 'in-progress',
                          'bg-warning': b.status === 'submitted',
                          'bg-success': b.status === 'completed' || b.status === 'approved',
                          'bg-danger': b.status === 'cancelled'
                        })}>{b.status}</span>
                      </div>
                      <p className="small" style={{ color: '#9fb3c8' }}>{b.description}</p>
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="small">
                          <span className="badge bg-info me-2">{b.category}</span>
                          <span className="badge bg-success">{b.points} pts</span>
                        </div>
                        <div className="btn-group">
                          {(b.status === 'open' || b.status === 'in-progress') && (
                            <button className="btn btn-outline-primary btn-sm" onClick={() => pickup(b.id)}>Pick Up</button>
                          )}
                          {b.status === 'in-progress' && (
                            <button className="btn btn-outline-success btn-sm" onClick={() => submit(b.id)}>Submit</button>
                          )}
                        </div>
                      </div>
                      {b.due_at && (
                        <div className="mt-2 small" style={{ color: '#b6c6d8' }}>
                          <i className="fas fa-clock me-1"></i>
                          Due {new Date(b.due_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card" style={{ border: '1px solid #1f2f4a', background: '#0c2b47', color: '#e6efff' }}>
              <div className="card-header" style={{ background: '#0b2440', color: '#cfe0ff' }}>Leaderboard</div>
              <div className="card-body">
                {leaderboard.length === 0 ? (
                  <p className="text-muted">No points yet</p>
                ) : leaderboard.map((r, idx) => (
                  <div key={r.userId} className="d-flex justify-content-between mb-2">
                    <div>
                      <span className="badge bg-dark me-2">#{idx + 1}</span>
                      {r.name}
                    </div>
                    <strong>{r.points} pts</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {showCreate && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Create Bounty</h5>
                  <button className="btn-close" onClick={() => setShowCreate(false)} />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Title</label>
                    <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
                  </div>
                  <div className="row">
                    <div className="col">
                      <label className="form-label">Category</label>
                      <input className="form-control" value={category} onChange={e => setCategory(e.target.value)} />
                    </div>
                    <div className="col">
                      <label className="form-label">Points</label>
                      <input type="number" className="form-control" value={points} onChange={e => setPoints(e.target.value)} />
                    </div>
                  </div>
                  <div className="mb-3 mt-3">
                    <label className="form-label">Due Date</label>
                    <input type="datetime-local" className="form-control" value={dueAt} onChange={e => setDueAt(e.target.value)} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={createBounty} disabled={!title.trim()}>Create</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}; 