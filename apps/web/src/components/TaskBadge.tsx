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
      <span className="spinning" style={{ display: 'inline-flex' }} aria-label="Processing spinner">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" role="img" aria-label="Spinner">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      </span>
    ) : status === 'completed' ? (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }} role="img" aria-label="Completed checkmark">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ) : status === 'failed' ? (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ display: 'inline-block', verticalAlign: 'middle' }} role="img" aria-label="Failed cross">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    ) : (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }} role="img" aria-label="Pending ellipsis">
        <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
      </svg>
    );
  return (
    <span className={`status-badge ${map[status] ?? 'status-pending'}`} role="status">
      {icon} {status}
    </span>
  );
}
