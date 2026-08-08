import React, { useState, useEffect } from 'react';
import { ConnectionStatus } from './ConnectionStatus';
import { TaskBadge } from './TaskBadge';
import { DiffViewer } from './DiffViewer';
import type { PlaygroundSession, AgentTask } from '@playground/types';
import { templateLabel } from '@playground/types';
import { CheckIcon, CrossIcon, SpinnerIcon, LockIcon, AlertIcon } from './Icons';

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

const PLACEHOLDERS = [
  "Add a health check endpoint returning JSON status",
  "Implement a user CRUD router with Prisma bindings",
  "Style the landing page with premium dark mode cards",
  "Configure a background worker for async tasks",
  "Add custom CORS headers inside index.ts"
];

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
  const [copiedId, setCopiedId] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Rotate prompt placeholders every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRunAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskPrompt.trim() || runningTask || session.status !== 'active') return;
    await onRunAgent(taskPrompt.trim());
    setTaskPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleRunAgentSubmit(e as any);
    }
  };

  const handleCopyId = () => {
    if (!session.id) return;
    navigator.clipboard.writeText(session.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  const handleCopyKey = () => {
    if (!session.apiKey) return;
    navigator.clipboard.writeText(session.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1500);
  };

  // Render clickable prompt suggestions based on template
  const getPromptChips = () => {
    switch (session.template) {
      case 'node-api-basic':
        return [
          "Add a database health check endpoint",
          "Add user CRUD endpoints with Prisma",
          "Configure CORS origin to allow all"
        ];
      case 'react-static-basic':
        return [
          "Create a premium dark mode dashboard layout",
          "Add an animated navigation sidebar",
          "Add user authentication state variables"
        ];
      case 'python-api-basic':
        return [
          "Add FastAPI dependency injection for DB",
          "Add a background task worker",
          "Create item models and routing"
        ];
      default:
        return [
          "Add a health endpoint",
          "Implement database schema CRUD",
          "Style components with dynamic animations"
        ];
    }
  };

  const chips = getPromptChips();

  // Locked warning text
  const getLockedMessage = () => {
    if (session.status === 'completed') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <LockIcon size={12} /> Edits locked. This session has been completed.
        </span>
      );
    }
    if (session.status === 'failed') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <AlertIcon size={12} /> Session failed. Deployments are disabled.
        </span>
      );
    }
    return null;
  };

  const lockedMessage = getLockedMessage();

  return (
    <div className="playground" id="playground-panel">
      {/* Top bar */}
      <div className="pg-topbar">
        <div>
          <div className="pg-breadcrumb">Playground Session</div>
          <div className="pg-title">{session.name}</div>
          <div className="pg-meta">
            <span className="pg-meta-item">
              ID{' '}
              <span className="copyable-badge" onClick={handleCopyId} title="Copy session ID">
                <code>sess_{session.id.slice(0, 4)}...{session.id.slice(-4)}</code>
                <span className="copy-icon">
                  {copiedId ? (
                    <CheckIcon size={10} className="checkmark" />
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </span>
              </span>
            </span>
            <span className="pg-meta-item">·</span>
            <span className="pg-meta-item">
              API Key{' '}
              <span className="copyable-badge" onClick={handleCopyKey} title="Copy session API Key">
                <code>{session.apiKey ? `${session.apiKey.slice(0, 6)}...` : 'Hidden'}</code>
                <span className="copy-icon">
                  {copiedKey ? (
                    <CheckIcon size={10} className="checkmark" />
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </span>
              </span>
            </span>
            <span className="pg-meta-item">·</span>
            <span className="pg-meta-item">
              Template <code>{templateLabel(session.template)}</code>
            </span>
          </div>
        </div>

        <ConnectionStatus isConnected={isConnected} error={connectionError} />
      </div>

      <div className="pg-grid">
        {/* Left panel: Prompt input */}
        <div className="pg-panel pg-left">
          <section aria-labelledby="prompt-heading" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="panel-header">
              <h2 id="prompt-heading" className="panel-title">Prompt Coding Agent</h2>
              <p className="panel-subtitle">Describe the changes you want. The agent will propose code and infra diffs.</p>
            </div>

            <div className="panel-body">
              {lockedMessage && (
                <div className="locked-banner" role="alert">
                  {lockedMessage}
                </div>
              )}

              <form onSubmit={handleRunAgentSubmit} className="prompt-form" id="form-run-agent">
                <div className={`prompt-textarea-container ${session.status !== 'active' ? 'disabled' : ''}`}>
                  <label htmlFor="textarea-prompt" className="visually-hidden">Prompt instructions for the agent</label>
                  <textarea
                    id="textarea-prompt"
                    className="prompt-textarea"
                    placeholder={`e.g. "${PLACEHOLDERS[placeholderIndex]}"`}
                    value={taskPrompt}
                    onChange={e => setTaskPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={runningTask || session.status !== 'active'}
                    rows={6}
                    required
                  />

                  {session.status === 'active' && (
                    <div className="prompt-chips-container">
                      <span className="chips-label">Suggestions:</span>
                      <div className="prompt-chips">
                        {chips.map((chipText, i) => (
                          <button
                            key={i}
                            type="button"
                            className="prompt-chip"
                            onClick={() => !runningTask && setTaskPrompt(chipText)}
                            disabled={runningTask}
                          >
                            {chipText}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="prompt-textarea-footer">
                    <span className="prompt-hint">
                      Capped at ~1500 tokens. <span className="kbd">Ctrl</span>+<span className="kbd">Enter</span> to submit
                    </span>
                    <button
                      id="btn-run-agent"
                      type="submit"
                      className="btn-accent"
                      disabled={runningTask || !taskPrompt.trim() || session.status !== 'active'}
                    >
                      {runningTask ? (
                        <>
                          <SpinnerIcon size={10} style={{ marginRight: 5 }} />
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
                  {[...session.agentTasks].reverse().map((task: AgentTask, idx: number) => {
                    const isExpanded = expandedTasks[task.id] ?? (idx === 0);
                    return (
                      <article key={task.id} className={`task-card ${isExpanded ? 'expanded' : 'collapsed'}`} id={`task-card-${task.id}`} aria-labelledby={`task-card-title-${task.id}`}>
                        {/* Header */}
                        <div 
                          className="task-card-header" 
                          onClick={() => toggleTaskExpanded(task.id)} 
                          style={{ cursor: 'pointer', userSelect: 'none', borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}
                        >
                          <span id={`task-card-title-${task.id}`} className="task-prompt-text" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <span className="collapse-arrow" style={{ display: 'inline-block', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', fontSize: '10px', color: 'var(--text-muted)' }}>▼</span>
                            {task.prompt}
                          </span>
                          <div className="task-header-right">
                            <span className="task-id">task_{task.id.slice(-6)}</span>
                            <TaskBadge status={task.status} />
                          </div>
                        </div>

                        {/* Diff output */}
                        {isExpanded && (task.codeDiff || task.infraDiff) && (
                          <DiffViewer codeDiffStr={task.codeDiff} infraDiffStr={task.infraDiff} deployStatus={task.deployStatus} />
                        )}

                        {/* Actions */}
                        {isExpanded && task.status === 'completed' && (
                          <div className="task-actions">
                            <span className="task-actions-label">
                              Created {new Date(task.createdAt).toLocaleTimeString()}
                            </span>
                            {task.approved === true ? (
                              <>
                                {task.deployStatus === 'packaging' || task.deployStatus === 'uploading' || task.deployStatus === 'deploying' ? (
                                  <span className="task-decision decision-deploying">
                                    <SpinnerIcon size={12} strokeWidth={3} style={{ marginRight: 5 }} />
                                    {task.deployStatus === 'packaging' ? 'Packaging Build...'
                                     : task.deployStatus === 'uploading' ? 'Uploading Archive...'
                                     : 'Deploying to Zerops...'}
                                  </span>
                                ) : task.deployStatus === 'deployed' ? (
                                  <span className="task-decision decision-approved">
                                    <CheckIcon size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                                    Approved & Deployed
                                  </span>
                                ) : task.deployStatus === 'failed' ? (
                                  <span className="task-decision decision-rejected" style={{ color: 'var(--amber)', display: 'inline-flex', alignItems: 'center' }}>
                                    <AlertIcon size={12} style={{ marginRight: 5, color: 'var(--amber)' }} />
                                    Deployment Failed
                                  </span>
                                ) : (
                                  <span className="task-decision decision-approved">
                                    <CheckIcon size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                                    Approved
                                  </span>
                                )}
                              </>
                            ) : task.approved === false ? (
                              <span className="task-decision decision-rejected">
                                <CrossIcon size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                                  Rejected
                              </span>
                            ) : approvingTaskId === task.id ? (
                              <span className="task-decision decision-deploying">
                                <SpinnerIcon size={12} strokeWidth={3} style={{ marginRight: 5 }} />
                                Triggering Deploy...
                              </span>
                            ) : (
                              <div className="task-actions-buttons">
                                <button
                                  id={`btn-approve-${task.id}`}
                                  className="btn-success"
                                  onClick={(e) => {
                                    e.stopPropagation(); // prevent collapsing on click
                                    onApproveTask(task.id);
                                  }}
                                >
                                  <CheckIcon size={11} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                                  Approve & Deploy
                                </button>
                                <button
                                  id={`btn-reject-${task.id}`}
                                  className="btn-danger"
                                  onClick={(e) => {
                                    e.stopPropagation(); // prevent collapsing on click
                                    onRejectTask(task.id);
                                  }}
                                >
                                  <CrossIcon size={11} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
