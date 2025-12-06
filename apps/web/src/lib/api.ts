// ===========================================
// RELIABOND FRONTEND - API CLIENT
// ===========================================

import type { Service, Incident, Stats } from './types';

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL || 'http://localhost:8787';

class ReliabondApi {
  private baseUrl: string;

  constructor(baseUrl: string = MCP_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  }

  async getServices(): Promise<{ services: Service[]; totalCount: number }> {
    return this.fetch('/api/services');
  }

  async getService(id: string): Promise<{ service: Service; metrics: unknown }> {
    return this.fetch(`/api/services/${id}`);
  }

  async getIncidents(serviceId?: string): Promise<{ incidents: Incident[] }> {
    const path = serviceId ? `/api/incidents/${serviceId}` : '/api/incidents';
    return this.fetch(path);
  }

  async getStats(): Promise<Stats> {
    return this.fetch('/api/stats');
  }

  async getHealth(): Promise<{ status: string; version: string; timestamp: number }> {
    return this.fetch('/api/health');
  }
}

export const api = new ReliabondApi();

// React Query hooks
export const queryKeys = {
  services: ['services'] as const,
  service: (id: string) => ['service', id] as const,
  incidents: (serviceId?: string) => serviceId ? ['incidents', serviceId] : ['incidents'] as const,
  stats: ['stats'] as const,
};
