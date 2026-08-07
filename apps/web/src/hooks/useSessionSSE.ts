import { useState, useEffect, useRef } from 'react';
import type { PlaygroundSession, AgentTask } from '@playground/types';

interface UseSessionSSEProps {
  sessionId: string | null;
  API: string;
  setActiveSession: React.Dispatch<React.SetStateAction<PlaygroundSession | null>>;
  fetchSessionDetails: (id: string, silent?: boolean) => Promise<any>;
}

export function useSessionSSE({
  sessionId,
  API,
  setActiveSession,
  fetchSessionDetails,
}: UseSessionSSEProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const errorCountRef = useRef(0);

  useEffect(() => {
    // Reset connection state on session change
    setIsConnected(false);
    setConnectionError(null);
    errorCountRef.current = 0;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (!sessionId) {
      return;
    }

    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const stored = localStorage.getItem('playground_sessions');
      const localSessions: PlaygroundSession[] = stored ? JSON.parse(stored) : [];
      const session = localSessions.find(s => s.id === sessionId);
      const apiKey = (session as any)?.apiKey || '';

      const url = `${API}/api/sessions/${sessionId}/events?apiKey=${encodeURIComponent(apiKey)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener('open', () => {
        setIsConnected(true);
        setConnectionError(null);
        errorCountRef.current = 0;
        console.log(`[SSE] Connected to session ${sessionId}`);
      });

      es.addEventListener('task-update', (event: MessageEvent) => {
        try {
          const updatedTask = JSON.parse(event.data) as AgentTask;
          setActiveSession(prev => {
            if (!prev || prev.id !== sessionId) return prev;
            const tasks = prev.agentTasks || [];
            const idx = tasks.findIndex(t => t.id === updatedTask.id);
            let newTasks = [...tasks];
            if (idx !== -1) {
              newTasks[idx] = updatedTask;
            } else {
              newTasks.push(updatedTask);
            }
            return { ...prev, agentTasks: newTasks };
          });
        } catch (err) {
          console.error('[SSE] Error parsing task-update event data:', err);
        }
      });

      es.addEventListener('session-update', (event: MessageEvent) => {
        try {
          const updatedSession = JSON.parse(event.data);
          setActiveSession(prev => {
            if (!prev || prev.id !== sessionId) return prev;
            return { ...prev, ...updatedSession };
          });
        } catch (err) {
          console.error('[SSE] Error parsing session-update event data:', err);
        }
      });

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        eventSourceRef.current = null;

        errorCountRef.current += 1;
        const delay = Math.min(3000 * Math.pow(2, errorCountRef.current), 30000);
        setConnectionError(`Connection lost. Retrying in ${Math.round(delay / 1000)}s...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`[SSE] Reconnecting to session ${sessionId}...`);
          // Fetch full session details once to catch up on any missed updates before reconnecting
          fetchSessionDetails(sessionId!, true).catch(() => {});
          connect();
        }, delay);
      };
    }

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [sessionId, API, setActiveSession, fetchSessionDetails]);

  return {
    isConnected,
    connectionError,
  };
}
