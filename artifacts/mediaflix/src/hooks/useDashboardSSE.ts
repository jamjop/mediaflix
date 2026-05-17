import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetActivityQueryKey,
  getGetDownloadsQueryKey,
  getGetServiceStatusQueryKey,
} from "@workspace/api-client-react";

/**
 * Opens a Server-Sent Events connection to /api/stream and pushes each
 * event payload directly into the React Query cache. Existing components
 * using useGetActivity / useGetDownloads / useGetServiceStatus re-render
 * automatically — no polling required.
 *
 * EventSource auto-reconnects on network interruptions.
 */
export function useDashboardSSE(): { connected: boolean } {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!window.EventSource) return;

    const es = new EventSource("/api/stream");
    esRef.current = es;

    es.addEventListener("open", () => setConnected(true));

    es.addEventListener("activity", (e: MessageEvent) => {
      try {
        queryClient.setQueryData(getGetActivityQueryKey(), JSON.parse(e.data));
      } catch {}
    });

    es.addEventListener("downloads", (e: MessageEvent) => {
      try {
        queryClient.setQueryData(getGetDownloadsQueryKey(), JSON.parse(e.data));
      } catch {}
    });

    es.addEventListener("serviceStatus", (e: MessageEvent) => {
      try {
        queryClient.setQueryData(getGetServiceStatusQueryKey(), JSON.parse(e.data));
      } catch {}
    });

    es.addEventListener("error", () => setConnected(false));

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [queryClient]);

  return { connected };
}
