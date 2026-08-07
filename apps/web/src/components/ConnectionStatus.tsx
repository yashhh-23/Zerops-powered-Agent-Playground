interface ConnectionStatusProps {
  isConnected: boolean;
  error: string | null;
}

export function ConnectionStatus({ isConnected, error }: ConnectionStatusProps) {
  return (
    <div className="connection-status" role="status" aria-live="polite">
      {isConnected ? (
        <span className="status-connected">
          <span className="status-dot" aria-hidden="true"></span>
          Live Sync
        </span>
      ) : (
        <span className="status-disconnected">
          <span className="status-dot pulsing-error" aria-hidden="true"></span>
          {error || 'Connecting...'}
        </span>
      )}
    </div>
  );
}
