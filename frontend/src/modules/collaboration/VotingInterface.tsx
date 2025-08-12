import React, { useState } from 'react';
import { useCollaboration } from './CollaborationProvider';
import clsx from 'clsx';

interface VotingInterfaceProps {
  itemId: string;
  currentVote?: 'up' | 'down' | null;
}

export const VotingInterface: React.FC<VotingInterfaceProps> = ({ itemId, currentVote }) => {
  const { vote, currentSession } = useCollaboration();
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(currentVote || null);
  
  const votes = currentSession?.votes[itemId] || { upvotes: 0, downvotes: 0, total: 0, voters: [] };
  const votingEnabled = currentSession?.settings.votingEnabled ?? true;
  
  const handleVote = (voteType: 'up' | 'down') => {
    if (!votingEnabled) return;
    
    const newVote = userVote === voteType ? null : voteType;
    setUserVote(newVote);
    vote(itemId, newVote);
  };
  
  const upvotePercentage = votes.upvotes + votes.downvotes > 0
    ? (votes.upvotes / (votes.upvotes + votes.downvotes)) * 100
    : 50;
  
  return (
    <div className="voting-interface">
      <div className="d-flex align-items-center gap-3">
        {/* Upvote button */}
        <button
          className={clsx('btn btn-sm', {
            'btn-success': userVote === 'up',
            'btn-outline-success': userVote !== 'up'
          })}
          onClick={() => handleVote('up')}
          disabled={!votingEnabled}
          title="Upvote"
        >
          <i className="fa-solid fa-thumbs-up me-1"></i>
          {votes.upvotes}
        </button>
        
        {/* Vote bar */}
        <div className="vote-bar" style={{ width: 100, height: 8 }}>
          <div className="progress" style={{ height: '100%' }}>
            <div 
              className="progress-bar bg-success"
              style={{ width: `${upvotePercentage}%` }}
              role="progressbar"
              aria-valuenow={upvotePercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
            <div 
              className="progress-bar bg-danger"
              style={{ width: `${100 - upvotePercentage}%` }}
            />
          </div>
        </div>
        
        {/* Downvote button */}
        <button
          className={clsx('btn btn-sm', {
            'btn-danger': userVote === 'down',
            'btn-outline-danger': userVote !== 'down'
          })}
          onClick={() => handleVote('down')}
          disabled={!votingEnabled}
          title="Downvote"
        >
          <i className="fa-solid fa-thumbs-down me-1"></i>
          {votes.downvotes}
        </button>
        
        {/* Total score */}
        <span className={clsx('badge', {
          'bg-success': votes.total > 0,
          'bg-danger': votes.total < 0,
          'bg-secondary': votes.total === 0
        })}>
          {votes.total > 0 ? '+' : ''}{votes.total}
        </span>
      </div>
      
      {/* Voters list (if not anonymous) */}
      {!currentSession?.settings.anonymousVoting && votes.voters?.length > 0 && (
        <div className="voters-list mt-2">
          <small className="text-muted">
            Voted: {votes.voters.slice(0, 3).join(', ')}
            {votes.voters.length > 3 && ` +${votes.voters.length - 3} more`}
          </small>
        </div>
      )}
    </div>
  );
}; 
