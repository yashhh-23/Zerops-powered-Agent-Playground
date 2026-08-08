import { useState } from 'react';
import { useSessions } from './hooks/useSessions';
import { useSessionSSE } from './hooks/useSessionSSE';
import { SessionSidebar } from './components/SessionSidebar';
import { PlaygroundPanel } from './components/PlaygroundPanel';
import { SpinnerIcon, AlertIcon } from './components/Icons';
import { DiffLine } from './components/DiffViewer';
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

  const [newTemplate, setNewTemplate] = useState('node-api-basic');
  const [previewTab, setPreviewTab] = useState<'health.ts' | 'zerops.yaml'>('health.ts');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { isConnected, connectionError, dbHealth: sseDbHealth } = useSessionSSE({
    sessionId: activeSessionId,
    API,
    setActiveSession,
    fetchSessionDetails,
  });

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Skip to Main Content Link for Accessibility */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Mobile Top Navigation Header */}
      <header className="mobile-header">
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={sidebarOpen}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <span className="mobile-title">ZEROPS AGENT PLAYGROUND</span>
      </header>

      {/* Overlay backdrop to dismiss sidebar on click */}
      {sidebarOpen && (
        <div className="sidebar-overlay-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* Full-width error banner outside layout */}
      {error && (
        <div className="error-banner" id="error-banner" role="alert">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <AlertIcon size={12} /> {error}
          </span>
          <button onClick={() => setError(null)} aria-label="Dismiss error" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" role="img" aria-label="Close icon">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      <div className={`layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <SessionSidebar 
          sessions={sessions}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onCreateSession={async (name, temp) => {
            await createSession(name, temp);
            setSidebarOpen(false);
          }}
          onImportSession={async (key) => {
            await importSession(key);
            setSidebarOpen(false);
          }}
          apiHealth={isConnected ? { status: 'ok' } : apiHealth}
          dbHealth={activeSessionId && isConnected ? { status: sseDbHealth } : dbHealth}
          loadingHealth={loadingHealth}
          loadingSessions={loadingSessions}
          refreshHealth={refreshHealth}
          isCreatingSession={isCreatingSession}
          newTemplate={newTemplate}
          setNewTemplate={setNewTemplate}
        />

        <main className="main" id="main-content">
          {!activeSessionId ? (
            /* Welcome screen */
            <div className="welcome">
              <div className="welcome-inner">
                <div className="welcome-brand">
                  <span className="welcome-eyebrow">Zerops Agent Playground</span>
                  <h1 className="welcome-title">Spin up your first agent</h1>
                </div>

                <p className="welcome-sub">
                  A sandbox for testing autonomous coding agents on live Zerops infrastructure.
                  Create a session, prompt the agent, review diffs, and deploy — all in one place.
                </p>

                <div className="welcome-steps">
                  {[
                    [
                      'Create a session',
                      'Pick a stack template and give your playground a name.',
                      // Folder plus SVG icon
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        <line x1="12" y1="11" x2="12" y2="17"></line>
                        <line x1="9" y1="14" x2="15" y2="14"></line>
                      </svg>
                    ],
                    [
                      'Prompt the agent',
                      'Describe a code change — the agent will generate real diffs.',
                      // Message terminal icon
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 17 10 11 4 5"></polyline>
                        <line x1="12" y1="19" x2="20" y2="19"></line>
                      </svg>
                    ],
                    [
                      'Review & approve',
                      'Inspect code and infra diffs, then approve or reject.',
                      // Check icon
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ],
                    [
                      'Auto-deploy',
                      'Approved diffs trigger a live Zerops deployment automatically.',
                      // Cloud/Rocket icon
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 11.034C18 7.15 14.867 4 11 4 7.748 4 5.039 6.223 4.29 9.227 2.443 9.877 1 11.603 1 13.657 1 16.056 2.944 18 5.344 18h12.312c2.4 0 4.344-1.944 4.344-4.343 0-2.222-1.66-4.053-3.877-4.29L18 11.034z"></path>
                        <polyline points="9 13 12 10 15 13"></polyline>
                        <line x1="12" y1="10" x2="12" y2="16"></line>
                      </svg>
                    ],
                  ].map(([title, desc, icon], i) => (
                    <div className="welcome-step" key={i}>
                      <div className="step-num">{icon}</div>
                      <div className="step-text">
                        <strong>{title as string}</strong> — {desc as string}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="btn-accent welcome-cta-btn"
                  onClick={() => {
                    setNewTemplate('node-api-basic');
                    setTimeout(() => {
                      const input = document.querySelector('.session-name-input') as HTMLInputElement;
                      input?.focus();
                    }, 50);
                  }}
                  style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                >
                  Create sandbox playground
                </button>
              </div>

              {/* Second column: What the agent produces panel */}
              <div className="welcome-preview-panel">
                <div className="preview-header">
                  <div className="preview-tabs">
                    <span 
                      className={`preview-tab ${previewTab === 'health.ts' ? 'active' : ''}`}
                      onClick={() => setPreviewTab('health.ts')}
                    >
                      health.ts
                    </span>
                    <span 
                      className={`preview-tab ${previewTab === 'zerops.yaml' ? 'active' : ''}`}
                      onClick={() => setPreviewTab('zerops.yaml')}
                    >
                      zerops.yaml
                    </span>
                  </div>
                  <div className="preview-badge">Example Output</div>
                </div>

                {previewTab === 'health.ts' ? (
                  <pre className="diff-code" style={{ flex: 1, padding: '16px', background: 'rgba(0, 0, 0, 0.15)', margin: 0, overflowX: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <DiffLine line=" import { FastifyInstance } from 'fastify';" lang="ts" className="preview-diff-line" />
                    <DiffLine line=" " lang="ts" className="preview-diff-line" />
                    <DiffLine line=" export async function healthRoutes(fastify: FastifyInstance) {" lang="ts" className="preview-diff-line" />
                    <DiffLine line="-  fastify.get('/health', async () => ({ status: 'running' }));" lang="ts" className="preview-diff-line" />
                    <DiffLine line="+  fastify.get('/health', async () => ({ status: 'ok', db: 'connected' }));" lang="ts" className="preview-diff-line" />
                    <DiffLine line=" }" lang="ts" className="preview-diff-line" />
                  </pre>
                ) : (
                  <pre className="diff-code" style={{ flex: 1, padding: '16px', background: 'rgba(0, 0, 0, 0.15)', margin: 0, overflowX: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <DiffLine line=" zerops:" lang="yaml" className="preview-diff-line" />
                    <DiffLine line="   - setup: api" lang="yaml" className="preview-diff-line" />
                    <DiffLine line="     run:" lang="yaml" className="preview-diff-line" />
                    <DiffLine line="       ports:" lang="yaml" className="preview-diff-line" />
                    <DiffLine line="-        - port: 3000" lang="yaml" className="preview-diff-line" />
                    <DiffLine line="+        - port: 8080" lang="yaml" className="preview-diff-line" />
                    <DiffLine line="           httpSupport: true" lang="yaml" className="preview-diff-line" />
                  </pre>
                )}
                
                <div className="preview-footer">
                  <div className="preview-status">
                    <span className="pulse-dot pulse-green"></span>
                    <span>Ready for Deploy</span>
                  </div>
                  <div className="preview-actions">
                    <button className="btn-success-mini" disabled>Approve & Deploy</button>
                  </div>
                </div>
              </div>
            </div>
          ) : loadingDetails && !activeSession ? (
            <div className="center-loader">
              <div className="center-loader-label">
                <SpinnerIcon size={20} />
              </div>
              <span>Loading playground…</span>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Fetching session details and task history</span>
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
