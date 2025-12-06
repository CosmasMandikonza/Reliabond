'use client';

// ===========================================
// BOND VAULT - Stats and totals display
// ===========================================

import { motion } from 'framer-motion';
import { Coins, TrendingUp, Shield, AlertTriangle } from 'lucide-react';
import type { Stats } from '../lib/types';

interface BondVaultProps {
  stats: Stats | undefined;
  isLoading: boolean;
}

export function BondVault({ stats, isLoading }: BondVaultProps) {
  const formatEth = (wei: number) => {
    const eth = wei / 1e18;
    if (eth === 0) return '0';
    if (eth < 0.001) return '<0.001';
    return eth.toFixed(3);
  };

  const metrics = [
    {
      label: 'Total Bonded',
      value: stats ? `${stats.totalBondedValueEth.toFixed(2)} ETH` : '—',
      icon: Coins,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Paid This Week',
      value: stats ? `${formatEth(stats.totalPaidOutThisWeekWei)} ETH` : '—',
      icon: TrendingUp,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Active Bonds',
      value: stats?.activeBonds ?? '—',
      icon: Shield,
      color: 'text-bond',
      bg: 'bg-bond/10',
    },
    {
      label: 'Incidents (7d)',
      value: stats?.incidentsThisWeek ?? '—',
      icon: AlertTriangle,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          Bond Vault
        </h2>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`${metric.bg} rounded-lg p-3 border border-slate-700/30`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${metric.color}`} />
                  <span className="metric-label">{metric.label}</span>
                </div>
                <div className={`text-lg font-mono font-semibold ${metric.color}`}>
                  {isLoading ? (
                    <div className="h-6 w-16 bg-slate-700/50 rounded animate-pulse" />
                  ) : (
                    <motion.span
                      key={String(metric.value)}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="animate-counter"
                    >
                      {metric.value}
                    </motion.span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Total protected value */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Total Protected Value</span>
            <span className="text-lg font-mono font-bold text-gradient">
              ${stats ? (stats.totalBondedValueEth * 3500).toLocaleString() : '—'}
            </span>
          </div>
          <div className="text-xxs text-slate-500 mt-1">
            Estimated at $3,500/ETH
          </div>
        </div>
      </div>
    </div>
  );
}
