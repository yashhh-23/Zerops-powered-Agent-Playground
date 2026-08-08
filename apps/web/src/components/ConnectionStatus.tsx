import { SpinnerIcon } from './Icons';

interface ConnectionStatusProps {
  isConnected: boolean;
  error: string | null;
}

export function ConnectionStatus({ isConnected, error }: ConnectionStatusProps) {
  const disconnectedLabel = error
    ? 'Connection lost — retrying…'
    : 'Establishing live sync…';

  return (
    <div className="connection-status" role="status" aria-live="polite">
      {isConnected ? (
        <span className="status-connected">
          <span className="status-dot" aria-hidden="true"></span>
          Live Sync Active
        </span>
      ) : (
        <span className="status-disconnected" title={error || undefined}>
          <SpinnerIcon size={10} />
          {disconnectedLabel}
        </span>
      )}
    </div>
  );
}
