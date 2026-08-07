import { useState, useEffect } from 'react';
import './App.css';

interface PlaygroundSession {
  id: string;
  name: string;
  template: string;
  status: string;
  createdAt: string;
  agentTasks?: any[];
}

function RenderDiff({ codeDiffStr, infraDiffStr }: { codeDiffStr: string | null, infraDiffStr: string | null }) {
  if (!codeDiffStr && !infraDiffStr) return null;

  let codeDiff: any = null;
  let infraDiff: any = null;

  try {
    if (codeDiffStr) codeDiff = JSON.parse(codeDiffStr);
  } catch (e) {}

  try {
    if (infraDiffStr) infraDiff = JSON.parse(infraDiffStr);
  } catch (e) {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
      {codeDiff?.files && codeDiff.files.map((file: any, idx: number) => (
        <div key={idx} style={{ border: '1px solid #334155', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '8px 12px', borderBottom: '1px solid #334155', fontSize: '13px', fontWeight: 'bold', color: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📄 {file.path}</span>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: file.action === 'create' ? '#10b981' : file.action === 'delete' ? '#ef4444' : '#60a5fa', fontWeight: 'bold' }}>
              {file.action || 'update'}
            </span>
          </div>
          <pre style={{ margin: 0, padding: '12px', fontSize: '12px', overflowX: 'auto', backgroundColor: '#0b0f19', fontFamily: 'monospace', color: '#cbd5e1', lineHeight: '1.5' }}>
            {file.diff && file.diff.split('\n').map((line: string, lIdx: number) => {
              let color = '#cbd5e1';
              let bgColor = 'transparent';
              if (line.startsWith('+')) {
                color = '#34d399';
                bgColor = 'rgba(16, 185, 129, 0.1)';
              } else if (line.startsWith('-')) {
                color = '#f87171';
                bgColor = 'rgba(239, 68, 68, 0.1)';
              }
              return (
                <div key={lIdx} style={{ color, backgroundColor: bgColor, paddingLeft: '4px' }}>
                  {line}
                </div>
              );
            })}
          </pre>
        </div>
      ))}

      {infraDiff?.zeropsYaml && (
        <div style={{ border: '1px solid #334155', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '8px 12px', borderBottom: '1px solid #334155', fontSize: '13px', fontWeight: 'bold', color: '#f8fafc' }}>
            ⚙️ zerops.yaml Configuration
          </div>
          <pre style={{ margin: 0, padding: '12px', fontSize: '12px', overflowX: 'auto', backgroundColor: '#0b0f19', fontFamily: 'monospace', color: '#cbd5e1', lineHeight: '1.5' }}>
            {infraDiff.zeropsYaml}
          </pre>
        </div>
      )}
    </div>
  );
}

