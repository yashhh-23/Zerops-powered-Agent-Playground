import { useState, useEffect } from 'react';
import './App.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlaygroundSession {
  id: string;
  name: string;
  template: string;
  status: string;
  createdAt: string;
  agentTasks?: AgentTask[];
}

interface AgentTask {
  id: string;
  prompt: string;
  status: string;
  codeDiff: string | null;
  infraDiff: string | null;
  createdAt: string;
  completedAt?: string;
  approved: boolean | null;
}

// ─── Diff Renderer ────────────────────────────────────────────────────────────

function DiffViewer({ codeDiffStr, infraDiffStr }: { codeDiffStr: string | null; infraDiffStr: string | null }) {
  if (!codeDiffStr && !infraDiffStr) return null;

  let codeDiff: any = null;
  let infraDiff: any = null;
  try { if (codeDiffStr)  codeDiff  = JSON.parse(codeDiffStr);  } catch {}
  try { if (infraDiffStr) infraDiff = JSON.parse(infraDiffStr); } catch {}

  const actionClass = (a: string) =>
    a === 'create' ? 'action-create' : a === 'delete' ? 'action-delete' : 'action-update';

  return (
    <div className="diff-viewer">
      {codeDiff?.files?.map((file: any, idx: number) => (
        <div key={idx} className="diff-file">
          <div className="diff-file-header">
            <span className="diff-file-path">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-muted)' }}>
                <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 8.75 4.25V1.5Zm6.75.103V4.25c0 .138.112.25.25.25h2.647Z"/>
              </svg>
              {file.path}
            </span>
            <span className={`diff-action-tag ${actionClass(file.action || 'update')}`}>
              {file.action || 'update'}
            </span>
          </div>
          <pre className="diff-code">
            {file.diff?.split('\n').map((line: string, li: number) => {
              const cls = line.startsWith('+') ? 'diff-line-add'
                        : line.startsWith('-') ? 'diff-line-del'
                        : 'diff-line-ctx';
              return <span key={li} className={cls}>{line || ' '}</span>;
            })}
          </pre>
        </div>
      ))}

      {infraDiff?.zeropsYaml && (
        <div className="infra-block">
          <div className="infra-header">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--amber)' }}>
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z"/>
            </svg>
            zerops.yaml — Infrastructure Config
          </div>
          <pre className="infra-code">{infraDiff.zeropsYaml}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'pill-green', completed: 'pill-blue',
    failed: 'pill-red',   pending: 'pill-amber',
  };
  return (
    <span className={`pill ${map[status] ?? 'pill-amber'}`}>
      {status}
    </span>
  );
}

// ─── Task Status Badge ────────────────────────────────────────────────────────

function TaskBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:    'status-pending',
    processing: 'status-processing',
    completed:  'status-completed',
    failed:     'status-failed',
  };
  const icon =
    status === 'processing' ? (
      <span className="spinning" style={{ display: 'inline-flex' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      </span>
    ) : status === 'completed' ? (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ) : status === 'failed' ? (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    ) : (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
        <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
      </svg>
    );
  return (
    <span className={`status-badge ${map[status] ?? 'status-pending'}`}>
      {icon} {status}
    </span>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [sessions, setSessions]           = useState<PlaygroundSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<PlaygroundSession | null>(null);

  const [apiHealth, setApiHealth]   = useState<{ status: string } | null>(null);
  const [dbHealth,  setDbHealth]    = useState<{ status: string; db?: string } | null>(null);

  const [newName,     setNewName]     = useState('');
  const [newTemplate, setNewTemplate] = useState('node-api-basic');
  const [taskPrompt,  setTaskPrompt]  = useState('');
  const [runningTask, setRunningTask] = useState(false);

  const [loadingHealth,   setLoadingHealth]   = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingDetails,  setLoadingDetails]  = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  useEffect(() => { refreshHealth(); fetchSessions(); }, []);

  useEffect(() => {
    if (!activeSessionId) { setActiveSession(null); return; }
    fetchSessionDetails(activeSessionId);
    const iv = setInterval(() => fetchSessionDetails(activeSessionId, true), 3000);
    return () => clearInterval(iv);
  }, [activeSessionId]);

  const API = 'http://localhost:8080';

  const refreshHealth = () => {
    setLoadingHealth(true);
    Promise.all([
      fetch(`${API}/health`).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/health/db`).then(r => r.json()).catch(() => null),
    ]).then(([api, db]) => { setApiHealth(api); setDbHealth(db); setLoadingHealth(false); });
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const r = await fetch(`${API}/api/sessions`);
      if (!r.ok) throw new Error('Failed to fetch sessions');
      setSessions(await r.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoadingSessions(false); }
  };

  const fetchSessionDetails = async (id: string, silent = false) => {
    if (!silent) setLoadingDetails(true);
    try {
      const r = await fetch(`${API}/api/sessions/${id}`);
      if (!r.ok) throw new Error('Failed to load session');
      setActiveSession(await r.json());
    } catch (e: any) { if (!silent) setError(e.message); }
    finally { if (!silent) setLoadingDetails(false); }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const r = await fetch(`${API}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, template: newTemplate }),
      });
      if (!r.ok) throw new Error('Failed to create session');
      const s = await r.json();
      setNewName('');
      await fetchSessions();
      setActiveSessionId(s.id);
    } catch (e: any) { setError(e.message); }
  };

  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskPrompt.trim() || !activeSessionId) return;
    setRunningTask(true);
    try {
      const r = await fetch(`${API}/api/sessions/${activeSessionId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: taskPrompt }),
      });
      if (!r.ok) throw new Error('Failed to submit task');
      setTaskPrompt('');
      await fetchSessionDetails(activeSessionId);
    } catch (e: any) { setError(e.message); }
    finally { setRunningTask(false); }
  };

  const handleApproveTask = async (taskId: string) => {
    try {
      const r = await fetch(`${API}/api/tasks/${taskId}/approve`, { method: 'POST' });
      if (!r.ok) throw new Error('Failed to approve');
      const d = await r.json();
      setError(null);
      if (activeSessionId) await fetchSessionDetails(activeSessionId);
      // Show a non-blocking banner instead of alert
      console.info('[Approved]', d.message);
    } catch (e: any) { setError(e.message); }
  };

  const handleRejectTask = async (taskId: string) => {
    try {
      const r = await fetch(`${API}/api/tasks/${taskId}/reject`, { method: 'POST' });
      if (!r.ok) throw new Error('Failed to reject');
      if (activeSessionId) await fetchSessionDetails(activeSessionId);
    } catch (e: any) { setError(e.message); }
  };

  const dotClass = (status: string) =>
    status === 'active' ? 'dot-active' : status === 'completed' ? 'dot-completed' : 'dot-failed';

  const templateLabel = (t: string) =>
    t === 'node-api-basic'    ? 'Node.js API'
    : t === 'react-static-basic' ? 'React Static'
    : t === 'python-api-basic'   ? 'Python API'
    : t;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Full-width error banner outside layout */}
      {error && (
        <div className="error-banner" id="error-banner">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      <div className="layout">
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className="sidebar">
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="logo-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <span className="logo-name">Zerops Agent</span>
            <span className="logo-tag">Playground</span>
          </div>

          <div className="sidebar-body">
            {/* System Status */}
            <div className="sidebar-section">
              <div className="section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                System Status
                <button className="health-refresh" onClick={refreshHealth} title="Refresh" id="btn-refresh-health">
                  {loadingHealth ? <span className="spinning">↻</span> : '↻'}
                </button>
              </div>
              <div className="health-grid">
                <div className="health-row">
                  <span className="health-label">API Server</span>
                  {apiHealth?.status === 'ok'
                    ? <span className="pill pill-green" id="status-api">Online</span>
                    : <span className="pill pill-red"   id="status-api">Offline</span>}
                </div>
                <div className="health-row">
                  <span className="health-label">Database</span>
                  {dbHealth?.status === 'ok'
                    ? <span className="pill pill-green" id="status-db">Connected</span>
                    : <span className="pill pill-red"   id="status-db">Down</span>}
                </div>
              </div>
            </div>

            <div className="sidebar-divider" />

            {/* New Session */}
            <div className="sidebar-section">
              <div className="section-label">New Playground</div>
              <form className="create-form" onSubmit={handleCreateSession} id="form-create-session">
                <input
                  id="input-session-name"
                  className="field-input"
                  type="text"
                  placeholder="Session name…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
                <select
                  id="select-template"
                  className="field-select"
                  value={newTemplate}
                  onChange={e => setNewTemplate(e.target.value)}
                >
                  <option value="node-api-basic">Node.js API Basic</option>
                  <option value="react-static-basic">React Static Basic</option>
                  <option value="python-api-basic">Python API Basic</option>
                </select>
                <button id="btn-create-session" type="submit" className="btn-primary">
                  Create Session
                </button>
              </form>
            </div>

            <div className="sidebar-divider" />

            {/* Session List */}
            <div className="sidebar-section" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Playgrounds
                <span className="tasks-count">{sessions.length}</span>
              </div>

              {loadingSessions ? (
                <div className="empty-text">Loading…</div>
              ) : sessions.length === 0 ? (
                <div className="empty-text">No sessions yet.</div>
              ) : (
                <div className="session-list">
                  {sessions.map(s => (
                    <div
                      key={s.id}
                      id={`session-item-${s.id}`}
                      className={`session-item ${activeSessionId === s.id ? 'selected' : ''}`}
                      onClick={() => setActiveSessionId(s.id)}
                    >
                      <div className="session-item-top">
                        <span className="session-name">
                          <span className={`status-dot ${dotClass(s.status)}`} />
                          {s.name}
                        </span>
                        <StatusBadge status={s.status} />
                      </div>
                      <div className="session-meta">
                        <span>{templateLabel(s.template)}</span>
                        <span>·</span>
                        <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main ──────────────────────────────────────────────────── */}
        <main className="main">
          {!activeSessionId ? (
            /* Welcome screen */
            <div className="welcome">
              <div className="welcome-inner">
                <span className="welcome-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="var(--accent)">
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
              <span className="spinning" style={{ display: 'inline-flex' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              </span>
              Loading playground…
            </div>
          ) : activeSession ? (
            <div className="playground" id="playground-panel">
              {/* Top bar */}
              <div className="pg-topbar">
                <div>
                  <div className="pg-breadcrumb">Playground Session</div>
                  <div className="pg-title">{activeSession.name}</div>
                  <div className="pg-meta">
                    <span className="pg-meta-item">
                      ID <code id="session-id-display">{activeSession.id}</code>
                    </span>
                    <span className="pg-meta-item">·</span>
                    <span className="pg-meta-item">
                      Template <code>{templateLabel(activeSession.template)}</code>
                    </span>
                    <span className="pg-meta-item">·</span>
                    <span className="pg-meta-item">
                      {new Date(activeSession.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <StatusBadge status={activeSession.status} />
              </div>

              {/* Body */}
              <div className="pg-body">
                {/* Prompt bar */}
                <div className="prompt-bar" id="agent-task-runner">
                  <div className="prompt-bar-header">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--accent)">
                      <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Z"/>
                    </svg>
                    <span className="prompt-bar-title">Agent Task Runner</span>
                    <span className="prompt-bar-desc">Submit a prompt — agent generates real diffs</span>
                  </div>
                  <form className="prompt-row" onSubmit={handleRunAgent} id="form-run-agent">
                    <input
                      id="input-task-prompt"
                      className="prompt-input"
                      type="text"
                      placeholder="Add a /health endpoint that connects to the database…"
                      value={taskPrompt}
                      onChange={e => setTaskPrompt(e.target.value)}
                      disabled={runningTask}
                    />
                    <button
                      id="btn-run-agent"
                      type="submit"
                      className="btn-primary"
                      disabled={runningTask || !taskPrompt.trim()}
                    >
                      {runningTask
                        ? <>
                            <span className="spinning" style={{ display: 'inline-flex', marginRight: 6 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                              </svg>
                            </span>
                            Running
                          </>
                        : <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                              <line x1="5" y1="12" x2="19" y2="12"/>
                              <polyline points="12 5 19 12 12 19"/>
                            </svg>
                            Run Agent
                          </>}
                    </button>
                  </form>
                </div>

                {/* Task log */}
                <div>
                  <div className="tasks-section-label">
                    Task Execution Log
                    <span className="tasks-count">{activeSession.agentTasks?.length ?? 0}</span>
                  </div>
                </div>

                {!activeSession.agentTasks || activeSession.agentTasks.length === 0 ? (
                  <div className="empty-tasks" id="empty-tasks-placeholder">
                    <span style={{ display: 'inline-flex', marginBottom: 8 }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--border-hover)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="10" rx="2"/>
                        <circle cx="12" cy="5" r="2"/>
                        <line x1="12" y1="7" x2="12" y2="11"/>
                        <line x1="8" y1="15" x2="8" y2="17"/>
                        <line x1="16" y1="15" x2="16" y2="17"/>
                      </svg>
                    </span>
                    <p>No tasks yet — submit a prompt above to get started.</p>
                  </div>
                ) : (
                  <div className="task-list" id="task-list">
                    {[...activeSession.agentTasks].reverse().map((task: AgentTask) => (
                      <div key={task.id} className="task-card" id={`task-card-${task.id}`}>
                        {/* Header */}
                        <div className="task-card-header">
                          <span className="task-prompt-text">{task.prompt}</span>
                          <div className="task-header-right">
                            <span className="task-id">{task.id.slice(-8)}</span>
                            <TaskBadge status={task.status} />
                          </div>
                        </div>

                        {/* Diff output */}
                        {(task.codeDiff || task.infraDiff) && (
                          <DiffViewer codeDiffStr={task.codeDiff} infraDiffStr={task.infraDiff} />
                        )}

                        {/* Actions */}
                        {task.status === 'completed' && (
                          <div className="task-actions">
                            <span className="task-actions-label">
                              Created {new Date(task.createdAt).toLocaleTimeString()}
                            </span>
                            {task.approved === true ? (
                              <span className="task-decision decision-approved">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5, verticalAlign: 'middle' }}><polyline points="20 6 9 17 4 12"/></svg>
                                Approved & Deployed
                              </span>
                            ) : task.approved === false ? (
                              <span className="task-decision decision-rejected">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ marginRight: 5, verticalAlign: 'middle' }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                Rejected
                              </span>
                            ) : (
                              <div className="task-actions-buttons">
                                <button
                                  id={`btn-approve-${task.id}`}
                                  className="btn-success"
                                  onClick={() => handleApproveTask(task.id)}
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5, verticalAlign: 'middle' }}><polyline points="20 6 9 17 4 12"/></svg>
                                  Approve & Deploy
                                </button>
                                <button
                                  id={`btn-reject-${task.id}`}
                                  className="btn-danger"
                                  onClick={() => handleRejectTask(task.id)}
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ marginRight: 5, verticalAlign: 'middle' }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="center-loader">Failed to load session details.</div>
          )}
        </main>
      </div>
    </>
  );
}
