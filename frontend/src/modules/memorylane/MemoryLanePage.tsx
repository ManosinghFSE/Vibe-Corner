import React, { useState, useEffect } from 'react';
import { AppLayout } from '../layout/AppLayout';
import { useAuth } from '../auth/AuthContext';
import clsx from 'clsx';

interface Entry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood: number;
  tags: string[];
  date: string;
  wordCount: number;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  totalEntries: number;
  avgMood: number;
  moodDistribution: Record<string, number>;
  tagFrequency: Array<{ tag: string; count: number }>;
  longestStreak: number;
  totalWords: number;
  avgWordsPerEntry: number;
}

const moodEmojis = {
  1: '😔',
  2: '😕',
  3: '😐',
  4: '😊',
  5: '😄'
};

const moodLabels = {
  1: 'Very Low',
  2: 'Low',
  3: 'Neutral',
  4: 'Good',
  5: 'Excellent'
};

export const MemoryLanePage: React.FC = () => {
  const { getAuthHeader } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar' | 'stats'>('timeline');
  const [filterTag, setFilterTag] = useState('');
  const [filterMood, setFilterMood] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  
  // Form states
  const [entryTitle, setEntryTitle] = useState('');
  const [entryContent, setEntryContent] = useState('');
  const [entryMood, setEntryMood] = useState(3);
  const [entryTags, setEntryTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    fetchEntries();
    fetchStats();
  }, [filterTag, filterMood, searchQuery]);

  useEffect(() => {
    if (entryMood) {
      fetchPrompts(entryMood);
    }
  }, [entryMood]);

  async function fetchEntries() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTag) params.append('tag', filterTag);
      if (filterMood) params.append('mood', filterMood);
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await fetch(`/api/memorylane/entries?${params}`, {
        headers: getAuthHeader()
      });
      
      if (!res.ok) throw new Error('Failed to fetch entries');
      const data = await res.json();
      setEntries(data.entries);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/memorylane/stats', {
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  }

  async function fetchPrompts(mood: number) {
    try {
      const res = await fetch(`/api/memorylane/prompts?mood=${mood}`, {
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to fetch prompts');
      const data = await res.json();
      setPrompts(data.prompts);
    } catch (err: any) {
      console.error('Failed to fetch prompts:', err);
    }
  }

  async function saveEntry() {
    if (!entryContent.trim()) {
      alert('Please add some content');
      return;
    }
    
    setLoading(true);
    try {
      const method = editingEntry ? 'PUT' : 'POST';
      const url = editingEntry 
        ? `/api/memorylane/entries/${editingEntry.id}`
        : '/api/memorylane/entries';
      
      const res = await fetch(url, {
        method,
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: entryTitle.trim() || entryContent.trim().split(/\s+/).slice(0, 6).join(' '),
          content: entryContent,
          mood: entryMood,
          tags: entryTags,
          isPrivate
        })
      });
      
      if (!res.ok) throw new Error('Failed to save entry');
      
      resetEditor();
      fetchEntries();
      fetchStats();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteEntry(entryId: string) {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      const res = await fetch(`/api/memorylane/entries/${entryId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      
      if (!res.ok) throw new Error('Failed to delete entry');
      
      if (selectedEntry?.id === entryId) {
        setSelectedEntry(null);
      }
      
      fetchEntries();
      fetchStats();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function exportEntries() {
    try {
      const res = await fetch('/api/memorylane/export', {
        headers: getAuthHeader()
      });
      
      if (!res.ok) throw new Error('Failed to export entries');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'memorylane-export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message);
    }
  }

  function startEdit(entry: Entry) {
    setEditingEntry(entry);
    setEntryTitle(entry.title);
    setEntryContent(entry.content);
    setEntryMood(entry.mood);
    setEntryTags(entry.tags);
    setIsPrivate(entry.isPrivate);
    // Hide details panel; show editor
    setSelectedEntry(null);
    setShowEditor(true);
    // Scroll editor into view soon after render
    setTimeout(() => {
      const el = document.querySelector('.card .form-label');
      if (el && 'scrollIntoView' in el) {
        (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const titleInput = document.querySelector('input.form-control');
      if (titleInput && 'focus' in titleInput) {
        (titleInput as HTMLInputElement).focus();
      }
    }, 50);
  }

  function resetEditor() {
    setShowEditor(false);
    setEditingEntry(null);
    setEntryTitle('');
    setEntryContent('');
    setEntryMood(3);
    setEntryTags([]);
    setNewTag('');
    setIsPrivate(false);
  }

  function addTag() {
    if (newTag.trim() && !entryTags.includes(newTag.trim())) {
      setEntryTags([...entryTags, newTag.trim()]);
      setNewTag('');
    }
  }

  function removeTag(tag: string) {
    setEntryTags(entryTags.filter(t => t !== tag));
  }

  function usePrompt(prompt: string) {
    setEntryContent(entryContent + (entryContent ? '\n\n' : '') + prompt + '\n');
  }

  // Group entries by month for timeline
  const entriesByMonth = entries.reduce((acc, entry) => {
    const month = new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(entry);
    return acc;
  }, {} as Record<string, Entry[]>);

  return (
    <AppLayout title="Memory Lane">
      <div className="memorylane-container">
        {error && (
          <div className="alert alert-danger mb-3">{error}</div>
        )}

        {/* Header Controls */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-search"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-2">
            <select
              className="form-select"
              value={filterMood}
              onChange={(e) => setFilterMood(e.target.value)}
            >
              <option value="">All Moods</option>
              {Object.entries(moodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {moodEmojis[value]} {label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <select
              className="form-select"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
            >
              <option value="">All Tags</option>
              {stats?.tagFrequency.map(({ tag }) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
          <div className="col-md-4 text-end">
            <div className="btn-group me-2" role="group">
              <button
                className={clsx('btn', viewMode === 'timeline' ? 'btn-primary' : 'btn-outline-primary')}
                onClick={() => setViewMode('timeline')}
              >
                <i className="fas fa-stream"></i>
              </button>
              <button
                className={clsx('btn', viewMode === 'calendar' ? 'btn-primary' : 'btn-outline-primary')}
                onClick={() => setViewMode('calendar')}
              >
                <i className="fas fa-calendar"></i>
              </button>
              <button
                className={clsx('btn', viewMode === 'stats' ? 'btn-primary' : 'btn-outline-primary')}
                onClick={() => setViewMode('stats')}
              >
                <i className="fas fa-chart-line"></i>
              </button>
            </div>
            <button
              className="btn btn-outline-secondary me-2"
              onClick={exportEntries}
            >
              <i className="fas fa-download"></i>
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowEditor(true)}
            >
              <i className="fas fa-plus me-2"></i>
              New Entry
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="row">
          <div className="col-md-8">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : viewMode === 'timeline' ? (
              <div className="timeline">
                {Object.entries(entriesByMonth).map(([month, monthEntries]) => (
                  <div key={month} className="timeline-month mb-5">
                    <h5 className="month-header">{month}</h5>
                    {monthEntries.map(entry => (
                      <div
                        key={entry.id}
                        className={clsx('timeline-entry', {
                          'selected': selectedEntry?.id === entry.id
                        })}
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <div className="timeline-date">
                          {new Date(entry.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="timeline-content">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="mb-0">{entry.title}</h6>
                            <span className="mood-emoji">{moodEmojis[entry.mood]}</span>
                          </div>
                          <p className="text-muted small mb-2">
                            {entry.content.substring(0, 150)}...
                          </p>
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              {entry.tags.map(tag => (
                                <span key={tag} className="badge bg-secondary me-1">{tag}</span>
                              ))}
                            </div>
                            <small className="text-muted">{entry.wordCount} words</small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {entries.length === 0 && (
                  <div className="text-center py-5">
                    <i className="fas fa-book fa-4x text-muted mb-3"></i>
                    <h5>No entries yet</h5>
                    <p className="text-muted">Start journaling to create your memory lane</p>
                  </div>
                )}
              </div>
            ) : viewMode === 'stats' ? (
              <div className="stats-view">
                {stats && (
                  <>
                    {/* Summary Cards */}
                    <div className="row mb-4">
                      <div className="col-md-3">
                        <div className="card text-center">
                          <div className="card-body">
                            <h3>{stats.totalEntries}</h3>
                            <p className="text-muted mb-0">Total Entries</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card text-center">
                          <div className="card-body">
                            <h3>{moodEmojis[Math.round(stats.avgMood)]}</h3>
                            <p className="text-muted mb-0">Average Mood</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card text-center">
                          <div className="card-body">
                            <h3>{stats.longestStreak}</h3>
                            <p className="text-muted mb-0">Longest Streak</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card text-center">
                          <div className="card-body">
                            <h3>{stats.avgWordsPerEntry}</h3>
                            <p className="text-muted mb-0">Avg Words</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mood Chart */}
                    <div className="card mb-4">
                      <div className="card-header">
                        <h5 className="mb-0">Mood Distribution</h5>
                      </div>
                      <div className="card-body">
                        {Object.entries(stats.moodDistribution).map(([mood, count]) => {
                          const percentage = stats.totalEntries > 0 
                            ? (count / stats.totalEntries) * 100 
                            : 0;
                          
                          return (
                            <div key={mood} className="mb-3">
                              <div className="d-flex justify-content-between mb-1">
                                <span>
                                  {moodEmojis[mood]} {moodLabels[mood]}
                                </span>
                                <span>{count} entries</span>
                              </div>
                              <div className="progress" style={{ height: '20px' }}>
                                <div
                                  className="progress-bar"
                                  style={{ 
                                    width: `${percentage}%`,
                                    backgroundColor: `hsl(${parseInt(mood) * 60}, 70%, 50%)`
                                  }}
                                >
                                  {percentage > 10 && `${percentage.toFixed(0)}%`}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Popular Tags */}
                    <div className="card">
                      <div className="card-header">
                        <h5 className="mb-0">Popular Tags</h5>
                      </div>
                      <div className="card-body">
                        <div className="tag-cloud">
                          {stats.tagFrequency.map(({ tag, count }) => (
                            <span
                              key={tag}
                              className="badge bg-primary me-2 mb-2"
                              style={{ fontSize: `${Math.min(1.5, 0.8 + count * 0.1)}rem` }}
                            >
                              {tag} ({count})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="calendar-view">
                {/* Calendar view would go here - simplified for now */}
                <div className="text-center py-5">
                  <i className="fas fa-calendar fa-4x text-muted mb-3"></i>
                  <h5>Calendar View</h5>
                  <p className="text-muted">Coming soon...</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="col-md-4">
            {selectedEntry ? (
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Entry Details</h5>
                  <button
                    className="btn-close"
                    onClick={() => setSelectedEntry(null)}
                  ></button>
                </div>
                <div className="card-body">
                  <h6>{selectedEntry.title}</h6>
                  <p className="text-muted small">
                    {new Date(selectedEntry.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <div className="mb-3">
                    <span className="mood-badge">
                      {moodEmojis[selectedEntry.mood]} {moodLabels[selectedEntry.mood]}
                    </span>
                  </div>
                  <div className="mb-3">
                    {selectedEntry.tags.map(tag => (
                      <span key={tag} className="badge bg-secondary me-1">{tag}</span>
                    ))}
                  </div>
                  <div className="entry-content mb-3">
                    {selectedEntry.content.split('\n').map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                  <div className="text-muted small mb-3">
                    {selectedEntry.wordCount} words
                    {selectedEntry.isPrivate && (
                      <span className="ms-2">
                        <i className="fas fa-lock"></i> Private
                      </span>
                    )}
                  </div>
                  <div className="d-grid gap-2">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => startEdit(selectedEntry)}
                    >
                      <i className="fas fa-edit me-2"></i>Edit
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => deleteEntry(selectedEntry.id)}
                    >
                      <i className="fas fa-trash me-2"></i>Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : showEditor ? (
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">{editingEntry ? 'Edit Entry' : 'New Entry'}</h5>
                  <button
                    className="btn-close"
                    onClick={resetEditor}
                  ></button>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label">Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={entryTitle}
                      onChange={(e) => setEntryTitle(e.target.value)}
                      placeholder="Give your entry a title..."
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">How are you feeling?</label>
                    <div className="mood-selector">
                      {Object.entries(moodEmojis).map(([mood, emoji]) => (
                        <button
                          key={mood}
                          className={clsx('mood-btn', {
                            'selected': entryMood === parseInt(mood)
                          })}
                          onClick={() => setEntryMood(parseInt(mood))}
                        >
                          <span className="emoji">{emoji}</span>
                          <small>{moodLabels[mood]}</small>
                        </button>
                      ))}
                    </div>
                  </div>

                  {prompts.length > 0 && (
                    <div className="mb-3">
                      <label className="form-label">Writing Prompts</label>
                      {prompts.map((prompt, i) => (
                        <button
                          key={i}
                          className="btn btn-sm btn-outline-secondary d-block mb-2 text-start"
                          onClick={() => usePrompt(prompt)}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <label className="form-label">Content</label>
                    <textarea
                      className="form-control"
                      rows={10}
                      value={entryContent}
                      onChange={(e) => setEntryContent(e.target.value)}
                      placeholder="Write your thoughts..."
                    />
                    <small className="text-muted">
                      {entryContent.split(/\s+/).filter(w => w).length} words
                    </small>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Tags</label>
                    <div className="input-group mb-2">
                      <input
                        type="text"
                        className="form-control"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        placeholder="Add a tag..."
                      />
                      <button
                        className="btn btn-outline-secondary"
                        onClick={addTag}
                      >
                        Add
                      </button>
                    </div>
                    <div>
                      {entryTags.map(tag => (
                        <span key={tag} className="badge bg-secondary me-1">
                          {tag}
                          <button
                            className="btn-close btn-close-white ms-1"
                            onClick={() => removeTag(tag)}
                          ></button>
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="isPrivate"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="isPrivate">
                        <i className="fas fa-lock me-1"></i>
                        Keep this entry private
                      </label>
                    </div>
                  </div>
                  
                  <div className="d-grid gap-2">
                    <button
                      className="btn btn-primary"
                      onClick={saveEntry}
                      disabled={loading || !entryContent.trim()}
                    >
                      <i className="fas fa-save me-2"></i>
                      {editingEntry ? 'Update Entry' : 'Save Entry'}
                    </button>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={resetEditor}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-body text-center py-5">
                  <i className="fas fa-feather-alt fa-3x text-muted mb-3"></i>
                  <h5>Start Writing</h5>
                  <p className="text-muted">
                    Select an entry to view or create a new one
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowEditor(true)}
                  >
                    <i className="fas fa-plus me-2"></i>
                    New Entry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .memorylane-container {
          padding: 20px;
        }

        .timeline-month {
          position: relative;
          padding-left: 40px;
        }

        .timeline-month::before {
          content: '';
          position: absolute;
          left: 10px;
          top: 30px;
          bottom: 0;
          width: 2px;
          background-color: #e0e0e0;
        }

        .month-header {
          color: var(--vc-primary);
          margin-bottom: 20px;
        }

        .timeline-entry {
          position: relative;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .timeline-entry::before {
          content: '';
          position: absolute;
          left: -36px;
          top: 20px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: var(--vc-primary);
          border: 3px solid white;
          box-shadow: 0 0 0 2px #e0e0e0;
        }

        .timeline-entry:hover,
        .timeline-entry.selected {
          transform: translateX(5px);
          box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }

        .timeline-date {
          position: absolute;
          left: -90px;
          top: 15px;
          font-size: 0.875rem;
          color: #666;
          text-align: right;
          width: 40px;
        }

        .mood-emoji {
          font-size: 1.5rem;
        }

        .mood-selector {
          display: flex;
          gap: 10px;
          justify-content: space-between;
        }

        .mood-btn {
          flex: 1;
          padding: 10px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mood-btn:hover {
          transform: translateY(-2px);
        }

        .mood-btn.selected {
          border-color: var(--vc-primary);
          background-color: var(--vc-primary-light);
        }

        .mood-btn .emoji {
          display: block;
          font-size: 1.5rem;
          margin-bottom: 5px;
        }

        .entry-content {
          max-height: 400px;
          overflow-y: auto;
          white-space: pre-wrap;
        }

        .mood-badge {
          display: inline-block;
          padding: 5px 10px;
          background-color: #f0f0f0;
          border-radius: 20px;
          font-size: 0.9rem;
        }

        .tag-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        @media (max-width: 768px) {
          .timeline-date {
            position: static;
            margin-bottom: 5px;
          }
          
          .timeline-month {
            padding-left: 20px;
          }
          
          .timeline-entry::before {
            left: -16px;
          }
        }
      `}</style>
    </AppLayout>
  );
}; 
