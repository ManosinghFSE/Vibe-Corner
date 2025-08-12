import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../layout/AppLayout';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import { ThemeSelector } from '../../components/ThemeProvider/ThemeSelector';
import { ParticlesBackground } from '../../components/InteractiveElements/ParticlesBackground';
import { useAuth } from '../auth/AuthContext';
import './StoryCraft.css';

interface Story {
  id: string;
  title: string;
  theme: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface Scene {
  id: string;
  story_id: string;
  title: string;
  content: string;
  media: string[];
  order_index: number;
  branch_to?: string;
  updated_at: string;
}

// Rich Text Editor Component
const RichTextEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  
  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="rich-editor-container">
      <div className="editor-toolbar">
        <button className="toolbar-btn" onClick={() => handleFormat('bold')} title="Bold">
          <i className="fas fa-bold"></i>
        </button>
        <button className="toolbar-btn" onClick={() => handleFormat('italic')} title="Italic">
          <i className="fas fa-italic"></i>
        </button>
        <button className="toolbar-btn" onClick={() => handleFormat('underline')} title="Underline">
          <i className="fas fa-underline"></i>
        </button>
        <div className="toolbar-separator"></div>
        <button className="toolbar-btn" onClick={() => handleFormat('justifyLeft')} title="Align Left">
          <i className="fas fa-align-left"></i>
        </button>
        <button className="toolbar-btn" onClick={() => handleFormat('justifyCenter')} title="Align Center">
          <i className="fas fa-align-center"></i>
        </button>
        <button className="toolbar-btn" onClick={() => handleFormat('justifyRight')} title="Align Right">
          <i className="fas fa-align-right"></i>
        </button>
        <div className="toolbar-separator"></div>
        <button className="toolbar-btn" onClick={() => handleFormat('insertUnorderedList')} title="Bullet List">
          <i className="fas fa-list-ul"></i>
        </button>
        <button className="toolbar-btn" onClick={() => handleFormat('insertOrderedList')} title="Numbered List">
          <i className="fas fa-list-ol"></i>
        </button>
      </div>
      <div
        ref={editorRef}
        className="rich-editor"
        contentEditable
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={() => onChange(editorRef.current?.innerHTML || '')}
        placeholder={placeholder}
      />
    </div>
  );
};

// Scene Card Component with Parallax Effect
const SceneCard: React.FC<{
  scene: Scene;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onEdit: () => void;
  onBranch: () => void;
}> = ({ scene, index, isActive, onClick, onEdit, onBranch }) => {
  const { currentTheme } = useTheme();
  
  return (
    <div 
      className={`scene-card ${isActive ? 'active' : ''} theme-${currentTheme}`}
      onClick={onClick}
      style={{
        transform: `translateZ(${index * 50}px)`,
        animationDelay: `${index * 0.1}s`
      }}
    >
      <div className="scene-header">
        <h4>{scene.title || `Scene ${index + 1}`}</h4>
        <div className="scene-actions">
          <button className="btn btn-sm btn-outline-primary" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <i className="fas fa-edit"></i>
          </button>
          <button className="btn btn-sm btn-outline-secondary" onClick={(e) => { e.stopPropagation(); onBranch(); }}>
            <i className="fas fa-code-branch"></i>
          </button>
        </div>
      </div>
      <div className="scene-preview" dangerouslySetInnerHTML={{ __html: scene.content.substring(0, 150) + '...' }} />
      {scene.media && scene.media.length > 0 && (
        <div className="scene-media-indicator">
          <i className="fas fa-image"></i> {scene.media.length}
        </div>
      )}
    </div>
  );
};

