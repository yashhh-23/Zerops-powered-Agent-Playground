import { useState, useEffect, useCallback } from 'react';
import type { PlaygroundSession } from '@playground/types';
import { useDebounce } from './useDebounce';

const API = import.meta.env.VITE_API_URL || (
  window.location.hostname.includes('-3000')
    ? window.location.origin.replace('-3000', '-8080')
    : 'http://localhost:8080'
);

function readLocalSessions(): PlaygroundSession[] {
  try {
    const stored = localStorage.getItem('playground_sessions');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('[localStorage] Failed to parse sessions:', e);
    return [];
  }
}

function getApiKeyFor(id: string): string {
  return (readLocalSessions().find(s => s.id === id) as any)?.apiKey || '';
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  const r = await fetch(url, init);
  if (!r.ok) {
    const errorData = await r.json().catch(() => ({}));
    if (r.status === 429) {
      throw new Error(errorData.message || 'Rate limit exceeded. Please try again later.');
    }
    throw new Error(errorData.message || errorData.error || `HTTP error! status: ${r.status}`);
  }
  return r;
}

export function useSessions() {
  const [sessions, setSessions]           = useState<PlaygroundSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<PlaygroundSession | null>(null);
  const [searchQuery, setSearchQuery]     = useState('');

  const [apiHealth, setApiHealth]   = useState<{ status: string } | null>(null);
  const [dbHealth,  setDbHealth]    = useState<{ status: string; db?: string } | null>(null);

  const [runningTask, setRunningTask] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const [loadingHealth,   setLoadingHealth]   = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingDetails,  setLoadingDetails]  = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const refreshHealth = useCallback(() => {
    setLoadingHealth(true);
    Promise.all([
      fetch(`${API}/health`).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/health/db`).then(r => r.json()).catch(() => null),
    ]).then(([api, db]) => {
      setApiHealth(api);
      setDbHealth(db);
      setLoadingHealth(false);
    });
  }, []);

  const fetchSessionDetails = useCallback(async (id: string, silent = false) => {
    if (!silent) setLoadingDetails(true);
    try {
      const apiKey = getApiKeyFor(id);

      const r = await safeFetch(`${API}/api/sessions/${id}`, {
        headers: { 'X-API-Key': apiKey }
      });
      const data = await r.json();
      setActiveSession(data);
    } catch (e: any) {
      if (!silent) setError(e.message);
      throw e;
    } finally {
      if (!silent) setLoadingDetails(false);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const localSessions = readLocalSessions();
      
      const updatedSessions = await Promise.all(
        localSessions.map(async (s) => {
          try {
            const r = await safeFetch(`${API}/api/sessions/${s.id}`, {
              headers: { 'X-API-Key': (s as any).apiKey || '' }
            });
            return await r.json();
          } catch {
            return s;
          }
        })
      );
      
      setSessions(updatedSessions);
      localStorage.setItem('playground_sessions', JSON.stringify(updatedSessions));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const createSession = useCallback(async (name: string, template: string) => {
    if (isCreatingSession) return;
    setIsCreatingSession(true);
    setError(null);
    try {
      const r = await safeFetch(`${API}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, template }),
      });
      const s = await r.json();
      
      const localSessions = readLocalSessions();
      localSessions.unshift(s);
      localStorage.setItem('playground_sessions', JSON.stringify(localSessions));

      await fetchSessions();
      setActiveSessionId(s.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsCreatingSession(false);
    }
  }, [isCreatingSession, fetchSessions]);

  const importSession = useCallback(async (importApiKey: string) => {
    if (!importApiKey.trim()) return;
    setError(null);
    try {
      const r = await safeFetch(`${API}/api/sessions`, {
        headers: { 'X-API-Key': importApiKey.trim() }
      });
      const data = await r.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No session found for this API Key.');
      }
      
      const foundSession = data[0];
      const sessionWithKey = { ...foundSession, apiKey: importApiKey.trim() };

      const localSessions = readLocalSessions();
      
      if (!localSessions.some((s: any) => s.id === sessionWithKey.id)) {
        localSessions.unshift(sessionWithKey);
        localStorage.setItem('playground_sessions', JSON.stringify(localSessions));
      }

      await fetchSessions();
      setActiveSessionId(sessionWithKey.id);
    } catch (e: any) {
      setError(e.message || 'Failed to import session.');
    }
  }, [fetchSessions]);

  const runAgent = useCallback(async (prompt: string) => {
    if (!prompt.trim() || !activeSessionId || runningTask) return;
    setRunningTask(true);
    try {
      const apiKey = getApiKeyFor(activeSessionId);

      await safeFetch(`${API}/api/sessions/${activeSessionId}/tasks`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({ prompt }),
      });
      await fetchSessionDetails(activeSessionId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunningTask(false);
    }
  }, [activeSessionId, runningTask, fetchSessionDetails]);

  const approveTask = useCallback(async (taskId: string) => {
    if (!activeSessionId) return;
    setApprovingTaskId(taskId);
    try {
      const apiKey = getApiKeyFor(activeSessionId);

      const r = await safeFetch(`${API}/api/tasks/${taskId}/approve`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey }
      });
      const d = await r.json();
      setError(null);
      await fetchSessionDetails(activeSessionId);
      console.info('[Approved]', d.message);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApprovingTaskId(null);
    }
  }, [activeSessionId, fetchSessionDetails]);

  const rejectTask = useCallback(async (taskId: string) => {
    if (!activeSessionId) return;
    try {
      const apiKey = getApiKeyFor(activeSessionId);

      await safeFetch(`${API}/api/tasks/${taskId}/reject`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey }
      });
      await fetchSessionDetails(activeSessionId);
    } catch (e: any) {
      setError(e.message);
    }
  }, [activeSessionId, fetchSessionDetails]);

  useEffect(() => {
    refreshHealth();
    fetchSessions();
  }, [refreshHealth, fetchSessions]);

  useEffect(() => {
    if (activeSessionId) {
      fetchSessionDetails(activeSessionId).catch(() => {});
    } else {
      setActiveSession(null);
    }
  }, [activeSessionId, fetchSessionDetails]);

  const filteredSessions = sessions.filter(s =>
    s.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  return {
    API,
    sessions: filteredSessions,
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
    fetchSessions,
    fetchSessionDetails,
    createSession,
    importSession,
    runAgent,
    approveTask,
    rejectTask,
  };
}
