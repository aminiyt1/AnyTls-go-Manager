import React from 'react';
import { Users, Activity, HardDrive, Radio, CheckCircle2, AlertCircle } from 'lucide-react';
import { AnyTlsConfig, ServerStatus } from '../types';
import { formatBytes } from '../lib/formatters';

interface StatsCardsProps {
  configs: AnyTlsConfig[];
  serverStatus: ServerStatus | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ configs, serverStatus }) => {
  const totalConfigs = configs.length;
  const activeConfigs = configs.filter((c) => c.status === 'active').length;
  const expiredConfigs = configs.filter((c) => c.status === 'expired').length;

  const totalUsedBytes = configs.reduce((acc, c) => acc + (c.trafficUsedBytes || 0), 0);
  const totalLimitGB = configs.reduce((acc, c) => acc + (c.trafficLimitGB || 0), 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total & Active Configs */}
      <div className="rounded-2xl border border-white/5 bg-[#111] p-5 shadow-xl transition hover:border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-white/40 text-xs uppercase tracking-tighter">Users / Configs</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-amber-500 border border-white/5">
            <Users className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-light text-white italic font-mono">
            {activeConfigs}{' '}
            <span className="text-sm text-white/40 font-normal">/ {totalConfigs}</span>
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>{activeConfigs} Active</span>
          </div>
          {expiredConfigs > 0 && (
            <div className="flex items-center gap-1.5 text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              <span>{expiredConfigs} Expired</span>
            </div>
          )}
        </div>
      </div>

      {/* Traffic Usage */}
      <div className="rounded-2xl border border-white/5 bg-[#111] p-5 shadow-xl transition hover:border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-white/40 text-xs uppercase tracking-tighter">Total Bandwidth</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-amber-500 border border-white/5">
            <HardDrive className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-light text-white italic font-mono">
            {formatBytes(totalUsedBytes)}
          </span>
        </div>
        <div className="mt-2 text-xs text-white/40">
          {totalLimitGB > 0 ? (
            <span>Total Limit: {totalLimitGB} GB</span>
          ) : (
            <span>Unlimited Bandwidth</span>
          )}
        </div>
      </div>

      {/* Ports / Configuration Slots */}
      <div className="rounded-2xl border border-white/5 bg-[#111] p-5 shadow-xl transition hover:border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-white/40 text-xs uppercase tracking-tighter">Server Metrics</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-amber-500 border border-white/5">
            <Activity className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-light text-amber-500 italic font-mono">
            {serverStatus?.cpuUsage ? `${serverStatus.cpuUsage}%` : 'Normal'}
          </span>
        </div>
        <div className="mt-2 text-xs text-white/40">
          Memory: {serverStatus?.memoryUsedMB || 256} MB
        </div>
      </div>

      {/* AnyTLS Protocol Daemon Status */}
      <div className="rounded-2xl border border-white/5 bg-[#111] p-5 shadow-xl transition hover:border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-white/40 text-xs uppercase tracking-tighter">AnyTLS Core Daemon</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-emerald-400 border border-white/5">
            <Radio className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xl font-light text-emerald-400 italic">
            {serverStatus?.anytlsInstalled ? 'Online & Running' : 'AnyTLS Engine'}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-white/40">
          <span className="font-mono text-white/60">anytls-go</span>
          <span>•</span>
          <span>Panel Port: {serverStatus?.panelPort || 3000}</span>
        </div>
      </div>
    </div>
  );
};
