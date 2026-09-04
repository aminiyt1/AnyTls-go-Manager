import React, { useState } from 'react';
import {
  Key,
  QrCode,
  Link as LinkIcon,
  Power,
  Trash2,
  RefreshCw,
  Edit2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Globe,
  Clock,
  HardDrive,
  Hash,
  AlertTriangle,
  Terminal,
} from 'lucide-react';
import { AnyTlsConfig } from '../types';
import {
  formatBytes,
  getDaysRemaining,
  formatDateToPersian,
  generateAnyTlsLink,
} from '../lib/formatters';

interface ConfigCardProps {
  config: AnyTlsConfig;
  serverIp: string;
  onOpenQr: (config: AnyTlsConfig) => void;
  onOpenRenew: (config: AnyTlsConfig) => void;
  onOpenEdit: (config: AnyTlsConfig) => void;
  onOpenProcessLogs?: (config: AnyTlsConfig) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string, remark: string) => void;
}

export const ConfigCard: React.FC<ConfigCardProps> = ({
  config,
  serverIp,
  onOpenQr,
  onOpenRenew,
  onOpenEdit,
  onOpenProcessLogs,
  onToggleStatus,
  onDelete,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const daysInfo = getDaysRemaining(config.expireAt);
  const anytlsLink = generateAnyTlsLink(config, serverIp);

  // Calculate traffic percentage
  let trafficPercent = 0;
  if (config.trafficLimitGB > 0) {
    const limitBytes = config.trafficLimitGB * 1024 * 1024 * 1024;
    trafficPercent = Math.min(100, Math.round((config.trafficUsedBytes / limitBytes) * 100));
  }

  const copyLink = () => {
    navigator.clipboard.writeText(anytlsLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(config.password);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const isExpired = config.status === 'expired' || daysInfo.isExpired;
  const isActive = config.status === 'active' && !isExpired;

  return (
    <div
      className={`relative rounded-2xl border transition-all shadow-xl ${
        isActive
          ? 'border-white/5 bg-[#111] hover:border-white/10'
          : 'border-white/5 bg-[#0d0d0d]/80 opacity-75'
      }`}
    >
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl font-mono text-xs font-bold ${
              isActive
                ? 'bg-white/5 text-amber-500 border border-white/5'
                : 'bg-white/[0.02] text-white/30 border border-white/5'
            }`}
          >
            {config.port}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white tracking-wide text-base">
                {config.remark}
              </h3>
              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium border ${
                  isExpired
                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                    : isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isExpired ? 'bg-red-400' : isActive ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                {isExpired ? 'Expired' : isActive ? 'Active' : 'Disabled'}
              </span>

              {/* Live Tunnel Listening Badge */}
              {isActive && (
                <button
                  onClick={() => onOpenProcessLogs?.(config)}
                  title="Click to view live process logs & PID"
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono border transition ${
                    config.processRunning
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      config.processRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span>
                    {config.processRunning
                      ? `Listening${config.processPid ? ` (PID: ${config.processPid})` : ''}`
                      : 'Standby'}
                  </span>
                </button>
              )}
            </div>
            <p className="text-xs text-white/40 font-mono mt-0.5">
              Port: {config.port} | SNI:{' '}
              {config.sni && config.sni.trim() ? (
                <span className="text-white/70">{config.sni}</span>
              ) : (
                <span className="text-amber-400/90 font-sans text-[11px] bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                  No SNI
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Power Toggle */}
        <button
          onClick={() => onToggleStatus(config.id)}
          title={isActive ? 'Disable configuration' : 'Enable configuration'}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
            isActive
              ? 'bg-white/5 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
              : 'bg-white/[0.02] text-white/40 border-white/5 hover:bg-white/5 hover:text-white/70'
          }`}
        >
          <Power className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-400' : 'text-white/40'}`} />
          <span>{isActive ? 'Active' : 'Disabled'}</span>
        </button>
      </div>

      {/* Body Details */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Password Section */}
        <div className="rounded-xl border border-white/5 bg-black/40 p-2.5">
          <div className="flex items-center justify-between text-xs text-white/40 mb-1">
            <span className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-amber-500" />
              AnyTLS Password
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/40 hover:text-white transition"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={copyPassword}
                className="text-white/40 hover:text-amber-500 transition"
                title="Copy password"
              >
                {copiedPass ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
          <div className="font-mono text-xs text-amber-500/90 truncate select-all">
            {showPassword ? config.password : '••••••••••••••••••••'}
          </div>
        </div>

        {/* Traffic Progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5 text-white/40">
              <HardDrive className="h-3.5 w-3.5 text-amber-500/80" />
              Bandwidth Usage:
            </span>
            <span className="font-mono text-white/80">
              {formatBytes(config.trafficUsedBytes)} /{' '}
              {config.trafficLimitGB > 0 ? `${config.trafficLimitGB} GB` : 'Unlimited'}
            </span>
          </div>
          {config.trafficLimitGB > 0 ? (
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  trafficPercent > 90
                    ? 'bg-red-500'
                    : trafficPercent > 70
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${trafficPercent}%` }}
              />
            </div>
          ) : (
            <div className="h-1.5 w-full rounded-full bg-white/5">
              <div className="h-full w-full rounded-full bg-emerald-500/40" />
            </div>
          )}
        </div>

        {/* Expiration & Duration */}
        <div className="flex items-center justify-between text-xs rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
          <div className="flex items-center gap-1.5 text-white/40">
            <Clock className="h-3.5 w-3.5 text-amber-500/70" />
            <span>Validity:</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold ${
                daysInfo.isExpired
                  ? 'text-red-400'
                  : daysInfo.days <= 3
                  ? 'text-amber-400'
                  : 'text-white/80'
              }`}
            >
              {daysInfo.text}
            </span>
            {config.expireAt && (
              <span className="text-[11px] text-white/30 hidden sm:inline font-mono">
                ({formatDateToPersian(config.expireAt)})
              </span>
            )}
          </div>
        </div>

        {config.notes && (
          <p className="text-xs text-white/40 bg-black/30 p-2 rounded-lg border border-white/5">
            {config.notes}
          </p>
        )}
      </div>

      {/* Action Footer Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 bg-white/[0.01] p-3 sm:px-4">
        {/* Left: Share Actions (Link & QR Code) */}
        <div className="flex items-center gap-2">
          {/* Copy anytls:// Link */}
          <button
            onClick={copyLink}
            title="Copy direct AnyTLS connection link"
            className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-amber-500 hover:border-white/10"
          >
            {copiedLink ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <LinkIcon className="h-3.5 w-3.5 text-amber-500" />
            )}
            <span>{copiedLink ? 'Copied!' : 'AnyTLS Link'}</span>
          </button>

          {/* View QR Code */}
          <button
            onClick={() => onOpenQr(config)}
            title="Show QR Code and config exports"
            className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-amber-500 hover:border-white/10"
          >
            <QrCode className="h-3.5 w-3.5 text-amber-500" />
            <span>QR Code</span>
          </button>
        </div>

        {/* Right: Management Actions (Renew, Edit, Logs, Delete) */}
        <div className="flex items-center gap-1.5">
          {/* Live Process & Logs Button */}
          <button
            onClick={() => onOpenProcessLogs?.(config)}
            title="Live Process Logs & Server Port Diagnostics"
            className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/5 px-2 py-1.5 text-xs text-white/50 transition hover:bg-white/10 hover:text-emerald-400 hover:border-emerald-500/20"
          >
            <Terminal className="h-3.5 w-3.5 text-emerald-400/80" />
            <span className="hidden sm:inline">Logs</span>
          </button>

          {/* Renew Button */}
          <button
            onClick={() => onOpenRenew(config)}
            title="Renew duration or traffic"
            className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/5 px-2 py-1.5 text-xs text-white/40 transition hover:bg-white/10 hover:text-amber-500"
          >
            <RefreshCw className="h-3.5 w-3.5 text-amber-500/80" />
            <span className="hidden xs:inline">Renew</span>
          </button>

          {/* Edit Button */}
          <button
            onClick={() => onOpenEdit(config)}
            title="Edit configuration"
            className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/5 px-2 py-1.5 text-xs text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <Edit2 className="h-3.5 w-3.5 text-white/40" />
            <span className="hidden xs:inline">Edit</span>
          </button>

          {/* Delete Button */}
          <button
            onClick={() => onDelete(config.id, config.remark)}
            title="Delete configuration"
            className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/5 p-1.5 text-xs text-white/30 transition hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
