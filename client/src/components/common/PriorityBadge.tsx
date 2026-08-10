import React from 'react';
import type { ComplaintPriority } from '../../types/index';

interface PriorityBadgeProps {
  priority: ComplaintPriority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const styles: Record<ComplaintPriority, string> = {
    Low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    Medium: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    High: 'bg-amber-500/15 text-amber-400 border-amber-500/40 font-medium',
    Urgent: 'bg-rose-500/20 text-rose-300 border-rose-500/60 font-bold animate-pulse',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border text-xs px-2 py-0.5 ${
        styles[priority] || styles.Medium
      }`}
    >
      <span className="font-semibold uppercase tracking-wider text-[10px]">{priority}</span>
    </span>
  );
};
