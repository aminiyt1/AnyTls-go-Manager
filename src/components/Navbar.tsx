import React, { useState } from 'react';
import {
  Shield,
  Server,
  Download,
  Key,
  LogOut,
  Copy,
  Check,
  Cpu,
  HardDrive,
  HelpCircle,
  Clock,
  Terminal,
} from 'lucide-react';
import { ServerStatus } from '../types';

interface NavbarProps {
  serverStatus: ServerStatus | null;
  username: string;
  isStandalone?: boolean;
  onOpenInstallGuide: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  serverStatus,
  username,
  isStandalone = false,
  onOpenInstallGuide,
  onOpenChangePassword,
  onLogout,
}) => {
  const [copiedIp, setCopiedIp] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const copyIp = () => {
    if (serverStatus?.serverIp) {
      navigator.clipboard.writeText(serverStatus.serverIp);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0d0d0d]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/10">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-white sm:text-lg font-mono">
                AnyTLS <span className="text-amber-500">Panel</span>
              </span>
              <span className="text-xs font-medium text-amber-500 bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full">
                Server Manager
              </span>
            </div>
            <p className="hidden text-xs text-white/40 sm:block">
              Linux AnyTLS Server Administration
            </p>
          </div>
        </div>

        {/* Server Badges (Desktop) */}
        {serverStatus && (
          <div className="hidden items-center gap-3 lg:flex">
            {/* IP Badge */}
            <button
              onClick={copyIp}
              title="Click to copy server IP"
              className="group flex items-center gap-2 rounded-lg border border-white/5 bg-[#111] px-3 py-1.5 text-xs text-white/70 transition hover:border-white/10 hover:text-white"
            >
              <Server className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-mono">{serverStatus.serverIp}</span>
              {copiedIp ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-white/30 transition group-hover:text-white/60" />
              )}
            </button>

            {/* RAM Badge */}
            <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-[#111] px-3 py-1.5 text-xs text-white/70">
              <HardDrive className="h-3.5 w-3.5 text-amber-500/80" />
              <span className="text-white/40">RAM:</span>
              <span className="font-mono text-white/90">
                {serverStatus.memoryUsedMB}MB / {serverStatus.memoryTotalMB}MB
              </span>
            </div>

            {/* Uptime Badge */}
            <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-[#111] px-3 py-1.5 text-xs text-white/70">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-white/40">Uptime:</span>
              <span className="text-white/90">{formatUptime(serverStatus.uptimeSeconds)}</span>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Install Guide / Download ZIP Buttons (Only in Development / Web Preview) */}
          {!isStandalone && (
            <>
              <button
                id="btn-install-guide"
                onClick={onOpenInstallGuide}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs sm:text-sm font-medium text-white transition hover:bg-white/10 hover:border-white/20"
              >
                <Terminal className="h-4 w-4 text-amber-400" />
                <span>Install Guide</span>
              </button>

              <a
                href="/api/download-zip"
                download="anytls-panel-ubuntu.zip"
                title="Download Panel ZIP Archive"
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/5 bg-[#111] px-3 py-2 text-xs sm:text-sm font-medium text-white/70 transition hover:border-white/10 hover:text-white"
              >
                <Download className="h-4 w-4 text-white/40" />
                <span>Download ZIP</span>
              </a>
            </>
          )}

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-xs sm:text-sm font-medium text-white transition hover:border-white/20"
            >
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span>{username}</span>
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute left-0 mt-2 z-50 w-52 rounded-2xl border border-white/10 bg-[#151515] p-1.5 shadow-2xl shadow-black/80">
                  <div className="border-b border-white/5 px-3 py-2 text-xs text-white/40">
                    Signed in as <span className="font-semibold text-white">{username}</span>
                  </div>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenChangePassword();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm text-white/70 hover:bg-white/5 hover:text-white transition"
                  >
                    <Key className="h-4 w-4 text-amber-500" />
                    <span>Change Admin Password</span>
                  </button>

                  {!isStandalone && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenInstallGuide();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm text-white/70 hover:bg-white/5 hover:text-white transition"
                    >
                      <HelpCircle className="h-4 w-4 text-amber-500" />
                      <span>Installation Guide</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-white/5" />

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm text-red-400 hover:bg-red-500/10 transition"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
