import React from 'react';
import { useCollaboration } from './CollaborationProvider';
import { useAuth } from '../auth/AuthContext';

export const CollaborationDebug: React.FC = () => {
  const { user, accessToken } = useAuth();
  const { isConnected, socket, currentSession } = useCollaboration();

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 9999 }}>
      <div className="card shadow-sm" style={{ minWidth: '250px' }}>
        <div className="card-body small">
          <h6 className="card-title mb-2">Collaboration Debug</h6>
          <div className="mb-1">
            <strong>Auth:</strong>{' '}
            <span className={user ? 'text-success' : 'text-danger'}>
              {user ? `✓ ${user.name}` : '✗ Not authenticated'}
            </span>
          </div>
          <div className="mb-1">
            <strong>Token:</strong>{' '}
            <span className={accessToken ? 'text-success' : 'text-danger'}>
              {accessToken ? '✓ Present' : '✗ Missing'}
            </span>
          </div>
          <div className="mb-1">
            <strong>Socket:</strong>{' '}
            <span className={socket ? 'text-success' : 'text-danger'}>
              {socket ? '✓ Created' : '✗ Not created'}
            </span>
          </div>
          <div className="mb-1">
            <strong>Connected:</strong>{' '}
            <span className={isConnected ? 'text-success' : 'text-danger'}>
              {isConnected ? '✓ Connected' : '✗ Disconnected'}
            </span>
          </div>
          <div>
            <strong>Session:</strong>{' '}
            <span className={currentSession ? 'text-success' : 'text-warning'}>
              {currentSession ? currentSession.name : 'None'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}; 
