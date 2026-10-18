import React from 'react';
import type { IComplaint } from '../../types/index';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { MapPin, ThumbsUp, ArrowRight, User, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const isVideoUrl = (url: string) => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext) || url.includes('/video/'));
};

interface ComplaintCardProps {
  complaint: IComplaint;
  onSelect: (complaint: IComplaint) => void;
  onUpvote?: (id: string, e: React.MouseEvent) => void;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint, onSelect, onUpvote }) => {
  const { user } = useAuth();
  const hasUpvoted = user && complaint.upvotes?.includes(user.id || user._id || '');

  return (
    <div
      onClick={() => onSelect(complaint)}
      className="glass-card glass-card-hover rounded-xl p-5 cursor-pointer flex flex-col justify-between group"
    >
      <div>
        {/* Top Header: Ticket ID, Priority & Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {complaint.ticketId}
            </span>
            <PriorityBadge priority={complaint.priority} />
            {(complaint.isEmergency || complaint.emergencyAlertSent || (typeof complaint.category === 'object' && complaint.category?.name?.toLowerCase().includes('women')) || complaint.categoryName?.toLowerCase().includes('women')) && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping inline-block" />
                🚨 SOS / SMS SENT
              </span>
            )}
            {complaint.isAnonymous && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full shadow-2xs">
                <Lock className="h-2.5 w-2.5 text-amber-700" />
                Anonymous
              </span>
            )}
          </div>
          <StatusBadge status={complaint.status} />
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1">
          {complaint.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed font-medium">
          {complaint.description}
        </p>

        {/* Image & Location Preview */}
        <div className="flex items-center gap-3 mb-4">
          {complaint.beforeImages && complaint.beforeImages.length > 0 ? (
            isVideoUrl(complaint.beforeImages[0]) ? (
              <video
                src={complaint.beforeImages[0]}
                className="h-16 w-20 object-cover rounded-lg border border-slate-200 bg-slate-50"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={complaint.beforeImages[0]}
                alt="Issue Before Repair"
                className="h-16 w-20 object-cover rounded-lg border border-slate-200 bg-slate-50"
              />
            )
          ) : (
            <div className="h-16 w-20 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-medium">
              No Photo
            </div>
          )}

          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <MapPin className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
              <span className="truncate font-semibold">
                {complaint.locationDetails?.buildingName} • {complaint.locationDetails?.roomNumber}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              {complaint.isAnonymous ? (
                <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  <Lock className="h-2.5 w-2.5 text-amber-600" />
                  {complaint.reportedByName || 'Anonymous Reporter'}
                </span>
              ) : (
                <>
                  <User className="h-3 w-3 text-indigo-500" />
                  <span>Reported by {complaint.reportedByName || 'Student'}</span>
                </>
              )}
            </div>

            {complaint.assignedDepartment && (
              <div className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded inline-block border border-purple-200">
                Dept: {complaint.assignedDepartment}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer: Upvote & View CTA */}
      <div className="pt-3 border-t border-slate-150 flex items-center justify-between text-xs">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onUpvote) onUpvote(complaint._id, e);
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all cursor-pointer ${
            hasUpvoted
              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-blue-300'
          }`}
        >
          <ThumbsUp className={`h-3.5 w-3.5 ${hasUpvoted ? 'fill-current' : ''}`} />
          <span className="font-bold text-xs">{complaint.upvotes?.length || 0}</span>
          <span className="text-[10px] opacity-80 font-medium">Upvotes</span>
        </button>

        <div className="flex items-center gap-1 text-blue-600 text-xs font-semibold group-hover:translate-x-1 transition-transform">
          <span>Details</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
};