function App() {
  const [sessions, setSessions] = useState<PlaygroundSession[]>([]);
  const [activeSession, setActiveSession] = useState<PlaygroundSession | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Health states
  const [apiHealth, setApiHealth] = useState<{ status: string; service: string } | null>(null);
  const [dbHealth, setDbHealth] = useState<{ status: string; db: string } | null>(null);
  
  // Form states
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionTemplate, setNewSessionTemplate] = useState('node-api-basic');
  
  // Task runner states
  const [taskPrompt, setTaskPrompt] = useState('');
  const [runningTask, setRunningTask] = useState(false);
  
  // Loading & Error states
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load health and list sessions
  useEffect(() => {
    refreshHealth();
    fetchSessions();
  }, []);

  // Poll for active session details if a session is selected
  useEffect(() => {
    if (!activeSessionId) {
      setActiveSession(null);
      return;
    }

    fetchSessionDetails(activeSessionId);
    
    // Set up polling for task status updates in the active session
    const interval = setInterval(() => {
      fetchSessionDetails(activeSessionId, true); // silent refresh
    }, 3000);

    return () => clearInterval(interval);
  }, [activeSessionId]);

  const refreshHealth = () => {
    setLoadingHealth(true);
    Promise.all([
      fetch('http://localhost:8080/health').then(res => res.json()).catch(() => null),
      fetch('http://localhost:8080/api/health/db').then(res => res.json()).catch(() => null)
    ]).then(([api, db]) => {
      setApiHealth(api);
      setDbHealth(db);
      setLoadingHealth(false);
    });
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch('http://localhost:8080/api/sessions');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchSessionDetails = async (id: string, silent = false) => {
    if (!silent) setLoadingDetails(true);
    try {
      const res = await fetch(`http://localhost:8080/api/sessions/${id}`);
      if (!res.ok) throw new Error('Failed to fetch session details');
      const data = await res.json();
      setActiveSession(data);
    } catch (err: any) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoadingDetails(false);
    }
  };

  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskPrompt.trim() || !activeSessionId) return;

    setRunningTask(true);
    try {
      const res = await fetch(`http://localhost:8080/api/sessions/${activeSessionId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: taskPrompt }),
      });
      if (!res.ok) throw new Error('Failed to submit task');
      setTaskPrompt('');
      await fetchSessionDetails(activeSessionId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRunningTask(false);
    }
  };

  const handleApproveTask = async (taskId: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/tasks/${taskId}/approve`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to approve task');
      const data = await res.json();
      alert(data.message || 'Task approved successfully!');
      if (activeSessionId) await fetchSessionDetails(activeSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/tasks/${taskId}/reject`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to reject task');
      alert('Task rejected.');
      if (activeSessionId) await fetchSessionDetails(activeSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;

    try {
      const res = await fetch('http://localhost:8080/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSessionName, template: newSessionTemplate }),
      });
      if (!res.ok) throw new Error('Failed to create session');
      const newSession = await res.json();
      setNewSessionName('');
      await fetchSessions();
      setActiveSessionId(newSession.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {error && (
        <div style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: 'bold' }}>
          <span>Error: {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', width: '100%', flexGrow: 1 }}>
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1 className="logo-text">Zerops Agent</h1>
            <span className="logo-badge">Playground</span>
          </div>

          {/* Health status widget */}
          <div className="health-card">
            <div className="health-card-header">
              <h3>System Status {loadingHealth ? '...' : ''}</h3>
              <button onClick={refreshHealth} className="btn-icon" title="Refresh health">↻</button>
            </div>
          <div className="health-row">
            <span>API Server:</span>
            {apiHealth ? (
              <span className="status-pill status-ok">Online</span>
            ) : (
              <span className="status-pill status-error">Offline</span>
            )}
          </div>
          <div className="health-row">
            <span>Database:</span>
            {dbHealth && dbHealth.status === 'ok' ? (
              <span className="status-pill status-ok">Connected</span>
            ) : (
              <span className="status-pill status-error">Disconnected</span>
            )}
          </div>
        </div>

        {/* Create Session Form */}
        <div className="sidebar-section">
          <h3>Create Playground</h3>
          <form onSubmit={handleCreateSession} className="create-form">
            <input
              type="text"
              placeholder="Session Name (e.g. My Sandbox)"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="form-input"
            />
            <select
              value={newSessionTemplate}
              onChange={(e) => setNewSessionTemplate(e.target.value)}
              className="form-select"
            >
              <option value="node-api-basic">Node.js API Basic</option>
              <option value="react-static-basic">React Static Basic</option>
              <option value="python-api-basic">Python API Basic</option>
            </select>
            <button type="submit" className="btn-primary">Create Session</button>
          </form>
        </div>

        {/* Sessions List */}
        <div className="sidebar-section list-section">
          <h3>Active Playgrounds</h3>
          {loadingSessions ? (
            <div className="loader">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">No playgrounds created yet.</div>
          ) : (
            <div className="session-list">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
                >
                  <div className="session-item-header">
                    <h4>{session.name}</h4>
                    <span className={`badge badge-${session.status}`}>{session.status}</span>
                  </div>
                  <div className="session-item-footer">
                    <span>{session.template}</span>
                    <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {activeSessionId ? (
          loadingDetails && !activeSession ? (
            <div className="full-loader">Loading playground info...</div>
          ) : activeSession ? (
            <div className="playground-dashboard">
              {/* Session Overview */}
              <header className="playground-header">
                <div>
                  <span className="detail-tag">PLAYGROUND SESSION</span>
                  <h2>{activeSession.name}</h2>
                  <p className="meta-text">
                    ID: <code>{activeSession.id}</code> | Template: <strong>{activeSession.template}</strong> | Created: {new Date(activeSession.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="header-actions">
                  <span className={`badge-large status-${activeSession.status}`}>{activeSession.status.toUpperCase()}</span>
                </div>
              </header>

              {/* Playground body: contains Task submission and list of tasks in Phase 3 */}
              <div className="dashboard-grid">
                <div className="card task-runner-card">
                  <h3>Agent Task Runner</h3>
                  <p className="card-desc">Submit a coding prompt to let the agent compile diffs for this stack.</p>
                  
                  <form onSubmit={handleRunAgent} className="task-form" style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Add a /health endpoint that connects to database..."
                      value={taskPrompt}
                      onChange={(e) => setTaskPrompt(e.target.value)}
                      className="form-input"
                      style={{ flexGrow: 1 }}
                      disabled={runningTask}
                    />
                    <button type="submit" className="btn-primary" disabled={runningTask || !taskPrompt.trim()}>
                      {runningTask ? 'Running...' : 'Run Agent'}
                    </button>
                  </form>
                </div>

                <div className="card task-list-card" style={{ display: 'flex', flexDirection: 'column', maxHeight: '500px', overflowY: 'auto' }}>
                  <h3>Task Execution Logs</h3>
                  {!activeSession.agentTasks || activeSession.agentTasks.length === 0 ? (
                    <div className="placeholder-container">
                      <p>No tasks submitted yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                      {activeSession.agentTasks.map((task: any) => (
                        <div key={task.id} style={{ border: '1px solid #1e293b', borderRadius: '6px', padding: '16px', backgroundColor: '#0b0f19', textAlign: 'left' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 600, fontSize: '14px', color: '#f8fafc' }}>Prompt: "{task.prompt}"</span>
                            <span className={`badge badge-${task.status}`}>{task.status}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                            ID: <code>{task.id}</code> | Created: {new Date(task.createdAt).toLocaleTimeString()}
                          </div>
                          
                          <RenderDiff codeDiffStr={task.codeDiff} infraDiffStr={task.infraDiff} />

                          {task.status === 'completed' && (
                            <div style={{ marginTop: '16px', borderTop: '1px solid #1e293b', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', color: '#64748b' }}>Decision status:</span>
                              {task.approved === true ? (
                                <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 600 }}>✓ Approved (Deployed)</span>
                              ) : task.approved === false ? (
                                <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>✗ Rejected</span>
                              ) : (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button onClick={() => handleApproveTask(task.id)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                                    Approve & Deploy
                                  </button>
                                  <button onClick={() => handleRejectTask(task.id)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: '#374151' }}>
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
            </div>
          ) : (
            <div className="error-state">Failed to load playground details.</div>
          )
        ) : (
          <div className="welcome-panel">
            <div className="welcome-hero">
              <h2>Zerops Agent Playground ⚡</h2>
              <p>Welcome to the sandbox where you can test autonomous coding agents on live Zerops stacks.</p>
              
              <div className="guide-box">
                <h4>To get started:</h4>
                <ol>
                  <li>Create a new playground session in the sidebar.</li>
                  <li>Select the playground from the list.</li>
                  <li>Prompt the coding agent to make code modifications or infrastructure updates.</li>
                  <li>Review the diffs and approve deployment to Zerops!</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}

export default App;
