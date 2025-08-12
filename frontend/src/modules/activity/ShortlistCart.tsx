import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import clsx from 'clsx';

export const ShortlistCart: React.FC = () => {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

  const buildHeaders = () => {
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return headers;
  };

  const fetchShortlist = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/activityplanner/shortlist', { headers: buildHeaders() });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.items?.length > 0 && !isOpen) {
          // Auto-open if items added
          setIsOpen(true);
          setIsMinimized(false);
        }
      }
    } catch (e) {
      console.error('Failed to fetch shortlist', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShortlist();
    
    // Listen for updates
    const handleUpdate = () => fetchShortlist();
    window.addEventListener('shortlist-updated', handleUpdate);
    return () => window.removeEventListener('shortlist-updated', handleUpdate);
  }, [accessToken]);

  const removeItem = async (id: string) => {
    await fetch(`/api/activityplanner/shortlist/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
    fetchShortlist();
  };

  const clearAll = async () => {
    if (confirm('Clear all shortlisted items?')) {
      await fetch('/api/activityplanner/shortlist', {
        method: 'DELETE',
        headers: buildHeaders(),
      });
      fetchShortlist();
    }
  };

  const shareToTeams = () => {
    alert('Share to Microsoft Teams - This would open a Teams share dialog with the shortlisted items formatted as a nice card.');
  };

  const totalPrice = items.reduce((sum, item) => sum + (item.priceLevel || 0), 0);

  const typeIcons = {
    restaurant: 'fa-utensils',
    hotel: 'fa-bed',
    activity: 'fa-person-hiking'
  };

  const typeColors = {
    restaurant: '#e74c3c',
    hotel: '#3498db',
    activity: '#2ecc71'
  };

  if (!items.length && !loading) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        className={clsx(
          'btn btn-primary rounded-circle shadow-lg position-fixed',
          isOpen && 'd-none'
        )}
        style={{
          bottom: 30,
          right: 30,
          width: 60,
          height: 60,
          zIndex: 1000,
        }}
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
      >
        <i className="fa-solid fa-heart"></i>
        {items.length > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {items.length}
          </span>
        )}
      </button>

      {/* Cart Panel */}
      <div
        className={clsx(
          'shortlist-cart position-fixed bg-white shadow-lg',
          isMinimized && 'minimized'
        )}
        style={{
          bottom: 0,
          right: 0,
          width: 400,
          maxWidth: '90vw',
          height: isMinimized ? 80 : 'auto',
          maxHeight: '80vh',
          zIndex: 1000,
          borderRadius: '16px 0 0 0',
          display: isOpen ? 'flex' : 'none',
          flexDirection: 'column',
          transition: 'height 0.3s ease',
        }}
      >
        {/* Header */}
        <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <i className="fa-solid fa-heart text-danger me-2"></i>
            <h6 className="mb-0">Shortlist ({items.length})</h6>
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-link text-muted p-0"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <i className={`fa-solid fa-chevron-${isMinimized ? 'up' : 'down'}`}></i>
            </button>
            <button
              className="btn btn-sm btn-link text-muted p-0"
              onClick={() => setIsOpen(false)}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <>
            {/* Items List */}
            <div className="flex-grow-1 overflow-auto p-3">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="card border-0 shadow-sm"
                    >
                      <div className="card-body p-2">
                        <div className="d-flex gap-2">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="rounded"
                            style={{
                              width: 60,
                              height: 60,
                              objectFit: 'cover',
                            }}
                            onError={(e: any) => {
                              e.currentTarget.src = 'https://via.placeholder.com/60';
                            }}
                          />
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <h6 className="mb-1 small">{item.name}</h6>
                                <div className="d-flex align-items-center gap-2 small text-muted">
                                  <span
                                    className="badge rounded-pill"
                                    style={{
                                      backgroundColor: typeColors[item.type as keyof typeof typeColors],
                                      color: 'white',
                                      fontSize: '0.7rem',
                                    }}
                                  >
                                    <i className={`fa-solid ${typeIcons[item.type as keyof typeof typeIcons]} me-1`}></i>
                                    {item.type}
                                  </span>
                                  <span>Price Level: {'$'.repeat(item.priceLevel)}</span>
                                </div>
                              </div>
                              <button
                                className="btn btn-sm btn-link text-danger p-0"
                                onClick={() => removeItem(item.id)}
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-top p-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-muted">Total Price Level</span>
                <span className="h5 mb-0 text-primary">{'$'.repeat(totalPrice)}</span>
              </div>
              <div className="d-grid gap-2">
                <button className="btn btn-primary" onClick={shareToTeams}>
                  <i className="fa-brands fa-microsoft me-2"></i>
                  Share to Teams
                </button>
                <button className="btn btn-outline-danger btn-sm" onClick={clearAll}>
                  Clear All
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Custom styles */}
      <style>{`
        .minimized {
          overflow: hidden;
        }
      `}</style>
    </>
  );
}; 
