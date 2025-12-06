'use client';

// ===========================================
// RELIABILITY MAP - Network Graph Component
// ===========================================

import { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReliabondStore } from '../stores/reliabondStore';
import type { Service, ServiceStatus } from '../lib/types';

interface ReliabilityMapProps {
  services: Service[];
}

// Status to color mapping
const statusColors: Record<ServiceStatus, string> = {
  OK: '#10b981',
  WARN: '#f59e0b',
  BREACHED: '#ef4444',
  UNKNOWN: '#6b7280',
};

const statusGlowColors: Record<ServiceStatus, string> = {
  OK: 'rgba(16, 185, 129, 0.4)',
  WARN: 'rgba(245, 158, 11, 0.5)',
  BREACHED: 'rgba(239, 68, 68, 0.6)',
  UNKNOWN: 'rgba(107, 114, 128, 0.3)',
};

export function ReliabilityMap({ services }: ReliabilityMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectService = useReliabondStore((s) => s.selectService);
  const selectedServiceId = useReliabondStore((s) => s.selectedServiceId);

  // Calculate node positions in a radial layout
  const nodes = useMemo(() => {
    const centerX = 200;
    const centerY = 150;
    const radius = 100;

    return services.map((service, i) => {
      const angle = (i / services.length) * 2 * Math.PI - Math.PI / 2;
      return {
        ...service,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        size: 20 + (service.reliabilityScore / 100) * 15,
      };
    });
  }, [services]);

  // Agent node at center
  const agentNode = {
    id: 'agent-probe',
    label: 'Probe Agent',
    x: 200,
    y: 150,
    size: 25,
    status: 'OK' as ServiceStatus,
  };

  // Draw connections with Canvas for performance
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw edges from agent to each service
    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.moveTo(agentNode.x, agentNode.y);
      ctx.lineTo(node.x, node.y);
      ctx.strokeStyle = statusColors[node.status];
      ctx.globalAlpha = node.id === selectedServiceId ? 0.8 : 0.2;
      ctx.lineWidth = node.id === selectedServiceId ? 2 : 1;
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
  }, [nodes, selectedServiceId]);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <h2 className="panel-title flex items-center gap-2">
          <span className="w-2 h-2 bg-bond rounded-full animate-pulse" />
          Reliability Network
        </h2>
        <span className="text-xxs text-slate-500 font-mono">
          {services.length} services
        </span>
      </div>

      <div className="relative flex-1 p-4 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        
        {/* Canvas for edges */}
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          className="absolute inset-0 w-full h-full"
        />

        {/* Service nodes */}
        <AnimatePresence>
          {nodes.map((node) => (
            <motion.button
              key={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => selectService(node.id)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
              style={{
                left: node.x,
                top: node.y,
              }}
            >
              {/* Glow effect */}
              <div
                className="absolute inset-0 rounded-full blur-md animate-pulse"
                style={{
                  backgroundColor: statusGlowColors[node.status],
                  transform: node.id === selectedServiceId ? 'scale(1.5)' : 'scale(1)',
                }}
              />
              
              {/* Node */}
              <div
                className="relative rounded-full border-2 transition-all duration-300"
                style={{
                  width: node.size,
                  height: node.size,
                  backgroundColor: `${statusColors[node.status]}20`,
                  borderColor: statusColors[node.status],
                  boxShadow: node.id === selectedServiceId
                    ? `0 0 20px ${statusGlowColors[node.status]}`
                    : 'none',
                }}
              >
                {/* Score inside */}
                <span className="absolute inset-0 flex items-center justify-center text-xxs font-mono font-bold text-white">
                  {Math.round(node.reliabilityScore)}
                </span>
              </div>

              {/* Label tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-slate-900/95 px-2 py-1 rounded text-xxs text-slate-300 whitespace-nowrap font-mono border border-slate-700">
                  {node.name}
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Central agent node */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: agentNode.x, top: agentNode.y }}
        >
          <div className="relative">
            {/* Rotating ring */}
            <div 
              className="absolute inset-0 rounded-full border border-bond/50 animate-spin"
              style={{ 
                width: agentNode.size + 10, 
                height: agentNode.size + 10,
                marginLeft: -5,
                marginTop: -5,
                animationDuration: '8s',
              }}
            />
            
            {/* Agent node */}
            <div
              className="relative rounded-full bg-bond/20 border-2 border-bond flex items-center justify-center"
              style={{ width: agentNode.size, height: agentNode.size }}
            >
              <svg className="w-3 h-3 text-bond" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 flex gap-3 text-xxs">
          {(['OK', 'WARN', 'BREACHED'] as ServiceStatus[]).map((status) => (
            <div key={status} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: statusColors[status] }}
              />
              <span className="text-slate-500">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
