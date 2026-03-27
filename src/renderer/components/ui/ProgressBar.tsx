import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const colorClasses = {
  primary: 'bg-whatsapp-light',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  label,
  showPercentage = true,
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-gray-500">{percentage}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {max > 0 && (
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>{value} / {max}</span>
        </div>
      )}
    </div>
  );
};

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

const circularColorClasses = {
  primary: 'text-whatsapp-light',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  danger: 'text-red-500',
};

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max,
  size = 64,
  strokeWidth = 4,
  showPercentage = true,
  color = 'primary',
}) => {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          className="text-gray-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${circularColorClasses[color]} transition-all duration-300`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showPercentage && (
        <span className="absolute text-sm font-semibold text-gray-700">
          {percentage}%
        </span>
      )}
    </div>
  );
};
