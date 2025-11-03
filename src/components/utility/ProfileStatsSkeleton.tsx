import React from 'react';

/**
 * A skeleton loader for a single statistic item.
 * It mimics the layout of the real `StatItem` component with pulsing placeholders.
 */
const StatItemSkeleton = () => (
  <div className="flex items-center gap-3 animate-pulse">
    {/* Icon Placeholder */}
    <div className="flex h-12 w-12 flex-shrink-0 rounded-lg bg-gray-200" />
    
    {/* Text Placeholders */}
    <div className="flex flex-col gap-2 w-full">
      {/* Label Placeholder */}
      <div className="h-4 w-2/3 rounded-md bg-gray-200" />
      {/* Value Placeholder */}
      <div className="h-5 w-1/2 rounded-md bg-gray-300" />
    </div>
  </div>
);

/**
 * The main skeleton component that arranges six StatItemSkeletons 
 * into the final two-column layout.
 */
export const ProfileStatsSkeleton = () => (
  <div className="flex w-full flex-col gap-6 sm:flex-row sm:gap-8">
    {/* First Column of Skeletons */}
    <div className="flex flex-1 flex-col justify-center gap-6">
      <StatItemSkeleton />
      <StatItemSkeleton />
      <StatItemSkeleton />
    </div>
    
    {/* Second Column of Skeletons */}
    <div className="flex flex-1 flex-col justify-center gap-6">
      <StatItemSkeleton />
      <StatItemSkeleton />
      <StatItemSkeleton />
    </div>
  </div>
);