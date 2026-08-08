import { CheckIcon, CrossIcon } from './Icons';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorMap: Record<string, string> = {
    active: 'pill-blue',
    completed: 'pill-green',
    failed: 'pill-red',
    pending: 'pill-amber',
  };

  const icon =
    status === 'active' ? (
      <span className="pulsing-badge-dot blue" aria-hidden="true" />
    ) : status === 'completed' ? (
      <CheckIcon size={9} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />
    ) : status === 'failed' ? (
      <CrossIcon size={9} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />
    ) : (
      <span className="pulsing-badge-dot amber" aria-hidden="true" />
    );

  return (
    <span className={`pill ${colorMap[status] ?? 'pill-amber'}`} role="status">
      {icon}
      {status.toUpperCase()}
    </span>
  );
}
