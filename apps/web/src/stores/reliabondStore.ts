// ===========================================
// RELIABOND FRONTEND - ZUSTAND STORE
// ===========================================

import { create } from 'zustand';
import type { Service, Incident } from '../lib/types';

interface ReliabondState {
  // Selected items
  selectedServiceId: string | null;
  selectedIncidentId: string | null;
  
  // UI state
  drawerOpen: boolean;
  timelineRange: [number, number]; // Start and end timestamps
  
  // Data (cached from API)
  services: Service[];
  incidents: Incident[];
  
  // Actions
  selectService: (id: string | null) => void;
  selectIncident: (id: string | null) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setTimelineRange: (range: [number, number]) => void;
  setServices: (services: Service[]) => void;
  setIncidents: (incidents: Incident[]) => void;
}

export const useReliabondStore = create<ReliabondState>((set) => ({
  // Initial state
  selectedServiceId: null,
  selectedIncidentId: null,
  drawerOpen: false,
  // Use fixed initial values to avoid SSR hydration mismatch
  // Will be updated client-side on mount
  timelineRange: [0, 0] as [number, number],
  services: [],
  incidents: [],

  // Actions
  selectService: (id) => set({ selectedServiceId: id, drawerOpen: !!id }),
  selectIncident: (id) => set((state) => {
    // Find the incident and its service
    const incident = state.incidents.find((i) => i.id === id);
    return {
      selectedIncidentId: id,
      selectedServiceId: incident?.serviceId || state.selectedServiceId,
      drawerOpen: !!id,
    };
  }),
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false, selectedServiceId: null, selectedIncidentId: null }),
  setTimelineRange: (range) => set({ timelineRange: range }),
  setServices: (services) => set({ services }),
  setIncidents: (incidents) => set({ incidents }),
}));

// Selectors
export const useSelectedService = () => {
  const selectedId = useReliabondStore((s) => s.selectedServiceId);
  const services = useReliabondStore((s) => s.services);
  return services.find((s) => s.id === selectedId);
};

export const useSelectedIncident = () => {
  const selectedId = useReliabondStore((s) => s.selectedIncidentId);
  const incidents = useReliabondStore((s) => s.incidents);
  return incidents.find((i) => i.id === selectedId);
};

export const useServiceIncidents = (serviceId: string | null) => {
  const incidents = useReliabondStore((s) => s.incidents);
  if (!serviceId) return [];
  return incidents.filter((i) => i.serviceId === serviceId);
};
