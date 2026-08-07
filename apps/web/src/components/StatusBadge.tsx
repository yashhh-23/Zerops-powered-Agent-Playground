interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, string> = {
    active: 'pill-green',
    completed: 'pill-blue',
    failed: 'pill-red',
    pending: 'pill-amber',
  };
  return (
    <span className={`pill ${map[status] ?? 'pill-amber'}`} role="status">
      {status}
    </span>
  );
}
