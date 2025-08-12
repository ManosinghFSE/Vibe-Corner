import React, { useState, useEffect } from 'react';
import { AppLayout } from '../layout/AppLayout';
import { useAuth } from '../auth/AuthContext';
import './SkillSwap.css';

interface Skill {
  id: string;
  userEmail: string;
  skill: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  experience: number;
  availability: 'Available' | 'Busy' | 'Limited' | 'Not Available';
  description: string;
  createdAt: string;
}

interface SkillMatch {
  id: string;
  requestId: string;
  requesterEmail: string;
  helperEmail: string;
  skill: string;
  matchScore: number;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Completed';
  createdAt: string;
}

export const SkillSwapPage: React.FC = () => {
  const { user, getAuthHeader } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [mySkills, setMySkills] = useState<Skill[]>([]);
  const [matches, setMatches] = useState<SkillMatch[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      
      const [skillsRes, mySkillsRes, matchesRes] = await Promise.all([
        fetch('/api/skillswap/skills', { headers: getAuthHeader() }),
        fetch('/api/skillswap/my-skills', { headers: getAuthHeader() }),
        fetch('/api/skillswap/matches', { headers: getAuthHeader() })
      ]);
      
      const [skillsData, mySkillsData, matchesData] = await Promise.all([
        skillsRes.json(),
        mySkillsRes.json(),
        matchesRes.json()
      ]);
      
      setSkills(skillsData.skills || []);
      setMySkills(mySkillsData.skills || []);
      setMatches(matchesData.matches || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddSkill = async (skillData: any) => {
    try {
      setLoading(true);
      const res = await fetch('/api/skillswap/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(skillData)
      });
      
      if (res.ok) {
        const created = await res.json();
        const createdSkill: Skill = created.skill;
        setSkills(prev => [...prev, createdSkill]);
        setShowAddSkill(false);
        
        const successMessage = document.createElement('div');
        successMessage.className = 'alert alert-success position-fixed';
        successMessage.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        successMessage.innerHTML = `
          <i class="fa-solid fa-check-circle me-2"></i>
          Skill "${skillData.skill}" added successfully!
        `;
        document.body.appendChild(successMessage);
        
        setTimeout(() => {
          if (successMessage.parentNode) {
            successMessage.parentNode.removeChild(successMessage);
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to add skill:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const categories = ['All', 'Programming', 'Design', 'Business', 'Creative', 'Language', 'Technical', 'Soft Skills'];
  const filteredSkills = selectedCategory === 'All' 
    ? skills 
    : skills.filter(s => s.category === selectedCategory);

  return (
    <AppLayout>
      <div className="skillswap-container">
        <div className="container-fluid">
          {/* Header */}
          <div className="header-section mb-4">
            <h1 className="display-6">Skill Swap Exchange</h1>
            <p className="text-muted">Share your expertise, learn new skills from your team</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddSkill(true)}
            >
              <i className="fas fa-plus me-2"></i>
              Add Your Skills
            </button>
          </div>

          {/* Categories */}
          <div className="categories-section mb-4">
            <div className="d-flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  className={`category-btn btn ${
                    selectedCategory === category ? 'btn-primary' : 'btn-outline-primary'
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="row">
            {/* Skills Grid */}
            <div className="col-lg-8">
              <h3 className="mb-3">Available Skills</h3>
              <div className="skills-grid row g-3">
                {filteredSkills.map((skill) => (
                  <div key={skill.id} className="col-md-6">
                    <div className="skill-card card h-100">
                      <div className="card-body">
                        <div className="d-flex align-items-start mb-3">
                          <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3" style={{ width: '48px', height: '48px' }}>
                            <i className="fas fa-user"></i>
                          </div>
                          <div className="flex-grow-1">
                            <h5 className="card-title mb-1">{skill.skill}</h5>
                            <p className="text-muted small mb-0">by {skill.userEmail}</p>
                          </div>
                          <span className={`badge bg-${
                            skill.level === 'Expert' ? 'danger' : 
                            skill.level === 'Advanced' ? 'warning' : 
                            skill.level === 'Intermediate' ? 'info' : 'secondary'
                          }`}>
                            {skill.level}
                          </span>
                        </div>
                        
                        <p className="card-text">{skill.description}</p>
                        
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            <i className="fas fa-clock me-1"></i>
                            {skill.availability}
                          </small>
                          {/* Action disabled until a proper flow (exchange/request) is added */}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Matches Section */}
            <div className="col-lg-4">
              <h3 className="mb-3">Your Matches</h3>
              <div className="matches-section">
                {matches.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <i className="fas fa-handshake fa-3x mb-3"></i>
                    <p>No matches yet. Add your skills to get started!</p>
                  </div>
                ) : (
                  matches.map(match => (
                    <div key={match.id} className="match-card card mb-3">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="mb-1">{match.skill}</h6>
                            <p className="text-muted small mb-2">
                              Requester: {match.requesterEmail}<br/>
                              Helper: {match.helperEmail}
                            </p>
                            <span className={`badge bg-${
                              match.status === 'Completed' ? 'success' :
                              match.status === 'Accepted' ? 'info' :
                              match.status === 'Rejected' ? 'danger' : 'warning'
                            }`}>
                              {match.status}
                            </span>
                          </div>
                          <div className="text-end">
                            <div className="match-score">
                              <i className="fas fa-star text-warning"></i>
                              {match.matchScore}% match
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add Skill Modal */}
        {showAddSkill && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add Your Skill</h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setShowAddSkill(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleAddSkill({
                      skill: formData.get('skill'),
                      description: formData.get('description'),
                      category: formData.get('category'),
                      level: formData.get('level'),
                      experience: Number(formData.get('experience') || 1)
                    });
                  }}>
                    <div className="mb-3">
                      <label className="form-label">Skill</label>
                      <input type="text" className="form-control" name="skill" required />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <textarea className="form-control" name="description" rows={3} required></textarea>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Category</label>
                        <select className="form-select" name="category" required>
                          {categories.filter(c => c !== 'All').map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="col-md-6">
                        <label className="form-label">Your Level</label>
                        <select className="form-select" name="level" required>
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                          <option value="Expert">Expert</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Years of Experience</label>
                      <input type="number" min={1} className="form-control" name="experience" placeholder="e.g. 3" />
                    </div>
                    
                    <div className="d-flex justify-content-end gap-2">
                      <button type="button" className="btn btn-secondary" 
                        onClick={() => setShowAddSkill(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Add Skill
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}; 