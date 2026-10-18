import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  }[size];

  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/25 transition-transform hover:scale-105 ${sizeClasses} ${className}`}
    >
      {/* Inner background with subtle sheen */}
      <div className="h-full w-full rounded-[14px] bg-slate-900/10 backdrop-blur-xs flex items-center justify-center overflow-hidden relative">
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/20" />
        
        {/* Unique Custom SVG Campus Shield & Smart Nodes Emblem */}
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-[70%] w-[70%] text-white drop-shadow-sm"
        >
          {/* Hexagonal Shield Contour */}
          <path
            d="M20 4L33 10V22C33 29 27.5 35 20 37C12.5 35 7 29 7 22V10L20 4Z"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Smart Campus Central Architectural Spire & Graduation Peak */}
          <path
            d="M20 9L27 15L20 18L13 15L20 9Z"
            fill="currentColor"
          />
          {/* Modern Building Columns / Signal Nodes */}
          <path
            d="M15 20V27M20 21V29M25 20V27"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Foundation Base Beam */}
          <path
            d="M13 30H27"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Smart Connectivity Pulse Dot */}
          <circle cx="20" cy="11.5" r="1.5" fill="#38bdf8" />
        </svg>
      </div>
    </div>
  );
};

export default BrandLogo;
