'use client';

/**
 * LongPressIndicator Component
 * 
 * Visual feedback for long press progress.
 */

interface LongPressIndicatorProps {
  progress: number;
  isPressed: boolean;
  size?: number;
}

export function LongPressIndicator({
  progress,
  isPressed,
  size = 40,
}: LongPressIndicatorProps) {
  if (!isPressed || progress === 0) return null;
  
  const circumference = 2 * Math.PI * (size / 2 - 2);
  const strokeDashoffset = circumference * (1 - progress);
  
  return (
    <div 
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ zIndex: 50 }}
    >
      <svg 
        width={size} 
        height={size} 
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-primary transition-all duration-100"
        />
      </svg>
    </div>
  );
}
