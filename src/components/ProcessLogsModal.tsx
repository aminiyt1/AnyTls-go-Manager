import React, { useState, useEffect } from 'react';
import {
  X,
  Terminal,
  RefreshCw,
  Server,
  Activity,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Play,
  RotateCw,
} from 'lucide-react';
import { AnyTlsConfig, ConfigProcessDetails } from '../types';
import { api } from '../lib/api';

interface ProcessLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AnyTlsConfig | null;
  serverIp: string;
}

export const ProcessLogsModal: React.FC<ProcessLogsModalProps> = ({
  isOpen,
  onClose,
  config,
  serverIp,
}) => {
  const [details, setDetails] = useState<ConfigProcessDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [restarting, setRestarting] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProcessInfo = async () => {
    if (!config) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getConfigProcess(config.id);
      setDetails(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load process details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && config) {
      fetchProcessInfo();
      const timer = setInterval(fetchProcessInfo, 5000);
      return () => clearInterval(timer);
    }
  }, [isOpen, config?.id]);

  if (!isOpen || !config) return null;

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await api.restartConfigProcess(config.id);
      await fetchProcessInfo();
    } catch (err: any) {
      setError(err.message || 'Failed to restart process');
    } finally {
      setRestarting(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const isRunning = details?.status === 'running' || Boolean(details?.pid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#141414] shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-amber-500 border border-white/5">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-white tracking-wide">
                  AnyTLS Tunnel Process: {config.remark}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono border ${
                    isRunning
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  {isRunning ? `Running (PID: ${details?.pid})` : 'Stopped / Standby'}
                </span>
              </div>
              <p className="text-xs text-white/40">
                Port {config.port} • Listening on 0.0.0.0:{config.port}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm">
          {/* Status Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-white/5 bg-[#0a0a0a] p-3">
              <div className="text-[11px] text-white/40">Tunnel State</div>
              <div
                className={`text-sm font-semibold mt-1 ${
                  isRunning ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isRunning ? 'Active Tunnel' : 'Not Running'}
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-[#0a0a0a] p-3">
              <div className="text-[11px] text-white/40">Process PID</div>
              <div className="text-sm font-mono text-white mt-1">
                {details?.pid ? details.pid : '—'}
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-[#0a0a0a] p-3">
              <div className="text-[11px] text-white/40">Listening Port</div>
              <div className="text-sm font-mono text-amber-400 mt-1">
                0.0.0.0:{config.port}
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-[#0a0a0a] p-3">
              <div className="text-[11px] text-white/40">Binary Status</div>
              <div className="text-sm font-medium mt-1 truncate">
                {details?.binaryExists ? (
                  <span className="text-emerald-400">Installed</span>
                ) : (
                  <span className="text-amber-400">Not Found</span>
                )}
              </div>
            </div>
          </div>

          {/* Binary Missing Warning if applicable */}
          {details && !details.binaryExists && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-400 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                AnyTLS binary not detected at /usr/local/bin/anytls-server
              </div>
              <p className="text-white/60">
                To run live tunnels on Ubuntu, run the automated installer:
                <code className="block mt-1 font-mono text-amber-300 bg-black/40 p-2 rounded border border-white/5">
                  curl -sSL https://raw.githubusercontent.com/anytls/anytls-panel/main/install.sh | bash
                </code>
              </p>
            </div>
          )}

          {/* Spawn Command Box */}
          <div className="rounded-xl border border-white/5 bg-[#090909] p-3.5 space-y-2">
            <div className="text-xs text-white/40 font-medium flex items-center justify-between">
              <span>Underlying Execution Command:</span>
              <button
                onClick={handleRestart}
                disabled={restarting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-amber-400 hover:bg-white/10 transition disabled:opacity-50"
              >
                <RotateCw className={`h-3 w-3 ${restarting ? 'animate-spin' : ''}`} />
                <span>Restart Tunnel</span>
              </button>
            </div>
            <div className="font-mono text-xs text-emerald-400 bg-black/60 p-2.5 rounded-lg border border-white/5 overflow-x-auto select-all">
              /usr/local/bin/anytls-server -l 0.0.0.0:{config.port} -p {config.password}
            </div>

            {/* Kernel Socket LISTEN Verification */}
            <div className="border-t border-white/5 pt-2 flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Kernel TCP Socket (LISTEN Check):</span>
                <span
                  className={`font-mono text-xs font-medium flex items-center gap-1.5 ${
                    details?.isListening ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      details?.isListening ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  {details?.isListening
                    ? `LISTEN (0.0.0.0:${config.port})`
                    : 'Port not yet in LISTEN mode'}
                </span>
              </div>
              {details?.listenDetails && (
                <div className="font-mono text-[11px] text-white/50 bg-black/50 px-2 py-1 rounded overflow-x-auto">
                  {details.listenDetails}
                </div>
              )}
            </div>
          </div>

          {/* Live Process Console Logs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-500" />
                <h4 className="text-xs font-medium text-white/80">
                  Live Process Logs (Stdout & Stderr):
                </h4>
              </div>
              <button
                onClick={fetchProcessInfo}
                disabled={loading}
                className="text-[11px] text-white/40 hover:text-white flex items-center gap-1 transition"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#050505] p-3 h-44 overflow-y-auto font-mono text-xs text-white/70 space-y-1">
              {details?.logs && details.logs.length > 0 ? (
                details.logs.map((line, idx) => (
                  <div key={idx} className="leading-relaxed">
                    <span className="text-white/30 mr-2">{idx + 1}</span>
                    <span
                      className={
                        line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')
                          ? 'text-red-400'
                          : line.toLowerCase().includes('started') || line.toLowerCase().includes('pid')
                          ? 'text-emerald-400'
                          : 'text-white/80'
                      }
                    >
                      {line}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-white/30 italic py-6 text-center">
                  No log output yet. When clients connect or when the process starts, output will appear here.
                </div>
              )}
            </div>
          </div>

          {/* Troubleshooting Commands Table */}
          <div className="rounded-xl border border-white/5 bg-[#0a0a0a] p-3.5 space-y-2">
            <h4 className="text-xs font-medium text-white/80">
              SSH Diagnostic Commands (Run on your Ubuntu server):
            </h4>
            <div className="space-y-1.5 font-mono text-xs">
              {/* Check port */}
              <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/5">
                <div className="truncate">
                  <span className="text-white/40 font-sans mr-2">1. Check port:</span>
                  <span className="text-amber-400">ss -tulpn | grep :{config.port}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(`ss -tulpn | grep :${config.port}`, 'port')}
                  className="text-white/40 hover:text-white ml-2 shrink-0"
                >
                  {copiedCmd === 'port' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>

              {/* Firewall */}
              <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/5">
                <div className="truncate">
                  <span className="text-white/40 font-sans mr-2">2. Open firewall:</span>
                  <span className="text-amber-400">ufw allow {config.port}/tcp</span>
                </div>
                <button
                  onClick={() => copyToClipboard(`ufw allow ${config.port}/tcp`, 'ufw')}
                  className="text-white/40 hover:text-white ml-2 shrink-0"
                >
                  {copiedCmd === 'ufw' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>

              {/* Process check */}
              <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/5">
                <div className="truncate">
                  <span className="text-white/40 font-sans mr-2">3. Check processes:</span>
                  <span className="text-amber-400">ps aux | grep anytls-server</span>
                </div>
                <button
                  onClick={() => copyToClipboard(`ps aux | grep anytls-server`, 'ps')}
                  className="text-white/40 hover:text-white ml-2 shrink-0"
                >
                  {copiedCmd === 'ps' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-white/5 bg-white/[0.01] px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/5 bg-white/5 px-5 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
