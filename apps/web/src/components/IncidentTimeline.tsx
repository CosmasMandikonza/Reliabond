'use client';

// ===========================================
// INCIDENT TIMELINE - Horizontal scrollable timeline
// ===========================================

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { AlertTriangle, Coins, Activity, CheckCircle } from 'lucide-react';
import { useReliabondStore } from '../stores/reliabondStore';
import type { Incident, Service } from '../lib/types';

interface IncidentTimelineProps {
  incidents: Incident[];
  services: Service[];
}

type TimelineEventType = 'probe' | 'breach' | 'payout' | 'recovery';

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: number;
  serviceId: string;
  serviceName: string;
  data: Incident | null;
}

const eventIcons: Record<TimelineEventType, typeof AlertTriangle> = {
  probe: Activity,
  breach: AlertTriangle,
  payout: Coins,
  recovery: CheckCircle,
};

const eventColors: Record<TimelineEventType, string> = {
  probe: 'text-slate-500 bg-slate-700',
  breach: 'text-red-400 bg-red-500/20 border-red-500/50',
  payout: 'text-amber-400 bg-amber-500/20 border-amber-500/50',
  recovery: 'text-green-400 bg-green-500/20 border-green-500/50',
};

export function IncidentTimeline({ incidents, services }: IncidentTimelineProps) {
  // Hydration safety: only render dynamic content after mount
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const selectIncident = useReliabondStore((s) => s.selectIncident);
  const selectedIncidentId = useReliabondStore((s) => s.selectedIncidentId);
  const timelineRange = useReliabondStore((s) => s.timelineRange);

  // Convert incidents to timeline events
  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];

    // Add incident events
    incidents.forEach((incident) => {
      // Breach start
      allEvents.push({
        id: `${incident.id}-breach`,
        type: 'breach',
        timestamp: incident.createdAt - incident.breachDurationSeconds * 1000,
        serviceId: incident.serviceId,
        serviceName: incident.serviceName,
        data: incident,
      });

      // Payout
      if (incident.status === 'executed') {
        allEvents.push({
          id: `${incident.id}-payout`,
          type: 'payout',
          timestamp: incident.createdAt,
          serviceId: incident.serviceId,
          serviceName: incident.serviceName,
          data: incident,
        });
      }
    });

    // Add synthetic probe events (last 24h, every 30 min)
    const now = Date.now();
    for (let t = now - 24 * 60 * 60 * 1000; t < now; t += 30 * 60 * 1000) {
      services.slice(0, 2).forEach((service) => {
        allEvents.push({
          id: `probe-${service.id}-${t}`,
          type: 'probe',
          timestamp: t,
          serviceId: service.id,
          serviceName: service.name,
          data: null,
        });
      });
    }

    // Sort by timestamp
    return allEvents.sort((a, b) => a.timestamp - b.timestamp);
  }, [incidents, services]);

  // Filter to timeline range
  const visibleEvents = events.filter(
    (e) => e.timestamp >= timelineRange[0] && e.timestamp <= timelineRange[1]
  );

  // Time axis labels
  const timeLabels = useMemo(() => {
    const labels: { time: number; label: string }[] = [];
    const duration = timelineRange[1] - timelineRange[0];
    const step = duration / 6;

    for (let i = 0; i <= 6; i++) {
      const time = timelineRange[0] + step * i;
      labels.push({
        time,
        label: format(time, 'HH:mm'),
      });
    }
    return labels;
  }, [timelineRange]);

  const getEventPosition = (timestamp: number) => {
    const range = timelineRange[1] - timelineRange[0];
    if (range === 0) return 0; // Prevent division by zero
    return ((timestamp - timelineRange[0]) / range) * 100;
  };

  // Show skeleton during SSR / before hydration / before timeline initialized
  if (!isMounted || timelineRange[0] === 0) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <h2 className="panel-title flex items-center gap-2">
            <Activity className="w-4 h-4 text-bond" />
            Incident Timeline
          </h2>
          <span className="text-xxs text-slate-500 font-mono">
            {incidents.length} incidents
          </span>
        </div>
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-6 mb-2 border-b border-slate-700/50" />
          <div className="relative h-20">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-700" />
          </div>
          <div className="flex gap-4 mt-4 pt-3 border-t border-slate-700/50">
            {(['breach', 'payout', 'recovery'] as TimelineEventType[]).map((type) => {
              const Icon = eventIcons[type];
              return (
                <div key={type} className="flex items-center gap-1.5 text-xxs text-slate-500">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${eventColors[type]}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className="capitalize">{type}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <h2 className="panel-title flex items-center gap-2">
          <Activity className="w-4 h-4 text-bond" />
          Incident Timeline
        </h2>
        <span className="text-xxs text-slate-500 font-mono">
          {incidents.length} incidents
        </span>
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        {/* Time axis */}
        <div className="relative h-6 mb-2 border-b border-slate-700/50">
          {timeLabels.map(({ time, label }) => (
            <div
              key={time}
              className="absolute top-0 transform -translate-x-1/2"
              style={{ left: `${getEventPosition(time)}%` }}
            >
              <span className="text-xxs text-slate-500 font-mono" suppressHydrationWarning>{label}</span>
            </div>
          ))}
        </div>

        {/* Timeline track */}
        <div className="relative h-20 overflow-x-auto custom-scrollbar">
          {/* Track line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-700" />

          {/* Events */}
          {visibleEvents.map((event, index) => {
            const Icon = eventIcons[event.type];
            const isSelected = event.data?.id === selectedIncidentId;
            const position = getEventPosition(event.timestamp);

            // Skip probe events for cleaner display (show only 1 in 10)
            if (event.type === 'probe' && index % 10 !== 0) return null;

            return (
              <motion.button
                key={event.id}
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => event.data && selectIncident(event.data.id)}
                className={`
                  absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2
                  ${event.type === 'probe' ? 'w-2 h-2' : 'w-8 h-8'}
                  rounded-full border transition-all duration-200
                  ${eventColors[event.type]}
                  ${isSelected ? 'ring-2 ring-accent-400 ring-offset-2 ring-offset-slate-900' : ''}
                  ${event.data ? 'cursor-pointer hover:scale-125' : 'cursor-default'}
                `}
                style={{ left: `${position}%` }}
              >
                {event.type !== 'probe' && (
                  <Icon className="w-4 h-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                )}

                {/* Tooltip */}
                {event.type !== 'probe' && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 hover:opacity-100 pointer-events-none z-10">
                    <div className="bg-slate-900/95 border border-slate-700 rounded px-2 py-1 text-xxs whitespace-nowrap">
                      <div className="font-semibold text-slate-200">{event.serviceName}</div>
                      <div className="text-slate-400" suppressHydrationWarning>
                        {format(event.timestamp, 'MMM d, HH:mm')}
                      </div>
                      {event.type === 'payout' && event.data && (
                        <div className="text-amber-400">
                          {event.data.compensationPercent}% payout
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}

          {/* Breach duration bands */}
          {incidents
            .filter((i) => i.status === 'executed')
            .map((incident) => {
              const startPos = getEventPosition(
                incident.createdAt - incident.breachDurationSeconds * 1000
              );
              const endPos = getEventPosition(incident.createdAt);
              const width = endPos - startPos;

              if (width < 0 || startPos > 100 || endPos < 0) return null;

              return (
                <div
                  key={`band-${incident.id}`}
                  className="absolute top-1/2 h-3 -translate-y-1/2 bg-red-500/10 border-y border-red-500/30 rounded"
                  style={{
                    left: `${Math.max(0, startPos)}%`,
                    width: `${Math.min(width, 100 - startPos)}%`,
                  }}
                />
              );
            })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 pt-3 border-t border-slate-700/50">
          {(['breach', 'payout', 'recovery'] as TimelineEventType[]).map((type) => {
            const Icon = eventIcons[type];
            return (
              <div key={type} className="flex items-center gap-1.5 text-xxs text-slate-500">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${eventColors[type]}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className="capitalize">{type}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
