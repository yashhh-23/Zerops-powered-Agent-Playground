import { SpinnerIcon, CheckIcon, CrossIcon, EllipsisIcon } from './Icons';

interface TaskBadgeProps {
  status: string;
}

export function TaskBadge({ status }: TaskBadgeProps) {
  const map: Record<string, string> = {
    pending:    'status-pending',
    processing: 'status-processing',
    completed:  'status-completed',
    failed:     'status-failed',
  };
  const icon =
    status === 'processing' ? (
      <SpinnerIcon size={10} />
    ) : status === 'completed' ? (
      <CheckIcon size={10} style={{ display: 'inline-block', verticalAlign: 'middle' }} />
    ) : status === 'failed' ? (
      <CrossIcon size={10} style={{ display: 'inline-block', verticalAlign: 'middle' }} />
    ) : (
      <EllipsisIcon size={10} style={{ display: 'inline-block', verticalAlign: 'middle' }} />
    );
  return (
    <span className={`status-badge ${map[status] ?? 'status-pending'}`} role="status">
      {icon} {status}
    </span>
  );
}
