
import React from 'react';

export const APP_NAME = "Ibrahim AI Pro";

export const Logo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg`}>
    <GreenStarLogo className="w-4/5 h-4/5 text-white" />
  </div>
);

// Fallback Green Star SVG based on the user's uploaded image
export const GreenStarLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path 
      d="M50 5C50 5 55 45 95 50C55 55 50 95 50 95C50 95 45 55 5 50C45 45 50 5 50 5Z" 
      fill="url(#green_grad)"
    />
    <defs>
      <radialGradient id="green_grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(50 50) rotate(90) scale(45)">
        <stop stopColor="#bfff00" />
        <stop offset="1" stopColor="#006400" />
      </radialGradient>
    </defs>
  </svg>
);
