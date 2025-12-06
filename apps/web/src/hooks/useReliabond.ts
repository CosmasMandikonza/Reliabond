// ===========================================
// RELIABOND FRONTEND - CUSTOM HOOKS
// ===========================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api, queryKeys } from '../lib/api';
import { useReliabondStore } from '../stores/reliabondStore';

// Polling interval for real-time updates
const POLL_INTERVAL = 5000; // 5 seconds

export function useServices() {
  const setServices = useReliabondStore((s) => s.setServices);
  
  const query = useQuery({
    queryKey: queryKeys.services,
    queryFn: () => api.getServices(),
    refetchInterval: POLL_INTERVAL,
    staleTime: 3000,
  });

  // Update store when data changes
  useEffect(() => {
    if (query.data?.services) {
      setServices(query.data.services);
    }
  }, [query.data?.services, setServices]);

  return query;
}

export function useService(id: string | null) {
  return useQuery({
    queryKey: queryKeys.service(id || ''),
    queryFn: () => api.getService(id!),
    enabled: !!id,
    refetchInterval: POLL_INTERVAL,
  });
}

export function useIncidents(serviceId?: string) {
  const setIncidents = useReliabondStore((s) => s.setIncidents);

  const query = useQuery({
    queryKey: queryKeys.incidents(serviceId),
    queryFn: () => api.getIncidents(serviceId),
    refetchInterval: POLL_INTERVAL,
    staleTime: 3000,
  });

  // Update store when data changes (only for all incidents)
  useEffect(() => {
    if (!serviceId && query.data?.incidents) {
      setIncidents(query.data.incidents);
    }
  }, [serviceId, query.data?.incidents, setIncidents]);

  return query;
}

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => api.getStats(),
    refetchInterval: POLL_INTERVAL,
    staleTime: 3000,
  });
}

// Hook to format ETH values
export function useFormatEth(weiString: string | number): string {
  const wei = BigInt(weiString.toString());
  const eth = Number(wei) / 1e18;
  
  if (eth === 0) return '0';
  if (eth < 0.0001) return '<0.0001';
  if (eth < 1) return eth.toFixed(4);
  return eth.toFixed(2);
}

// Hook for time formatting
export function useRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}
