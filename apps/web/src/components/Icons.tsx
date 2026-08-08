import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export function CheckIcon({ size = 12, strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="tech-icon duotone"
      {...props}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" fill="currentColor" fillOpacity="0.06" />
      <polyline points="16 9 11 14 8 11" />
    </svg>
  );
}

export function CrossIcon({ size = 12, strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="tech-icon duotone"
      {...props}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" fill="currentColor" fillOpacity="0.06" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

export function SpinnerIcon({ size = 12, strokeWidth = 1.8, className = '', ...props }: IconProps) {
  return (
    <span className={`spinning ${className}`} style={{ display: 'inline-flex' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="tech-icon"
        {...props}
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.15" />
        <path d="M21 12a9 9 0 0 1-9 9" />
      </svg>
    </span>
  );
}

export function EllipsisIcon({ size = 12, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className="tech-icon"
      {...props}
    >
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

export function LockIcon({ size = 12, strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="tech-icon duotone"
      {...props}
    >
      <rect x="5" y="11" width="14" height="10" rx="2" ry="2" stroke="currentColor" strokeOpacity="0.25" fill="currentColor" fillOpacity="0.06" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function AlertIcon({ size = 12, strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="tech-icon duotone"
      {...props}
    >
      <polygon points="12 2 2 22 22 22" stroke="currentColor" strokeOpacity="0.25" fill="currentColor" fillOpacity="0.06" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function NodeIcon({ size = 14, strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="tech-icon duotone"
      {...props}
    >
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" stroke="currentColor" strokeOpacity="0.25" fill="currentColor" fillOpacity="0.06" />
      <polyline points="2 8.5 12 15 22 8.5" />
      <line x1="12" y1="22" x2="12" y2="15" />
    </svg>
  );
}

export function ReactIcon({ size = 14, strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="tech-icon duotone"
      {...props}
    >
      <ellipse cx="12" cy="12" rx="10" ry="4" strokeOpacity="0.3" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" strokeOpacity="0.3" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" strokeOpacity="0.3" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" fillOpacity="0.8" />
    </svg>
  );
}

export function PythonIcon({ size = 14, strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="tech-icon duotone"
      {...props}
    >
      <path d="M12 2h3.5A2.5 2.5 0 0 1 18 4.5v3.5a1 1 0 0 1-1 1H8v4a1 1 0 0 0 1 1h8.5a2.5 2.5 0 0 0 2.5-2.5V8a4 4 0 0 0-4-4h-4" strokeOpacity="0.4" />
      <path d="M12 22H8.5A2.5 2.5 0 0 1 6 19.5v-3.5a1 1 0 0 1 1-1h9v-4a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 0 4 12.5V16a4 4 0 0 0 4 4h4" />
      <circle cx="8.5" cy="6.5" r="0.75" fill="currentColor" />
      <circle cx="15.5" cy="17.5" r="0.75" fill="currentColor" />
    </svg>
  );
}
