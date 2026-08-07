import React, { useState } from 'react';
import { ConnectionStatus } from './ConnectionStatus';
import { TaskBadge } from './TaskBadge';
import { DiffViewer } from './DiffViewer';
import type { PlaygroundSession, AgentTask } from '@playground/types';

interface PlaygroundPanelProps {
  session: PlaygroundSession;
  isConnected: boolean;
  connectionError: string | null;
  runningTask: boolean;
  approvingTaskId: string | null;
  onRunAgent: (prompt: string) => Promise<void>;
  onApproveTask: (taskId: string) => Promise<void>;
  onRejectTask: (taskId: string) => Promise<void>;
}

export function PlaygroundPanel({
  session,
  isConnected,
  connectionError,
  runningTask,
  approvingTaskId,
  onRunAgent,
  onApproveTask,
  onRejectTask
}: PlaygroundPanelProps) {
  const [taskPrompt, setTaskPrompt] = useState('');

  const handleRunAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskPrompt.trim() || runningTask) return;
    await onRunAgent(taskPrompt.trim());
    setTaskPrompt('');
  };

  const templateLabel = (t: string) =>
    t === 'node-api-basic' ? 'Node.js API'
    : t === 'react-static-basic' ? 'React Static'
    : t === 'python-api-basic' ? 'Python API'
    : t;

  return (
    <div className="playground" id="playground-panel">
      {/* Top bar */}
      <div className="pg-topbar">
        <div>
          <div className="pg-breadcrumb">Playground Session</div>
          <div className="pg-title">{session.name}</div>
          <div className="pg-meta">
            <span className="pg-meta-item">
              ID <code id="session-id-display">{session.id}</code>
            </span>
            <span className="pg-meta-item">·</span>
            <span className="pg-meta-item">
              Template <code>{templateLabel(session.template)}</code>
            </span>
          </div>
        </div>

        <div className="pg-topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ConnectionStatus isConnected={isConnected} error={connectionError} />
          
          <span className={`pill ${session.status === 'active' ? 'pill-green' : session.status === 'completed' ? 'pill-blue' : 'pill-red'}`} id="session-status-badge">
            {session.status}
          </span>
        </div>
      </div>

      {/* Main workspace splits */}
      <div className="pg-workspace">
        {/* Left panel: Prompt input & details */}
        <div className="pg-panel pg-left">
          <section aria-labelledby="run-agent-heading" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="panel-header">
              <h2 id="run-agent-heading" className="panel-title">Run Coding Agent</h2>
              <p className="panel-subtitle">Describe a code or architectural change to run the agent.</p>
            </div>

            <div className="panel-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <form className="prompt-form" onSubmit={handleRunAgentSubmit} id="form-run-agent" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <label htmlFor="agent-task-input" className="visually-hidden">Describe changes you want the agent to make</label>
                  <textarea
                    id="agent-task-input"
                    className="prompt-textarea"
                    placeholder="Describe changes you'd like to apply… (e.g. 'Add a health endpoint returning database status' or 'Style the landing page dark mode')"
                    value={taskPrompt}
                    onChange={e => setTaskPrompt(e.target.value)}
                    disabled={runningTask || session.status !== 'active'}
                  />
                  <div className="prompt-textarea-footer">
                    <span className="prompt-hint">Ctrl + Enter to submit</span>
                    <button
                      id="btn-run-agent"
                      type="submit"
                      className="btn-accent"
                      disabled={runningTask || !taskPrompt.trim() || session.status !== 'active'}
                    >
                      {runningTask ? (
                        <>
                          <span className="spinning" style={{ display: 'inline-flex', marginRight: 5 }} aria-label="Running spinner">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" role="img" aria-label="Spinner">
                              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                            </svg>
                          </span>
                          Running Agent...
                        </>
                      ) : (
                        <>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }} role="img" aria-label="Play icon">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                          Execute Prompt
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </section>
        </div>

        {/* Right panel: Tasks & Diff lists */}
        <div className="pg-panel pg-right">
          <section aria-labelledby="agent-tasks-heading" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 id="agent-tasks-heading" className="panel-title">Task Timeline</h2>
                <p className="panel-subtitle">Review changes generated by the coding agent.</p>
              </div>
              <span className="tasks-count">{session.agentTasks?.length || 0}</span>
            </div>

            <div className="panel-body pg-tasks-container">
              {!session.agentTasks || session.agentTasks.length === 0 ? (
                <div className="empty-tasks">
                  <strong>No tasks generated yet</strong>
                  <p>Submit a prompt on the left to start the agent pipeline.</p>
                </div>
              ) : (
                <div className="task-list" id="task-list" role="feed" aria-label="Task timeline stream">
                  {[...session.agentTasks].reverse().map((task: AgentTask) => (
                    <article key={task.id} className="task-card" id={`task-card-${task.id}`} aria-labelledby={`task-card-title-${task.id}`}>
                      {/* Header */}
                      <div className="task-card-header">
                        <span id={`task-card-title-${task.id}`} className="task-prompt-text">{task.prompt}</span>
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
                            <>
                              {task.deployStatus === 'deploying' ? (
                                <span className="task-decision decision-deploying">
                                  <span className="spinning" style={{ display: 'inline-flex', marginRight: 5 }} aria-label="Deploying spinner">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" role="img" aria-label="Spinner"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                  </span>
                                  Deploying...
                                </span>
                              ) : task.deployStatus === 'deployed' ? (
                                <span className="task-decision decision-approved">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5, verticalAlign: 'middle' }} role="img" aria-label="Checkmark"><polyline points="20 6 9 17 4 12"/></svg>
                                  Approved & Deployed
                                </span>
                              ) : task.deployStatus === 'failed' ? (
                                <span className="task-decision decision-rejected" style={{ color: 'var(--amber)' }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ marginRight: 5, verticalAlign: 'middle' }} role="img" aria-label="Warning"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                  ⚠️ Deployment Failed
                                </span>
                              ) : (
                                <span className="task-decision decision-approved">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5, verticalAlign: 'middle' }} role="img" aria-label="Checkmark"><polyline points="20 6 9 17 4 12"/></svg>
                                  Approved
                                </span>
                              )}
                            </>
                          ) : task.approved === false ? (
                            <span className="task-decision decision-rejected">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ marginRight: 5, verticalAlign: 'middle' }} role="img" aria-label="Cross"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              Rejected
                            </span>
                          ) : approvingTaskId === task.id ? (
                            <span className="task-decision decision-deploying">
                              <span className="spinning" style={{ display: 'inline-flex', marginRight: 5 }} aria-label="Deploying spinner">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" role="img" aria-label="Spinner"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                              </span>
                              Deploying...
                            </span>
                          ) : (
                            <div className="task-actions-buttons">
                              <button
                                id={`btn-approve-${task.id}`}
                                className="btn-success"
                                onClick={() => onApproveTask(task.id)}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5, verticalAlign: 'middle' }} role="img" aria-label="Check icon"><polyline points="20 6 9 17 4 12"/></svg>
                                Approve & Deploy
                              </button>
                              <button
                                id={`btn-reject-${task.id}`}
                                className="btn-danger"
                                onClick={() => onRejectTask(task.id)}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ marginRight: 5, verticalAlign: 'middle' }} role="img" aria-label="Cross icon"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
