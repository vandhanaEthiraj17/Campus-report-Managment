import React from 'react';
import type { ComplaintStatus } from '../../types/index';

interface StatusBadgeProps {
  status: ComplaintStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const styles: Record<ComplaintStatus, string> = {
    Reported: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    Assigned: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    Accepted: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    'In Progress': 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse',
    Resolved: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
    Verified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Closed: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    Escalated: 'bg-rose-500/20 text-rose-400 border-rose-500/50 font-bold',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-medium',
    lg: 'text-sm px-3.5 py-1.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${styles[status] || styles.Reported} ${
        sizeClasses[size]
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  );
};