// Story Timeline with Parallax Scrolling
const StoryTimeline: React.FC<{
  scenes: Scene[];
  activeSceneId: string;
  onSceneSelect: (scene: Scene) => void;
  onSceneEdit: (scene: Scene) => void;
  onSceneBranch: (scene: Scene) => void;
}> = ({ scenes, activeSceneId, onSceneSelect, onSceneEdit, onSceneBranch }) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleScroll = () => {
      if (!timelineRef.current) return;
      const scrollY = window.scrollY;
      timelineRef.current.style.transform = `translateY(${scrollY * 0.5}px)`;
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="story-timeline" ref={timelineRef}>
      <div className="timeline-track">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="timeline-node">
            <SceneCard
              scene={scene}
              index={index}
              isActive={scene.id === activeSceneId}
              onClick={() => onSceneSelect(scene)}
              onEdit={() => onSceneEdit(scene)}
              onBranch={() => onSceneBranch(scene)}
            />
            {index < scenes.length - 1 && <div className="timeline-connector" />}
          </div>
        ))}
      </div>
    </div>
  );
};

// Scene Editor Modal
const SceneEditor: React.FC<{
  scene?: Scene;
  storyId: string;
  onSave: (scene: Scene) => void;
  onClose: () => void;
}> = ({ scene, storyId, onSave, onClose }) => {
  const [title, setTitle] = useState(scene?.title || '');
  const [content, setContent] = useState(scene?.content || '');
  const [saving, setSaving] = useState(false);
  const { getAuthHeader } = useAuth();

  const handleSave = async () => {
    setSaving(true);
    try {
      const sceneData = {
        id: scene?.id,
        title,
        content,
        media: scene?.media || [],
        orderIndex: scene?.order_index || 0,
        branchTo: scene?.branch_to
      };

      const response = await fetch(`/api/storycraft/stories/${storyId}/scenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(sceneData)
      });

      if (response.ok) {
        const { scene: savedScene } = await response.json();
        onSave(savedScene);
        onClose();
      }
    } catch (error) {
      console.error('Failed to save scene:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{scene ? 'Edit Scene' : 'New Scene'}</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Scene Title</label>
              <input
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter scene title..."
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Content</label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Write your scene..."
              />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Scene'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Story List Component
const StoryList: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const { getAuthHeader } = useAuth();
  const { currentTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await fetch('/api/storycraft/stories', {
        headers: getAuthHeader()
      });
      if (response.ok) {
        const { stories } = await response.json();
        setStories(stories);
      }
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const createStory = async () => {
    try {
      const response = await fetch('/api/storycraft/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ title: newStoryTitle || 'Untitled Story', theme: currentTheme })
      });
      
      if (response.ok) {
        const { story } = await response.json();
        navigate(`/storycraft/${story.id}`);
      }
    } catch (error) {
      console.error('Failed to create story:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border"></div></div>;
  }

  return (
    <div className="story-list-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>My Stories</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <i className="fas fa-plus me-2"></i>New Story
        </button>
      </div>

      {stories.length === 0 ? (
        <div className="empty-state text-center py-5">
          <i className="fas fa-book-open fa-4x text-muted mb-3"></i>
          <h4>No stories yet</h4>
          <p className="text-muted">Create your first interactive story!</p>
        </div>
      ) : (
        <div className="row g-4">
          {stories.map((story) => (
            <div key={story.id} className="col-md-6 col-lg-4">
              <div 
                className={`story-card theme-${story.theme} h-100`}
                onClick={() => navigate(`/storycraft/${story.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="story-card-header">
                  <h5>{story.title}</h5>
                  <span className="badge bg-secondary">{story.theme}</span>
                </div>
                <div className="story-card-body">
                  <p className="text-muted small">
                    Created {new Date(story.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Story</h5>
                <button className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Story Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newStoryTitle}
                    onChange={(e) => setNewStoryTitle(e.target.value)}
                    placeholder="Enter story title..."
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Theme</label>
                  <p className="text-muted small">Current theme: {currentTheme}</p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={createStory}>Create Story</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Story Editor Component
const StoryEditor: React.FC<{ storyId: string }> = ({ storyId }) => {
  const [story, setStory] = useState<Story | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeScene, setActiveScene] = useState<Scene | null>(null);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [showSceneEditor, setShowSceneEditor] = useState(false);
  const { getAuthHeader } = useAuth();
  const { currentTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStory();
  }, [storyId]);

  const fetchStory = async () => {
    try {
      const response = await fetch(`/api/storycraft/stories/${storyId}`, {
        headers: getAuthHeader()
      });
      if (response.ok) {
        const { story, scenes } = await response.json();
        setStory(story);
        setScenes(scenes);
        if (scenes.length > 0) setActiveScene(scenes[0]);
      }
    } catch (error) {
      console.error('Failed to fetch story:', error);
    }
  };

  const handleSceneSave = (savedScene: Scene) => {
    if (editingScene) {
      setScenes(scenes.map(s => s.id === savedScene.id ? savedScene : s));
    } else {
      setScenes([...scenes, savedScene]);
    }
    fetchStory(); // Refresh to get proper ordering
  };

  const handleNewScene = () => {
    setEditingScene(null);
    setShowSceneEditor(true);
  };

  const handleEditScene = (scene: Scene) => {
    setEditingScene(scene);
    setShowSceneEditor(true);
  };

  const handleBranchScene = (parentScene: Scene) => {
    // Create a new scene that branches from the parent
    const newScene = {
      ...parentScene,
      id: undefined,
      title: `${parentScene.title} (Branch)`,
      branch_to: parentScene.id,
      order_index: scenes.length
    };
    setEditingScene(newScene as any);
    setShowSceneEditor(true);
  };

  if (!story) {
    return <div className="text-center py-5"><div className="spinner-border"></div></div>;
  }

  return (
    <div className={`story-editor-container theme-${currentTheme}`}>
      <div className="story-header-parallax">
        <div className="parallax-layer" style={{ transform: 'translateZ(-100px) scale(2)' }}>
          <ParticlesBackground />
        </div>
        <div className="parallax-layer" style={{ transform: 'translateZ(0)' }}>
          <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <button className="btn btn-link text-white" onClick={() => navigate('/storycraft')}>
                  <i className="fas fa-arrow-left me-2"></i>Back to Stories
                </button>
                <h1 className="text-white mb-0">{story.title}</h1>
                <span className="badge bg-light text-dark">{story.theme}</span>
              </div>
              <button className="btn btn-light" onClick={handleNewScene}>
                <i className="fas fa-plus me-2"></i>Add Scene
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="story-content">
        {scenes.length === 0 ? (
          <div className="empty-state text-center py-5">
            <i className="fas fa-feather-alt fa-4x text-muted mb-3"></i>
            <h4>Start Writing Your Story</h4>
            <p className="text-muted">Add your first scene to begin the adventure!</p>
            <button className="btn btn-primary" onClick={handleNewScene}>
              <i className="fas fa-plus me-2"></i>Add First Scene
            </button>
          </div>
        ) : (
          <>
            <StoryTimeline
              scenes={scenes}
              activeSceneId={activeScene?.id || ''}
              onSceneSelect={setActiveScene}
              onSceneEdit={handleEditScene}
              onSceneBranch={handleBranchScene}
            />
            
            {activeScene && (
              <div className="active-scene-viewer">
                <h2>{activeScene.title}</h2>
                <div className="scene-content" dangerouslySetInnerHTML={{ __html: activeScene.content }} />
              </div>
            )}
          </>
        )}
      </div>

      {showSceneEditor && (
        <SceneEditor
          scene={editingScene || undefined}
          storyId={storyId}
          onSave={handleSceneSave}
          onClose={() => {
            setShowSceneEditor(false);
            setEditingScene(null);
          }}
        />
      )}
    </div>
  );
};

// Main StoryCraft Page Component
export const StoryCraftPage: React.FC = () => {
  const { id } = useParams();

  return (
    <ThemeProvider>
      <AppLayout title="StoryCraft - Interactive Story Builder">
        <div className="storycraft-page">
          <div className="parallax-container">
            <div className="parallax-layer background-layer">
              <ParticlesBackground />
            </div>
            <div className="parallax-layer content-layer">
              <div className="container-fluid py-3">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h1 className="page-title">
                    <i className="fas fa-book-open me-2"></i>StoryCraft
                  </h1>
                  <ThemeSelector />
                </div>
                
                {id ? <StoryEditor storyId={id} /> : <StoryList />}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </ThemeProvider>
  );
};

export default StoryCraftPage; 