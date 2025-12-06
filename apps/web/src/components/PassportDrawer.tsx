'use client';

// ===========================================
// PASSPORT DRAWER - Service reliability passport
// ===========================================

import { Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  X,
  Shield,
  Activity,
  Clock,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Coins,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useReliabondStore, useSelectedService, useServiceIncidents } from '../stores/reliabondStore';
import type { ServiceStatus } from '../lib/types';

const statusConfig: Record<ServiceStatus, { color: string; bg: string; icon: typeof CheckCircle }> = {
  OK: { color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle },
  WARN: { color: 'text-amber-400', bg: 'bg-amber-500/20', icon: AlertTriangle },
  BREACHED: { color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertTriangle },
  UNKNOWN: { color: 'text-slate-400', bg: 'bg-slate-500/20', icon: Activity },
};

export function PassportDrawer() {
  const drawerOpen = useReliabondStore((s) => s.drawerOpen);
  const closeDrawer = useReliabondStore((s) => s.closeDrawer);
  const service = useSelectedService();
  const incidents = useServiceIncidents(service?.id || null);

  const config = service ? statusConfig[service.status] : statusConfig.UNKNOWN;
  const StatusIcon = config.icon;

  // Calculate reliability trend
  const reliabilityTrend = service && incidents.length > 0 ? -2.3 : 0.5;

  return (
    <AnimatePresence>
      {drawerOpen && service && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-slate-900 border-l border-slate-700/50 z-50 overflow-hidden"
          >
            {/* Header with close button */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={closeDrawer}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Passport content */}
            <div className="h-full overflow-y-auto custom-scrollbar">
              {/* Passport header */}
              <div className="passport-header relative">
                <div className="absolute inset-0 bg-gradient-to-br from-bond/10 to-transparent" />
                
                {/* Decorative pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="0.5" fill="none" className="text-bond" />
                    <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="0.5" fill="none" className="text-bond" />
                    <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="0.5" fill="none" className="text-bond" />
                  </svg>
                </div>

                <div className="relative p-6 pt-8">
                  {/* Status badge */}
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} mb-3`}>
                    <StatusIcon className="w-3 h-3" />
                    {service.status}
                  </div>

                  {/* Service name */}
                  <h2 className="text-xl font-display font-bold text-white mb-1">
                    {service.name}
                  </h2>
                  <p className="text-sm text-slate-400 mb-4">
                    {service.description}
                  </p>

                  {/* Reliability score */}
                  <div className="flex items-end gap-3">
                    <div className="metric-value text-4xl text-gradient">
                      {service.reliabilityScore.toFixed(1)}
                    </div>
                    <div className="pb-1">
                      <div className="flex items-center gap-1 text-sm">
                        {reliabilityTrend >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        )}
                        <span className={reliabilityTrend >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {reliabilityTrend >= 0 ? '+' : ''}{reliabilityTrend.toFixed(1)}%
                        </span>
                      </div>
                      <div className="metric-label">Reliability Score</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SLO Configuration */}
              <div className="p-6 border-b border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-bond" />
                  SLO Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-lg font-mono font-semibold text-white">
                      {service.sloConfig.minUptimePercent}%
                    </div>
                    <div className="metric-label">Min Uptime</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-lg font-mono font-semibold text-white">
                      {service.sloConfig.maxLatencyP99Ms}ms
                    </div>
                    <div className="metric-label">Max P99 Latency</div>
                  </div>
                </div>
              </div>

              {/* Current Metrics */}
              {service.currentMetrics && (
                <div className="p-6 border-b border-slate-700/50">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-bond" />
                    Current Metrics
                  </h3>
                  <div className="space-y-3">
                    <MetricBar
                      label="Uptime"
                      value={service.currentMetrics.uptimePercent}
                      target={service.sloConfig.minUptimePercent}
                      format={(v) => `${v.toFixed(2)}%`}
                      inverted={false}
                    />
                    <MetricBar
                      label="P99 Latency"
                      value={service.currentMetrics.p99LatencyMs}
                      target={service.sloConfig.maxLatencyP99Ms}
                      format={(v) => `${Math.round(v)}ms`}
                      inverted={true}
                    />
                  </div>
                </div>
              )}

              {/* Bond Information */}
              <div className="p-6 border-b border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  SLA Bond
                </h3>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Bond Balance</span>
                    <span className="font-mono font-semibold text-amber-400">1.00 ETH</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-400 text-sm">Contract</span>
                    <a
                      href={`https://sepolia.basescan.org/address/${service.bondContractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-bond hover:text-bond-light text-sm flex items-center gap-1"
                    >
                      {service.bondContractAddress.slice(0, 8)}...
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-xxs text-slate-500">
                    Owner: {service.owner.slice(0, 10)}...{service.owner.slice(-8)}
                  </div>
                </div>
              </div>

              {/* Incident History */}
              <div className="p-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-bond" />
                  Incident History
                </h3>
                {incidents.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No incidents recorded
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incidents.map((incident) => (
                      <div
                        key={incident.id}
                        className="bg-slate-800/50 rounded-lg p-3 border-l-2 border-red-500/50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-semibold text-red-400 uppercase">
                            {incident.breachType} breach
                          </span>
                          <span className="text-xxs text-slate-500">
                            {format(incident.createdAt, 'MMM d, HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 mb-2">{incident.summary}</p>
                        <div className="flex items-center justify-between text-xxs">
                          <span className="text-amber-400">
                            {incident.compensationPercent}% payout
                          </span>
                          {incident.txHash && (
                            <a
                              href={`https://sepolia.basescan.org/tx/${incident.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-bond hover:text-bond-light flex items-center gap-1"
                            >
                              View TX <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Metric bar component
function MetricBar({
  label,
  value,
  target,
  format,
  inverted,
}: {
  label: string;
  value: number;
  target: number;
  format: (v: number) => string;
  inverted: boolean;
}) {
  const percentage = inverted
    ? Math.min(100, (target / value) * 100)
    : Math.min(100, (value / target) * 100);
  
  const isHealthy = inverted ? value <= target : value >= target;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-sm font-mono ${isHealthy ? 'text-green-400' : 'text-red-400'}`}>
          {format(value)}
        </span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isHealthy ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xxs text-slate-500 mt-0.5">
        Target: {format(target)}
      </div>
    </div>
  );
}
