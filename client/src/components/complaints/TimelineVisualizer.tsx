import React from 'react';
import type { ITimelineEvent, ComplaintStatus } from '../../types/index';
import { CheckCircle2, Clock, AlertCircle, ShieldCheck, UserCheck, Wrench } from 'lucide-react';

interface TimelineVisualizerProps {
  timeline: ITimelineEvent[];
  currentStatus: ComplaintStatus;
}

export const TimelineVisualizer: React.FC<TimelineVisualizerProps> = ({ timeline, currentStatus }) => {
  const steps: ComplaintStatus[] = [
    'Reported',
    'Assigned',
    'Accepted',
    'In Progress',
    'Resolved',
    'Closed',
  ];

  const getStepIndex = (status: ComplaintStatus): number => {
    if (status === 'Verified') return 5;
    return steps.indexOf(status);
  };

  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="w-full py-4">
      {/* Step Progress Bar */}
      <div className="relative flex items-center justify-between mb-8">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full z-0" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full z-0 transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, (currentIndex / (steps.length - 1)) * 100))}%` }}
        />

        {steps.map((step, idx) => {
          const isDone = idx < currentIndex || currentStatus === 'Closed' || currentStatus === 'Verified';
          const isCurrent = idx === currentIndex && currentStatus !== 'Closed' && currentStatus !== 'Verified';

          return (
            <div key={step} className="relative z-10 flex flex-col items-center">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                  isDone
                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/10'
                    : isCurrent
                    ? 'bg-blue-600 border-blue-400 text-white ring-4 ring-blue-500/10 animate-pulse'
                    : 'bg-white border-slate-200 text-slate-400 shadow-sm'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : isCurrent ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-[11px] mt-2 font-semibold tracking-tight text-center ${
                  isDone ? 'text-emerald-600' : isCurrent ? 'text-blue-600 font-bold' : 'text-slate-400'
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Detailed Log History */}
      <div className="space-y-3 mt-6 border-t border-slate-150 pt-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Audit History & Event Trail</h4>
        <div className="space-y-2.5">
          {timeline.map((event, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs shadow-sm"
            >
              <div className="mt-0.5 text-blue-600">
                {event.status === 'Reported' && <AlertCircle className="h-4 w-4 text-blue-500" />}
                {event.status === 'Assigned' && <UserCheck className="h-4 w-4 text-purple-500" />}
                {event.status === 'Accepted' && <Clock className="h-4 w-4 text-indigo-500" />}
                {event.status === 'In Progress' && <Wrench className="h-4 w-4 text-amber-500" />}
                {event.status === 'Resolved' && <CheckCircle2 className="h-4 w-4 text-teal-500" />}
                {(event.status === 'Closed' || event.status === 'Verified') && <ShieldCheck className="h-4 w-4 text-emerald-500" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{event.status}</span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {new Date(event.timestamp).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {event.updatedByName && (
                  <p className="text-[11px] text-blue-650 font-semibold mt-0.5">By: {event.updatedByName}</p>
                )}
                {event.remarks && <p className="text-slate-600 mt-1 bg-white p-1.5 rounded border border-slate-200 font-medium leading-relaxed">{event.remarks}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
