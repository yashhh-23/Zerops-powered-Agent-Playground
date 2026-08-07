import React, { useState } from 'react';
import { StatusBadge } from './StatusBadge';
import type { PlaygroundSession } from '@playground/types';

interface SessionSidebarProps {
  sessions: PlaygroundSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: (name: string, template: string) => Promise<void>;
  apiHealth: any;
  dbHealth: any;
  loadingHealth: boolean;
  loadingSessions: boolean;
  refreshHealth: () => void;
  isCreatingSession: boolean;
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  apiHealth,
  dbHealth,
  loadingHealth,
  loadingSessions,
  refreshHealth,
  isCreatingSession
}: SessionSidebarProps) {
  const [newName, setNewName] = useState('');
  const [newTemplate, setNewTemplate] = useState('node-api-basic');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isCreatingSession) return;
    await onCreateSession(newName.trim(), newTemplate);
    setNewName('');
  };

  const dotClass = (status: string) =>
    status === 'active' ? 'dot-active' : status === 'completed' ? 'dot-completed' : 'dot-failed';

  const templateLabel = (t: string) =>
    t === 'node-api-basic' ? 'Node.js API'
    : t === 'react-static-basic' ? 'React Static'
    : t === 'python-api-basic' ? 'Python API'
    : t;

  return (
    <aside className="sidebar" aria-label="Sidebar navigation">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" role="img" aria-label="Lightning logo">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <span className="logo-name">Zerops Agent</span>
        <span className="logo-tag">Playground</span>
      </div>

      <div className="sidebar-body">
        {/* System Status */}
        <section className="sidebar-section" aria-labelledby="status-heading">
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span id="status-heading">System Status</span>
            <button className="health-refresh" onClick={refreshHealth} title="Refresh health status" aria-label="Refresh health status" id="btn-refresh-health">
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
        </section>

        <div className="sidebar-divider" />

        {/* New Session */}
        <section className="sidebar-section" aria-labelledby="new-playground-heading">
          <span id="new-playground-heading" className="section-label">New Playground</span>
          <form className="create-form" onSubmit={handleSubmit} id="form-create-session">
            <label htmlFor="input-session-name" className="visually-hidden">Playground Session Name</label>
            <input
              id="input-session-name"
              className="field-input"
              type="text"
              placeholder="Session name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              disabled={isCreatingSession}
              required
            />
            
            <label htmlFor="select-template" className="visually-hidden">Select Playground Stack Template</label>
            <select
              id="select-template"
              className="field-select"
              value={newTemplate}
              onChange={e => setNewTemplate(e.target.value)}
              disabled={isCreatingSession}
            >
              <option value="node-api-basic">Node.js API Basic</option>
              <option value="react-static-basic">React Static Basic</option>
              <option value="python-api-basic">Python API Basic</option>
            </select>
            
            <button id="btn-create-session" type="submit" className="btn-primary" disabled={isCreatingSession || !newName.trim()}>
              {isCreatingSession ? 'Creating...' : 'Create Session'}
            </button>
          </form>
        </section>

        <div className="sidebar-divider" />

        {/* Session List */}
        <section className="sidebar-section" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} aria-labelledby="playgrounds-heading">
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span id="playgrounds-heading">Playgrounds</span>
            <span className="tasks-count">{sessions.length}</span>
          </div>

          {loadingSessions ? (
            <div className="empty-text">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="empty-text">No sessions yet.</div>
          ) : (
            <div className="session-list" role="listbox" aria-label="Playground sessions list">
              {sessions.map(s => (
                <div
                  key={s.id}
                  id={`session-item-${s.id}`}
                  role="option"
                  aria-selected={activeSessionId === s.id}
                  className={`session-item ${activeSessionId === s.id ? 'selected' : ''}`}
                  onClick={() => onSelectSession(s.id)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSession(s.id);
                    }
                  }}
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
        </section>
      </div>
    </aside>
  );
}
