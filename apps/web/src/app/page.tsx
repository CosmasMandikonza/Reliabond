'use client';

// ===========================================
// RELIABOND - MAIN DASHBOARD PAGE
// ===========================================
// 
// Industrial control room aesthetic dashboard
// Built for Nullshot Hacks Season 0 - Track 1a

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Activity, Zap, ExternalLink, Plus, Bot } from 'lucide-react';
import { useServices, useIncidents, useStats } from '../hooks/useReliabond';
import { ReliabilityMap } from '../components/ReliabilityMap';
import { IncidentTimeline } from '../components/IncidentTimeline';
import { PassportDrawer } from '../components/PassportDrawer';
import { BondVault } from '../components/BondVault';
import { ReliabondLogo } from '../components/ReliabondLogo';
import { RegisterServiceForm } from '../components/RegisterServiceForm';
import { useReliabondStore } from '../stores/reliabondStore';

export default function Dashboard() {
  const { data: servicesData, isLoading: servicesLoading, refetch: refetchServices } = useServices();
  const { data: incidentsData, isLoading: incidentsLoading } = useIncidents();
  const { data: statsData, isLoading: statsLoading } = useStats();
  
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const setTimelineRange = useReliabondStore((s) => s.setTimelineRange);

  // Initialize timeline range on client-side only to avoid hydration mismatch
  useEffect(() => {
    const now = Date.now();
    setTimelineRange([now - 24 * 60 * 60 * 1000, now]);
  }, [setTimelineRange]);

  const services = servicesData?.services ?? [];
  const incidents = incidentsData?.incidents ?? [];

  // Count services by status
  const statusCounts = services.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="min-h-screen bg-slate-950 relative">
      {/* Background effects */}
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-br from-bond/5 via-transparent to-teal-500/5 pointer-events-none" />
      
      {/* Scanlines overlay */}
      <div className="fixed inset-0 scanlines pointer-events-none opacity-30" />
      
      {/* Vignette */}
      <div className="vignette" />

      {/* Main content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-screen-2xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <ReliabondLogo size={44} animated={false} />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-xl font-display font-bold text-gradient-gold">
                    Reliabond
                  </h1>
                  <p className="text-xxs text-slate-500 uppercase tracking-[0.2em]">
                    Agents that pay when SLAs break
                  </p>
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <StatusPill label="Healthy" count={statusCounts.OK || 0} color="green" />
                  <StatusPill label="Warning" count={statusCounts.WARN || 0} color="amber" />
                  <StatusPill label="Breached" count={statusCounts.BREACHED || 0} color="red" />
                </div>

                {/* Network indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50">
                  <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                  <span className="text-xs text-slate-400 font-mono">Base Sepolia</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsRegisterOpen(true)}
                    className="btn-primary flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Register Service
                  </button>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost text-xs flex items-center gap-1"
                  >
                    GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard grid */}
        <main className="max-w-screen-2xl mx-auto p-6">
          {/* Hero Banner */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-6 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800/50 to-slate-900 border border-slate-700/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Agents that watch your infra and pay your users when SLAs break
                </h2>
                <p className="text-slate-400 max-w-2xl">
                  Reliabond turns uptime promises into enforceable bonds. Probe agents monitor your Web3 services; 
                  reliability agents trigger on-chain payouts from bonded vaults when SLOs are breached.
                </p>
              </div>
              <div className="hidden lg:flex items-center gap-4 text-xxs text-slate-500">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                  <span>Nullshot Framework</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  <span>Thirdweb Payouts</span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-12 gap-6">
            {/* Left column - Map and Vault */}
            <div className="col-span-4 space-y-6">
              {/* Reliability Map */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="h-80"
              >
                <ReliabilityMap services={services} />
              </motion.div>

              {/* Bond Vault */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <BondVault stats={statsData} isLoading={statsLoading} />
              </motion.div>

              {/* Agent Status */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <AgentStatusPanel />
              </motion.div>
            </div>

            {/* Right column - Timeline and details */}
            <div className="col-span-8 space-y-6">
              {/* Hero metrics */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-3 gap-4"
              >
                <HeroMetric
                  label="Network Reliability"
                  value={calculateNetworkReliability(services)}
                  suffix="%"
                  trend={0.3}
                  color="teal"
                />
                <HeroMetric
                  label="Total Bond Value Protected"
                  value={services.length}
                  suffix=" ETH"
                  trend={1}
                  color="gold"
                />
                <HeroMetric
                  label="Incidents Compensated"
                  value={statsData?.totalIncidents ?? 0}
                  trend={incidents.length > 0 ? -2 : 0}
                  color="red"
                />
              </motion.div>

              {/* Incident Timeline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="h-56"
              >
                <IncidentTimeline incidents={incidents} services={services} />
              </motion.div>

              {/* Recent Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <RecentActivityPanel incidents={incidents} />
              </motion.div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/50 mt-12 bg-slate-900/50">
          <div className="max-w-screen-2xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between text-xxs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-slate-400">Built with Nullshot Framework</span>
                <span>•</span>
                <span>MCP Protocol</span>
                <span>•</span>
                <span>Thirdweb on Base Sepolia</span>
                <span>•</span>
                <span className="text-amber-500/80">Nullshot Hacks Season 0</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-green-500 animate-pulse" />
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Passport drawer */}
      <PassportDrawer />
      
      {/* Register service modal */}
      <RegisterServiceForm 
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={() => refetchServices()}
      />
    </div>
  );
}

// Helper components
function StatusPill({ label, count, color }: { label: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${colors[color]}`}>
      <span className="font-mono font-bold">{count}</span> {label}
    </div>
  );
}

function HeroMetric({
  label,
  value,
  suffix = '',
  trend,
  color = 'teal',
}: {
  label: string;
  value: number;
  suffix?: string;
  trend: number;
  color?: 'teal' | 'gold' | 'red';
}) {
  const colorClasses = {
    teal: 'from-teal-500/10 to-transparent border-teal-500/20',
    gold: 'from-amber-500/10 to-transparent border-amber-500/20',
    red: 'from-red-500/10 to-transparent border-red-500/20',
  };
  
  const valueColors = {
    teal: 'text-teal-400',
    gold: 'text-amber-400',
    red: 'text-red-400',
  };

  return (
    <div className={`panel p-4 bg-gradient-to-br ${colorClasses[color]} border`}>
      <div className="metric-label mb-2">{label}</div>
      <div className="flex items-end gap-2">
        <span className={`metric-value text-3xl ${valueColors[color]}`}>
          {typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 1) : value}
          <span className="text-lg opacity-70">{suffix}</span>
        </span>
        {trend !== 0 && (
          <span
            className={`text-xs mb-1.5 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

function AgentStatusPanel() {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title flex items-center gap-2">
          <Bot className="w-4 h-4 text-teal-400" />
          Nullshot Agents
        </h2>
        <span className="text-xxs text-emerald-400 font-mono">ONLINE</span>
      </div>
      <div className="p-4 space-y-3">
        <AgentRow 
          name="Probe Agent" 
          status="running" 
          interval="30s" 
          description="Health monitoring"
        />
        <AgentRow 
          name="Reliability Sentinel" 
          status="running" 
          interval="60s" 
          description="SLA enforcement"
        />
        <div className="pt-3 border-t border-slate-700/50">
          <AgentRow 
            name="MCP Server" 
            status="healthy" 
            description="Cloudflare Workers"
          />
        </div>
      </div>
    </div>
  );
}

function AgentRow({ 
  name, 
  status, 
  interval, 
  description 
}: { 
  name: string; 
  status: string; 
  interval?: string; 
  description: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${status === 'running' || status === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
        <div>
          <span className="text-sm text-slate-300">{name}</span>
          <span className="text-xxs text-slate-600 ml-2">{description}</span>
        </div>
      </div>
      {interval && (
        <span className="text-xxs text-slate-500 font-mono bg-slate-800/50 px-2 py-0.5 rounded">
          {interval}
        </span>
      )}
    </div>
  );
}

function RecentActivityPanel({ incidents }: { incidents: Array<{ id: string; serviceName: string; createdAt: number; breachType: string; compensationPercent: number; txHash?: string }> }) {
  const recentIncidents = incidents.slice(0, 5);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Recent Incidents</h2>
        <span className="text-xxs text-slate-500">Last 7 days</span>
      </div>
      <div className="divide-y divide-slate-700/50">
        {recentIncidents.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-slate-600 text-sm">No recent incidents</div>
            <div className="text-xxs text-slate-700 mt-1">All services operating normally</div>
          </div>
        ) : (
          recentIncidents.map((incident) => (
            <div key={incident.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  incident.breachType === 'both' ? 'bg-red-500' : 
                  incident.breachType === 'availability' ? 'bg-red-400' : 'bg-amber-400'
                }`} />
                <div>
                  <div className="text-sm text-slate-200">{incident.serviceName}</div>
                  <div className="text-xxs text-slate-500 flex items-center gap-2">
                    <span className="uppercase">{incident.breachType}</span>
                    <span>•</span>
                    <span className="text-amber-400">{incident.compensationPercent}% payout</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xxs text-slate-500 font-mono" suppressHydrationWarning>
                  {new Date(incident.createdAt).toLocaleDateString()}
                </div>
                {incident.txHash && (
                  <a 
                    href={`https://sepolia.basescan.org/tx/${incident.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xxs text-teal-500 hover:text-teal-400"
                  >
                    View TX →
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function calculateNetworkReliability(services: Array<{ reliabilityScore: number }>) {
  if (services.length === 0) return 100;
  const sum = services.reduce((acc, s) => acc + (s.reliabilityScore || 0), 0);
  return Math.round((sum / services.length) * 10) / 10;
}
