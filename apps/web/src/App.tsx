import { useSessions } from './hooks/useSessions';
import { useSessionSSE } from './hooks/useSessionSSE';
import { SessionSidebar } from './components/SessionSidebar';
import { PlaygroundPanel } from './components/PlaygroundPanel';
import './App.css';

export default function App() {
  const {
    API,
    sessions,
    searchQuery,
    setSearchQuery,
    activeSessionId,
    activeSession,
    setActiveSessionId,
    setActiveSession,
    apiHealth,
    dbHealth,
    runningTask,
    isCreatingSession,
    loadingHealth,
    loadingSessions,
    loadingDetails,
    error,
    setError,
    approvingTaskId,
    refreshHealth,
    fetchSessionDetails,
    createSession,
    importSession,
    runAgent,
    approveTask,
    rejectTask,
  } = useSessions();

  const { isConnected, connectionError, dbHealth: sseDbHealth } = useSessionSSE({
    sessionId: activeSessionId,
    API,
    setActiveSession,
    fetchSessionDetails,
  });

  return (
    <>
      {/* Skip to Main Content Link for Accessibility */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Full-width error banner outside layout */}
      {error && (
        <div className="error-banner" id="error-banner" role="alert">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" role="img" aria-label="Close icon">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      <div className="layout">
        <SessionSidebar 
          sessions={sessions}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onCreateSession={createSession}
          onImportSession={importSession}
          apiHealth={isConnected ? { status: 'ok' } : apiHealth}
          dbHealth={activeSessionId && isConnected ? { status: sseDbHealth } : dbHealth}
          loadingHealth={loadingHealth}
          loadingSessions={loadingSessions}
          refreshHealth={refreshHealth}
          isCreatingSession={isCreatingSession}
        />

        <main className="main" id="main-content">
          {!activeSessionId ? (
            /* Welcome screen */
            <div className="welcome">
              <div className="welcome-inner">
                <span className="welcome-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="var(--accent)" role="img" aria-label="Playground lightning icon">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                </span>
                <h1 className="welcome-title">Zerops Agent Playground</h1>
                <p className="welcome-sub">
                  A sandbox for testing autonomous coding agents on live Zerops infrastructure.
                  Create a session, prompt the agent, review diffs, and deploy — all in one place.
                </p>
                <div className="welcome-steps">
                  {[
                    ['Create a session', 'Pick a stack template and give your playground a name.'],
                    ['Prompt the agent', 'Describe a code change — the agent will generate real diffs.'],
                    ['Review & approve', 'Inspect code and infra diffs, then approve or reject.'],
                    ['Auto-deploy', 'Approved diffs trigger a live Zerops deployment automatically.'],
                  ].map(([title, desc], i) => (
                    <div className="welcome-step" key={i}>
                      <div className="step-num">{i + 1}</div>
                      <div className="step-text">
                        <strong>{title}</strong> — {desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : loadingDetails && !activeSession ? (
            <div className="center-loader">
              <span className="spinning" style={{ display: 'inline-flex' }} aria-label="Loading details spinner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" role="img" aria-label="Loading spinner">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              </span>
              Loading playground…
            </div>
          ) : activeSession ? (
            <PlaygroundPanel 
              session={activeSession}
              isConnected={isConnected}
              connectionError={connectionError}
              runningTask={runningTask}
              approvingTaskId={approvingTaskId}
              onRunAgent={runAgent}
              onApproveTask={approveTask}
              onRejectTask={rejectTask}
            />
          ) : null}
        </main>
      </div>
    </>
  );
}
