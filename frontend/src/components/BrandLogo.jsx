import React from 'react';

const SIZES = {
  sm: 'w-6 h-6',
  md: 'w-7 h-7',
  lg: 'w-9 h-9'
};

/**
 * Custom CEMS geometric hexagonal shield + emblem mark.
 */
export default function BrandLogo({ size = 'md', className = '' }) {
  const boxCls = SIZES[size] || SIZES.md;

  return (
    <div
      className={`${boxCls} rounded-none bg-black dark:bg-white text-white dark:text-black flex items-center justify-center border border-zinc-800 dark:border-zinc-200 flex-shrink-0 ${className}`}
      aria-label="CEMS Logo"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-[68%] h-[68%]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2.5L20 7V17L12 21.5L4 17V7L12 2.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="miter"
        />
        <path
          d="M15.2 9.4C14.4 8.5 13.3 8 12 8C9.8 8 8 9.8 8 12C8 14.2 9.8 16 12 16C13.3 16 14.4 15.5 15.2 14.6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
        />
        <rect x="14.5" y="10.8" width="2.4" height="2.4" fill="currentColor" />
      </svg>
    </div>
  );
}

