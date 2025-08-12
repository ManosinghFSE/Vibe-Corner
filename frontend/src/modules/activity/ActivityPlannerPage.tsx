import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { AppLayout } from '../layout/AppLayout';
import { ShortlistCart } from './ShortlistCart';

type Item = {
  id: string;
  name: string;
  type: 'restaurant' | 'hotel' | 'activity';
  description: string;
  rating: number;
  priceLevel: number;
  location: string;
  image: string;
  cuisine?: string;
  category?: string;
  amenities?: string[];
  capacity?: number;
  openNow?: boolean;
  featured?: boolean;
};

type Filters = {
  location: string;
  teamSize: number;
  types: string[];
  cuisines: string[];
  priceLevels: number[];
  rating: number;
  openNow: boolean;
  sortBy: string;
};

export const ActivityPlannerPage: React.FC = () => {
  const { accessToken, user } = useAuth();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!accessToken || !user) {
      console.log('User not authenticated, redirecting to login');
      window.location.href = '/login';
      return;
    }
  }, [accessToken, user]);

  // Show loading while checking authentication
  if (!accessToken || !user) {
    return (
      <AppLayout title="Activity Planner">
        <div className="container">
          <div className="row">
            <div className="col-12">
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Checking authentication...</p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(true);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [metadata, setMetadata] = useState<any>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  
  // Filters state
  const [filters, setFilters] = useState<Filters>({
    location: 'San Francisco',
    teamSize: 5,
    types: [],
    cuisines: [],
    priceLevels: [],
    rating: 0,
    openNow: false,
    sortBy: 'relevance'
  });

  function buildHeaders(json = true): HeadersInit {
    const h: Record<string, string> = {};
    if (json) h['Content-Type'] = 'application/json';
    if (accessToken) {
      h['Authorization'] = `Bearer ${accessToken}`;
    } else {
      console.warn('No access token available for API request');
    }
    return h;
  }

  // Fetch metadata on mount
  useEffect(() => {
    if (!accessToken) {
      console.warn('No access token available, skipping metadata fetch');
      return;
    }

    fetch('/api/activityplanner/metadata', { 
      headers: buildHeaders(),
      credentials: 'include'
    })
      .then(res => {
        if (res.status === 401) {
          console.error('Authentication failed, redirecting to login');
          window.location.href = '/login';
          return;
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          setMetadata(data);
        }
      })
      .catch(err => {
        console.error('Failed to load metadata:', err);
        if (err.message.includes('401')) {
          window.location.href = '/login';
        }
      });
  }, [accessToken]);

  async function fetchRecommendations() {
    try {
      if (!accessToken) {
        setError('Authentication required. Please log in.');
        return;
      }

      setLoading(true);
      setError(null);
      
      const body: any = {
        location: filters.location,
        teamSize: filters.teamSize,
        sortBy: filters.sortBy
      };
      
      // Add active filters
      if (filters.types.length) body.types = filters.types;
      if (filters.cuisines.length) body.cuisines = filters.cuisines;
      if (filters.priceLevels.length) body.priceLevels = filters.priceLevels;
      if (filters.rating) body.rating = filters.rating;
      if (filters.openNow) body.openNow = true;
      
      const res = await fetch('/api/activityplanner/recommend', {
        method: 'POST',
        headers: buildHeaders(),
        credentials: 'include',
        body: JSON.stringify(body)
      });
      
      if (res.status === 401) {
        setError('Authentication failed. Please log in again.');
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}: Failed to fetch recommendations`);
      }
      
      const data = await res.json();
      setItems(data.recommendations || []);
      setTotalAvailable(data.totalAvailable || 0);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred');
      if (e.message.includes('401')) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRecommendations();
  }, [filters.location]);

  // Auto-search when filters change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecommendations();
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [filters.types, filters.cuisines, filters.priceLevels, filters.rating, filters.openNow, filters.sortBy]);

  const updateFilter = (filterType: keyof Filters, value: any) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      
      if (Array.isArray(newFilters[filterType])) {
        const arr = newFilters[filterType] as any[];
        const idx = arr.indexOf(value);
        if (idx >= 0) {
          (newFilters[filterType] as any[]) = arr.filter(v => v !== value);
        } else {
          (newFilters[filterType] as any[]) = [...arr, value];
        }
      } else {
        (newFilters as any)[filterType] = value;
      }
      
      return newFilters;
    });
  };

  const toggleFilter = (filterType: keyof Filters, value: any) => {
    updateFilter(filterType, value);
  };

  const applyFilters = () => {
    fetchRecommendations();
  };

  const clearFilters = () => {
    setFilters({
      location: filters.location,
      teamSize: filters.teamSize,
      types: [],
      cuisines: [],
      priceLevels: [],
      rating: 0,
      openNow: false,
      sortBy: 'relevance'
    });
    setSearchQuery('');
  };

  // Filter items based on search query
  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(query) ||
           item.description.toLowerCase().includes(query) ||
           (item.cuisine && item.cuisine.toLowerCase().includes(query)) ||
           (item.category && item.category.toLowerCase().includes(query));
  });

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  const typeIcons = {
    restaurant: 'fa-utensils',
    hotel: 'fa-bed',
    activity: 'fa-person-hiking',
    entertainment: 'fa-film',
    outdoor: 'fa-tree',
    cultural: 'fa-landmark',
    sports: 'fa-futbol',
    wellness: 'fa-spa',
    adventure: 'fa-mountain',
    educational: 'fa-graduation-cap'
  };

  const typeColors = {
    restaurant: '#e74c3c',
    hotel: '#3498db',
    activity: '#2ecc71',
    entertainment: '#9b59b6',
    outdoor: '#27ae60',
    cultural: '#f39c12',
    sports: '#e67e22',
    wellness: '#1abc9c',
    adventure: '#8e44ad',
    educational: '#34495e'
  };

  return (
    <AppLayout title="Activity Planner">
      <div className="activity-planner-page bg-light min-vh-100">
        {/* Hero Section */}
        <div className="hero-section text-center py-5 mb-4 bg-gradient-primary text-white">
          <div className="container">
            <h1 className="display-4 fw-bold mb-3">Discover Amazing Activities</h1>
            <p className="lead">Find the perfect experience for your team</p>
          </div>
        </div>

        <div className="container">
          {/* Search Section */}
          <div className="search-section mb-4">
            <div className="search-hero position-relative mb-4 rounded-4 overflow-hidden shadow-lg">
              <div className="p-5 text-white">
                <h1 className="display-4 fw-bold mb-3">Discover Amazing Places</h1>
                <p className="lead mb-4">
                  Find the perfect restaurants, hotels, and activities for your team of {filters.teamSize} people
                </p>
                
                <div className="row g-3">
                  <div className="col-12 col-md-3">
                    <select 
                      className="form-select form-select-lg border-0 shadow-sm rounded-3"
                      value={filters.location} 
                      onChange={(e) => updateFilter('location', e.target.value)}
                    >
                      {(metadata?.availableCities ?? ['San Francisco', 'New York', 'Los Angeles', 'Chicago']).map((city: string) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="input-group input-group-lg">
                      <span className="input-group-text bg-white border-0 border-start-0">
                        <i className="fa-solid fa-search text-muted"></i>
                      </span>
                      <input 
                        type="text" 
                        className="form-control border-0 shadow-sm border-end-0" 
                        placeholder="Search for restaurants, hotels, activities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleSearchKeyPress}
                      />
                    </div>
                  </div>
                  <div className="col-12 col-md-3">
                    <button 
                      className="btn btn-lg btn-warning w-100 shadow-sm rounded-3"
                      onClick={applyFilters}
                      disabled={loading}
                    >
                      <i className="fa-solid fa-search me-2"></i>
                      {loading ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="d-flex gap-4 mt-4 flex-wrap">
                  <div className="d-flex align-items-center">
                    <i className="fa-solid fa-location-dot me-2"></i>
                    <span>{filters.location}</span>
                  </div>
                  <div className="d-flex align-items-center">
                    <i className="fa-solid fa-users me-2"></i>
                    <span>{filters.teamSize} people</span>
                  </div>
                  <div className="d-flex align-items-center">
                    <i className="fa-solid fa-database me-2"></i>
                    <span>{totalAvailable.toLocaleString()} places available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            {/* Filters Section */}
            {showFilters && (
              <div className="col-12 col-lg-3 mb-4">
                <div className="card border-0 shadow-sm rounded-4 p-4 filter-sticky">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0 fw-bold">Filters</h5>
                  </div>

                  {/* Type Filter */}
                  <div className="mb-4">
                    <h6 className="text-muted mb-3">Type</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {Object.keys(typeIcons).map((type) => (
                        <button
                          key={type}
                          className={`btn btn-sm rounded-pill ${filters.types.includes(type) ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => toggleFilter('types', type)}
                        >
                          <i className={`fa-solid ${typeIcons[type as keyof typeof typeIcons]} me-1`}></i>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Level */}
                  <div className="mb-4">
                    <h6 className="text-muted mb-3">Price Level</h6>
                    <div className="btn-group w-100" role="group">
                      {[1, 2, 3, 4].map(level => (
                        <button
                          key={level}
                          className={`btn ${filters.priceLevels.includes(level) ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => toggleFilter('priceLevels', level)}
                        >
                          {'$'.repeat(level)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="mb-4">
                    <h6 className="text-muted mb-3">Minimum Rating</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {[0, 3.5, 4, 4.5].map(rating => (
                        <button
                          key={rating}
                          className={`btn btn-sm rounded-pill ${filters.rating === rating ? 'btn-warning text-white' : 'btn-outline-warning'}`}
                          onClick={() => updateFilter('rating', rating)}
                        >
                          {rating === 0 ? 'Any' : `${rating}+`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Other Options */}
                  <div className="mb-4">
                    <div className="form-check">
                      <input 
                        type="checkbox" 
                        className="form-check-input"
                        id="openNow"
                        checked={filters.openNow}
                        onChange={(e) => updateFilter('openNow', e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="openNow">
                        Open Now
                      </label>
                    </div>
                  </div>

                  {/* Clear Filters */}
                                        <button 
                        className="btn btn-outline-secondary w-100 rounded-3"
                        onClick={clearFilters}
                      >
                        <i className="fa-solid fa-xmark me-2"></i>
                        Clear Filters
                      </button>
                </div>
              </div>
            )}

            {/* Results Section */}
            <div className={showFilters ? 'col-12 col-lg-9' : 'col-12'}>
              {/* Results Header */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="mb-1">
                    {loading ? 'Loading...' : `${filteredItems.length} Results`}
                  </h4>
                  <p className="text-muted mb-0">
                    {Object.entries(filters).filter(([k, v]) => 
                      Array.isArray(v) ? v.length > 0 : (k !== 'location' && k !== 'teamSize' && k !== 'sortBy' && v)
                    ).length} filters applied
                    {searchQuery && ` • Searching for "${searchQuery}"`}
                  </p>
                </div>
                
                <div className="d-flex gap-2 flex-wrap">
                  <button 
                    className="btn btn-outline-secondary rounded-3"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                                         <i className={`fa-solid fa-${showFilters ? 'xmark' : 'filter'} me-2`}></i>
                     {showFilters ? 'Hide' : 'Show'} Filters
                  </button>
                  
                  <div className="btn-group">
                    <button 
                      className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setViewMode('grid')}
                    >
                      <i className="fa-solid fa-grip"></i>
                    </button>
                    <button 
                      className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setViewMode('list')}
                    >
                      <i className="fa-solid fa-list"></i>
                    </button>
                  </div>
                  
                  <select 
                    className="form-select rounded-3" 
                    style={{width: 'auto'}}
                    value={filters.sortBy}
                    onChange={(e) => updateFilter('sortBy', e.target.value)}
                  >
                    <option value="relevance">Relevance</option>
                    <option value="rating">Rating</option>
                    <option value="price">Price: Low to High</option>
                    <option value="distance">Distance</option>
                  </select>
                </div>
              </div>

              {/* Error State */}
              {error && (
                <div className="alert alert-danger rounded-3" role="alert">
                                        <i className="fa-solid fa-triangle-exclamation me-2"></i>
                  <strong>Error:</strong> {error}
                  <button 
                    className="btn btn-outline-danger btn-sm ms-3 rounded-3"
                    onClick={() => {
                      setError(null);
                      fetchRecommendations();
                    }}
                  >
                    <i className="fa-solid fa-refresh me-1"></i>
                    Retry
                  </button>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="row g-3">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className={viewMode === 'grid' ? (showFilters ? 'col-12 col-sm-6 col-lg-6' : 'col-12 col-sm-6 col-lg-4 col-xl-3') : 'col-12'}>
                      <div className="card border-0 shadow-sm rounded-4 p-3">
                        <div className="placeholder-glow">
                          <div className="placeholder bg-secondary rounded-3" style={{height: viewMode === 'grid' ? 200 : 120}}></div>
                          <div className="mt-3">
                            <div className="placeholder col-7 mb-2"></div>
                            <div className="placeholder col-5"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Results Grid/List */}
              {!loading && !error && (
                <>
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="mb-4">
                        <i className="fa-solid fa-search fa-3x text-muted"></i>
                      </div>
                      <h4 className="text-muted mb-3">No activities found</h4>
                      <p className="text-muted mb-4">
                        Try adjusting your filters or search criteria
                      </p>
                      <button 
                        className="btn btn-primary rounded-3"
                        onClick={clearFilters}
                      >
                        <i className="fa-solid fa-refresh me-2"></i>
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    <div className="activities-grid">
                      <div className={`row g-3 ${viewMode === 'list' ? 'flex-column' : ''}`}>
                        {filteredItems.map((item) => (
                          <div 
                            key={item.id} 
                            className={viewMode === 'grid' ? (showFilters ? 'col-12 col-sm-6 col-lg-6' : 'col-12 col-sm-6 col-lg-4 col-xl-3') : 'col-12'}
                          >
                            <div className={`card border-0 shadow-sm h-100 hover-lift rounded-4 ${selected.some(x => x.id === item.id) ? 'border-primary border-2' : ''}`}>
                              {/* Image Section */}
                              <div className="position-relative overflow-visible" style={{height: viewMode === 'grid' ? 220 : 150}}>
                                <img 
                                  src={item.image || 'https://via.placeholder.com/400x300'} 
                                  alt={item.name}
                                  className="w-100 h-100 object-fit-cover rounded-top-4"
                                  onError={(e: any) => {
                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1200&auto=format&fit=crop';
                                  }}
                                />
                                
                                {/* Type Badge */}
                                <div className="position-absolute top-2 start-2">
                                  <span className="type-badge" style={{
                                    backgroundColor: typeColors[item.type],
                                    color: 'white'
                                  }}>
                                    <i className={`fa-solid ${typeIcons[item.type]} me-1`}></i>
                                    {item.type}
                                  </span>
                                </div>
                                
                                {/* Featured Badge */}
                                {item.featured && (
                                  <div className="position-absolute top-2 end-2">
                                    <span className="featured-badge">
                                      <i className="fa-solid fa-crown me-1"></i>
                                      Featured
                                    </span>
                                  </div>
                                )}
                                
                                {/* Open Status - Positioned to avoid overlap with type badge */}
                                <div className="position-absolute bottom-2 start-2" style={{maxWidth: 'calc(50% - 0.5rem)'}}>
                                  <span className={`status-badge ${item.openNow ? 'status-open' : 'status-closed'}`}>
                                    <i className={`fa-solid ${item.openNow ? 'fa-clock' : 'fa-times-circle'} me-1`}></i>
                                    {item.openNow ? 'Open Now' : 'Closed'}
                                  </span>
                                </div>
                                
                                {/* Rating Badge - Positioned in bottom-right to avoid overlap */}
                                <div className="position-absolute bottom-2 end-2" style={{maxWidth: 'calc(50% - 0.5rem)'}}>
                                  <span className="rating-badge">
                                    <i className="fa-solid fa-star me-1"></i>
                                    {item.rating.toFixed(1)}
                                  </span>
                                </div>
                              </div>

                              {/* Content Section */}
                              <div className="p-3 pt-4">
                                <div className={viewMode === 'grid' ? '' : 'd-flex justify-content-between align-items-start'}>
                                  <div className={viewMode === 'grid' ? '' : 'flex-grow-1'}>
                                    <h5 className="mb-2 fw-bold">{item.name}</h5>
                                    
                                    {/* Price Level */}
                                    <div className="d-flex align-items-center gap-3 mb-2">
                                      <span className="fw-semibold text-muted">Price Level: {'$'.repeat(item.priceLevel)}</span>
                                    </div>
                                    
                                    {/* Type-specific info */}
                                    {item.cuisine && (
                                      <div className="mb-2">
                                        <span className="text-muted">{item.cuisine}</span>
                                      </div>
                                    )}
                                    
                                    {item.category && (
                                      <div className="mb-2">
                                        <span className="text-muted">{item.category}</span>
                                      </div>
                                    )}
                                    
                                    {/* Location info */}
                                    <div className="d-flex align-items-center gap-3 text-muted small">
                                      <span><i className="fa-solid fa-location-dot me-1"></i>{item.location}</span>
                                    </div>
                                    
                                    {/* Description */}
                                    <p className="text-muted small mt-2">{item.description}</p>
                                  </div>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="d-flex gap-2 mt-3">
                                  <button 
                                    className={`btn btn-sm flex-grow-1 rounded-3 ${selected.some(x => x.id === item.id) ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                    onClick={() => {
                                      setSelected(prev => {
                                        const isSelected = prev.some(x => x.id === item.id);
                                        if (isSelected) {
                                          return prev.filter(x => x.id !== item.id);
                                        } else {
                                          if (prev.length >= 3) {
                                            alert('You can only compare up to 3 items at a time. Please remove an item first.');
                                            return prev;
                                          }
                                          return [...prev, item];
                                        }
                                      });
                                    }}
                                  >
                                    <i className={`me-1 ${selected.some(x => x.id === item.id) ? 'fa-solid fa-check' : 'fa-regular fa-square-plus'}`}></i>
                                    {selected.some(x => x.id === item.id) ? 'Selected' : 'Compare'}
                                  </button>
                                  <button 
                                    className="btn btn-secondary btn-sm flex-grow-1 rounded-3"
                                    onClick={async () => {
                                      await fetch('/api/activityplanner/shortlist', {
                                        method: 'POST',
                                        headers: buildHeaders(),
                                        body: JSON.stringify({ activityId: item.id })
                                      });
                                      window.dispatchEvent(new Event('shortlist-updated'));
                                    }}
                                  >
                                    <i className="fa-regular fa-heart me-1"></i>
                                    Shortlist
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Compare toolbar (appears when 2-3 items selected) */}
        {selected.length >= 2 && (
          <div className="compare-toolbar shadow-lg">
            <div className="container d-flex flex-wrap gap-2 align-items-center justify-content-between py-2">
              <div className="d-flex align-items-center gap-2">
                <i className="fa-solid fa-sliders"></i>
                <span className="fw-semibold">{selected.length} selected for comparison</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setSelected([])}>
                  <i className="fa-solid fa-times me-1"></i>
                  Clear
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCompareModal(true)}>
                  <i className="fa-solid fa-right-left me-1"></i>
                  Compare Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Simple comparison modal */}
        {showCompareModal && (
          <div className="compare-modal" role="dialog" aria-modal="true">
            <div className="compare-backdrop" onClick={() => setShowCompareModal(false)}></div>
            <div className="compare-dialog card shadow-lg">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Compare Items</h5>
                <button className="btn btn-sm btn-link text-muted" onClick={() => setShowCompareModal(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  {selected.map(sel => (
                    <div key={sel.id} className={`col-${12 / Math.min(selected.length, 3)}`}>
                      <div className="border rounded-3 p-3 h-100">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <h6 className="mb-0">{sel.name}</h6>
                          <button className="btn btn-sm btn-link text-danger p-0" onClick={() => setSelected(prev => prev.filter(x => x.id !== sel.id))}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                        <img
                          src={sel.image || 'https://via.placeholder.com/400x300'}
                          alt={sel.name}
                          className="w-100 rounded mb-2"
                          style={{ height: 120, objectFit: 'cover' }}
                          onError={(e: any) => {
                            e.currentTarget.src = 'https://via.placeholder.com/400x300';
                          }}
                        />
                        <div className="small text-muted mb-2 text-capitalize">
                          <i className={`fa-solid ${typeIcons[sel.type]} me-1`}></i>{sel.type}
                        </div>
                        <div className="d-flex flex-column gap-1 small">
                          <div><strong>Rating:</strong> {sel.rating?.toFixed?.(1) ?? '—'}</div>
                          <div><strong>Price:</strong> {'$'.repeat(sel.priceLevel || 0)}</div>
                          <div className="text-truncate"><strong>Location:</strong> {sel.location || '—'}</div>
                          {sel.cuisine && <div><strong>Cuisine:</strong> {sel.cuisine}</div>}
                          {sel.category && <div><strong>Category:</strong> {sel.category}</div>}
                          {Array.isArray(sel.amenities) && sel.amenities.length > 0 && (
                            <div>
                              <strong>Amenities:</strong>
                              <div className="d-flex flex-wrap gap-1 mt-1">
                                {sel.amenities.map((a, i) => (
                                  <span key={i} className="badge bg-light text-dark border">{a}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card-footer d-flex justify-content-end gap-2">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowCompareModal(false)}>Close</button>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCompareModal(false)}>Done</button>
              </div>
            </div>
          </div>
        )}

        <ShortlistCart />

        {/* Enhanced styling */}
        <style>{`
          .activity-planner-page {
            background: #f8f9fa;
          }
          
          .hero-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 3rem 0;
            margin-bottom: 2rem;
          }
          
          .search-hero {
            background: linear-gradient(135deg, rgba(231,76,60,0.9), rgba(52,152,219,0.9)), url(https://images.unsplash.com/photo-1533777324565-a040eb52fac1?q=80&w=1200&auto=format&fit=crop);
            background-size: cover;
            background-position: center;
          }
          
          .card {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 1rem;
            overflow: hidden;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          }
          
          .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          }
          
          .card.border-primary {
            border-color: #007bff !important;
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
          }
          
          .card img {
            transition: transform 0.3s ease;
          }
          
          .card:hover img {
            transform: scale(1.05);
          }
          
          .badge {
            font-weight: 600;
            letter-spacing: 0.5px;
          }
          
          .badge.rounded-pill {
            padding: 0.5rem 1rem;
          }
          
          .btn {
            border-radius: 0.5rem;
            font-weight: 500;
            transition: all 0.2s ease;
            border: 1px solid transparent;
          }
          
          .btn-sm {
            padding: 0.375rem 0.75rem;
            font-size: 0.875rem;
          }
          
          .btn-outline-secondary {
            border-color: #6c757d;
            color: #6c757d;
          }
          
          .btn-outline-secondary:hover {
            background-color: #6c757d;
            border-color: #6c757d;
            color: white;
          }
          
          .btn-secondary {
            background-color: #6c757d;
            border-color: #6c757d;
            color: white;
          }
          
          .btn-secondary:hover {
            background-color: #5a6268;
            border-color: #545b62;
            color: white;
          }
          
          .btn-outline-warning {
            border-color: #ffc107;
            color: #856404;
          }
          
          .btn-outline-warning:hover {
            background-color: #ffc107;
            border-color: #ffc107;
            color: #212529;
          }
          
          .btn-warning {
            background-color: #ffc107;
            border-color: #ffc107;
            color: #212529;
          }
          
          .btn-warning:hover {
            background-color: #e0a800;
            border-color: #d39e00;
            color: #212529;
          }
          
          .filter-sticky {
            background: white;
            border-radius: 1rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            max-height: calc(100vh - 120px);
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: #c1c1c1 #f1f1f1;
          }
          
          .filter-sticky::-webkit-scrollbar {
            width: 6px;
          }
          
          .filter-sticky::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
          }
          
          .filter-sticky::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
          }
          
          .filter-sticky::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
          
          .hover-lift {
            transition: all 0.3s ease;
          }
          
          .hover-lift:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          }
          
          .object-fit-cover {
            object-fit: cover;
          }
          
          .placeholder-glow {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
          }
          
          @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          
          .form-check-input {
            border-radius: 0.25rem;
          }
          
          .form-check-input:checked {
            background-color: #007bff;
            border-color: #007bff;
          }
          
          .form-control:focus,
          .form-select:focus {
            border-color: #007bff;
            box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
          }
          
          .btn-group .btn {
            border-radius: 0.375rem;
            margin-right: 2px;
          }
          
          .btn-group .btn:last-child {
            margin-right: 0;
          }
          
          .status-badge {
            background-color: #e0e0e0;
            color: #333;
            padding: 0.35rem 0.7rem;
            border-radius: 0.5rem;
            font-size: 0.8rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.15);
            transition: all 0.2s ease;
            z-index: 1000;
            position: relative;
            line-height: 1;
            white-space: nowrap;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .status-badge.status-open {
            background-color: #4CAF50;
            color: white;
          }

          .status-badge.status-closed {
            background-color: #F44336;
            color: white;
          }

          .status-badge:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          }

          .type-badge {
            background-color: #e74c3c;
            color: white;
            padding: 0.35rem 0.7rem;
            border-radius: 0.5rem;
            font-size: 0.8rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.15);
            z-index: 1000;
            position: relative;
            line-height: 1;
            white-space: nowrap;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .featured-badge {
            background-color: #f39c12;
            color: white;
            padding: 0.35rem 0.7rem;
            border-radius: 0.5rem;
            font-size: 0.8rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.15);
            z-index: 1000;
            position: relative;
            line-height: 1;
            white-space: nowrap;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .rating-badge {
            background-color: #28a745;
            color: white;
            padding: 0.35rem 0.7rem;
            border-radius: 0.5rem;
            font-size: 0.8rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.15);
            z-index: 1000;
            position: relative;
            line-height: 1;
            white-space: nowrap;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .card .position-relative {
            overflow: visible;
          }

          .card .position-absolute {
            z-index: 10;
          }

          .card .position-absolute .status-badge,
          .card .position-absolute .type-badge,
          .card .position-absolute .featured-badge,
          .card .position-absolute .rating-badge {
            z-index: 1000;
            pointer-events: auto;
          }

          .card {
            overflow: visible;
          }

          .card .position-relative {
            overflow: visible;
          }

          /* Prevent badge overlaps by using different corners */
          .card .position-absolute.top-2.start-2 {
            z-index: 1001;
            max-width: calc(50% - 0.5rem);
          }

          .card .position-absolute.top-2.end-2 {
            z-index: 1002;
            max-width: calc(50% - 0.5rem);
          }

          .card .position-absolute.bottom-2.start-2 {
            z-index: 1003;
            max-width: calc(50% - 0.5rem);
            left: 0.5rem;
          }

          .card .position-absolute.bottom-2.end-2 {
            z-index: 1004;
            max-width: calc(50% - 0.5rem);
            right: 0.5rem;
          }

          /* Ensure badges don't overlap horizontally */
          .card .position-absolute.bottom-2.start-2 .status-badge,
          .card .position-absolute.bottom-2.end-2 .rating-badge {
            width: 100%;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          /* Compare toolbar & modal */
          .compare-toolbar {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255,255,255,.98);
            border-top: 1px solid #e9ecef;
            z-index: 1060;
          }

          .compare-modal { 
            position: fixed; inset: 0; z-index: 1070; display:flex; align-items:center; justify-content:center; 
          }
          .compare-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.4); }
          .compare-dialog { position: relative; width: min(1000px, 96vw); max-height: 90vh; overflow:auto; border-radius: 12px; }

          @media (max-width: 576px) {
            .compare-dialog { width: 96vw; }
          }

          @media (max-width: 768px) {
            .hero-section { padding: 2rem 0; }
            .search-section .p-5 { padding: 2rem !important; }
            .card { margin-bottom: 1rem; }
            .filter-sticky { position: static !important; max-height: none !important; }
            .d-flex.gap-4 { gap: 1rem !important; }
            /* Keep compare toolbar above shortlist */
            .compare-toolbar { z-index: 1110; }
          }
        `}</style>
      </div>
    </AppLayout>
  );
}; 
