import React, { useState, useEffect } from 'react';
import { StatusBadge } from './StatusBadge';
import type { PlaygroundSession } from '@playground/types';
import { templateLabel, TEMPLATE_OPTIONS } from '@playground/types';
import { formatRelativeTime } from '../utils/time';
import { NodeIcon, ReactIcon, PythonIcon } from './Icons';

interface SessionSidebarProps {
  sessions: PlaygroundSession[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: (name: string, template: string) => Promise<void>;
  onImportSession: (apiKey: string) => Promise<void>;
  apiHealth: any;
  dbHealth: any;
  loadingHealth: boolean;
  loadingSessions: boolean;
  refreshHealth: () => void;
  isCreatingSession: boolean;
  newTemplate: string;
  setNewTemplate: (template: string) => void;
}

const renderTemplateIcon = (iconName: string) => {
  if (iconName === 'react') return <ReactIcon size={14} style={{ color: 'var(--accent)' }} />;
  if (iconName === 'python') return <PythonIcon size={14} style={{ color: '#ffde57' }} />; // Python yellow, distinct from warning amber
  return <NodeIcon size={14} style={{ color: 'var(--green)' }} />;
};

export function SessionSidebar({
  sessions,
  searchQuery,
  setSearchQuery,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onImportSession,
  apiHealth,
  dbHealth,
  loadingHealth,
  loadingSessions,
  refreshHealth,
  isCreatingSession,
  newTemplate,
  setNewTemplate
}: SessionSidebarProps) {
  const [newName, setNewName] = useState('');
  const [importKey, setImportKey] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [sortOrder, setSortOrder] = useState<'recent' | 'alpha' | 'oldest'>('recent');
  
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isCreatingSession) return;
    await onCreateSession(newName.trim(), newTemplate);
    setNewName('');
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importKey.trim() || isImporting) return;
    setIsImporting(true);
    await onImportSession(importKey.trim());
    setImportKey('');
    setIsImporting(false);
  };

  const dotClass = (status: string) =>
    status === 'active' ? 'dot-active' : status === 'completed' ? 'dot-completed' : 'dot-failed';

  return (
    <aside className="sidebar" aria-label="Sidebar navigation">
      {/* Branded Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon-custom">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="2" width="20" height="8" rx="1.5" />
            <rect x="2" y="14" width="20" height="8" rx="1.5" />
            <line x1="6" y1="6" x2="6.01" y2="6" />
            <line x1="6" y1="18" x2="6.01" y2="18" />
            <path d="M18 6h-4" />
            <path d="M18 18h-4" />
          </svg>
        </div>
        <div className="brand-group" style={{ flex: 1 }}>
          <span className="brand-name">Zerops Agent</span>
          <span className="brand-sub">PLAYGROUND</span>
        </div>
        <button
          className="health-refresh-btn"
          onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          title="Toggle light/dark mode"
          style={{ marginLeft: 'auto', padding: '4px', minHeight: 'unset', minWidth: 'unset', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
      </div>

      <div className="sidebar-body">
        {/* System Status Bento Grid */}
        <section className="sidebar-section" aria-labelledby="status-heading">
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span id="status-heading">Metrics &amp; Status</span>
            <button className="health-refresh-btn" onClick={refreshHealth} title="Refresh health status" aria-label="Refresh health status" id="btn-refresh-health">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loadingHealth ? 'spinning' : ''}>
                <path d="M23 4v6h-6"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>
          </div>
          <div className="bento-grid">
            <div className="bento-card bento-api">
              <span className="bento-label">API SERVER</span>
              <div className="bento-value-row">
                <span className={`pulse-dot ${apiHealth?.status === 'ok' ? 'pulse-green' : 'pulse-red'}`} />
                <span className="bento-val">{apiHealth?.status === 'ok' ? 'ONLINE' : 'OFFLINE'}</span>
              </div>
            </div>
            
            <div className="bento-card bento-db">
              <span className="bento-label">DATABASE</span>
              <div className="bento-value-row">
                <span className={`pulse-dot ${dbHealth?.status === 'ok' ? 'pulse-green' : dbHealth?.status === 'error' ? 'pulse-red' : 'pulse-amber'}`} />
                <span className="bento-val">{dbHealth?.status === 'ok' ? 'LIVE' : dbHealth?.status === 'error' ? 'DOWN' : 'SYNC'}</span>
              </div>
            </div>

            <div className="bento-card bento-stat">
              <span className="bento-label">SESSIONS</span>
              <span className="bento-number">{sessions.length}</span>
            </div>

            <div className="bento-card bento-host">
              <span className="bento-label">HOST</span>
              <span className="bento-tag">ZEROPS</span>
            </div>
          </div>
        </section>

        <div className="sidebar-divider" />

         {/* New Session */}
        <section className="sidebar-section" aria-labelledby="new-playground-heading">
          <span id="new-playground-heading" className="section-label">New Playground</span>
          <form className="create-form" onSubmit={handleSubmit} id="form-create-session">
            <div className="field-group">
              <label htmlFor="input-session-name" className="field-label">PLAYGROUND NAME</label>
              <input
                id="input-session-name"
                className="field-input session-name-input"
                type="text"
                placeholder="e.g. auth-sandbox"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                disabled={isCreatingSession}
                required
              />
              <span className="field-helper">Name of your sandboxed deployment.</span>
            </div>
            
            <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="field-label">SELECT STACK TEMPLATE</span>
              <div className="template-cards">
                {TEMPLATE_OPTIONS.map((opt) => (
                  <div
                    key={opt.key}
                    className={`template-card ${newTemplate === opt.key ? 'selected' : ''}`}
                    onClick={() => !isCreatingSession && setNewTemplate(opt.key)}
                    role="radio"
                    aria-checked={newTemplate === opt.key}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!isCreatingSession) setNewTemplate(opt.key);
                      }
                    }}
                  >
                    <div className="template-card-header">
                      <span className="template-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {renderTemplateIcon(opt.icon)}
                      </span>
                      <span className="template-card-title">{opt.title}</span>
                    </div>
                    <p className="template-card-desc">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <button id="btn-create-session" type="submit" className="btn-primary" disabled={isCreatingSession || !newName.trim()}>
              {isCreatingSession ? 'Creating...' : 'Create Session'}
            </button>
          </form>
        </section>

        {/* Import Session */}
        <section className="sidebar-section" aria-labelledby="import-playground-heading">
          <span id="import-playground-heading" className="section-label">Import Session</span>
          <form className="create-form" onSubmit={handleImportSubmit} id="form-import-session">
            <div className="field-group">
              <label htmlFor="input-import-key" className="field-label">SESSION API KEY</label>
              <input
                id="input-import-key"
                className="field-input"
                type="text"
                placeholder="Paste session API key…"
                value={importKey}
                onChange={e => setImportKey(e.target.value)}
                disabled={isImporting}
                required
              />
              <span className="field-helper">Restore a sandbox using its key.</span>
            </div>
            <button id="btn-import-session" type="submit" className="btn-primary" disabled={isImporting || !importKey.trim()}>
              {isImporting ? 'Importing...' : 'Import Session'}
            </button>
          </form>
        </section>

        <div className="sidebar-divider" />

        {/* Session List */}
        <section className="sidebar-section" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} aria-labelledby="playgrounds-heading">
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span id="playgrounds-heading">Playgrounds</span>
              <span className="tasks-count">{sessions.length}</span>
            </div>
            <div className="sort-toggle" role="group" aria-label="Sort sessions">
              <button
                className={`sort-btn ${sortOrder === 'recent' ? 'sort-active' : ''}`}
                onClick={() => setSortOrder('recent')}
                title="Sort by recently active"
                aria-pressed={sortOrder === 'recent'}
              >
                Recent
              </button>
              <button
                className={`sort-btn ${sortOrder === 'alpha' ? 'sort-active' : ''}`}
                onClick={() => setSortOrder('alpha')}
                title="Sort alphabetically"
                aria-pressed={sortOrder === 'alpha'}
              >
                A–Z
              </button>
              <button
                className={`sort-btn ${sortOrder === 'oldest' ? 'sort-active' : ''}`}
                onClick={() => setSortOrder('oldest')}
                title="Sort by oldest first"
                aria-pressed={sortOrder === 'oldest'}
              >
                Oldest
              </button>
            </div>
          </div>

          <div className="search-container">
            <input
              type="text"
              placeholder="Search playgrounds…"
              className="field-input search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search sessions"
            />
          </div>

          {(() => {
            const sorted = [...sessions].sort((a, b) => {
              if (sortOrder === 'alpha') return a.name.localeCompare(b.name);
              if (sortOrder === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              return new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime();
            });

          return loadingSessions ? (
            <div className="skeleton-list" aria-label="Loading playgrounds" role="status">
              <div className="skeleton-item" />
              <div className="skeleton-item" />
              <div className="skeleton-item" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="empty-text">{searchQuery ? 'No matching playgrounds found.' : 'No sessions yet.'}</div>
          ) : (
            <div className="session-list" role="listbox" aria-label="Playground sessions list">
              {sorted.map(s => (
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
                    <span>{formatRelativeTime(s.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          );
          })()}

          {/* Browser Warning Note */}
          <div className="sidebar-warning-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Sessions live locally in this browser. Keep copies of API keys to restore.</span>
          </div>
        </section>
      </div>
    </aside>
  );
}
