import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon = 'fa-inbox', 
  title, 
  description, 
  action 
}) => {
  return (
    <div className="empty-state">
      <i className={`fa-solid ${icon}`}></i>
      <h5>{title}</h5>
      {description && <p>{description}</p>}
      {action && (
        <button 
          className="btn btn-primary mt-3"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}; 
