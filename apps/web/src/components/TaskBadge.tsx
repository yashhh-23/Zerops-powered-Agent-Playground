import { SpinnerIcon, CheckIcon, CrossIcon } from './Icons';

interface TaskBadgeProps {
  status: string;
}

export function TaskBadge({ status }: TaskBadgeProps) {
  const classMap: Record<string, string> = {
    pending:    'status-pending',
    processing: 'status-processing',
    completed:  'status-completed',
    failed:     'status-failed',
  };

  const icon =
    status === 'processing' ? (
      <SpinnerIcon size={10} style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }} />
    ) : status === 'completed' ? (
      <CheckIcon size={10} style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }} />
    ) : status === 'failed' ? (
      <CrossIcon size={10} style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }} />
    ) : (
      <span className="pulsing-badge-dot amber" aria-hidden="true" style={{ marginRight: 4 }} />
    );

  return (
    <span className={`status-badge ${classMap[status] ?? 'status-pending'}`} role="status">
      {icon} {status.toUpperCase()}
    </span>
  );
}
