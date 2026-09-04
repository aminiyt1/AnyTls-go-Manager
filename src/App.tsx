import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  Filter,
  Shield,
  Download,
  Terminal,
  AlertCircle,
  FolderArchive,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AnyTlsConfig, ServerStatus, RenewOptions } from './types';
import { api, getStoredToken } from './lib/api';
import { Navbar } from './components/Navbar';
import { StatsCards } from './components/StatsCards';
import { ConfigCard } from './components/ConfigCard';
import { CreateEditModal } from './components/CreateEditModal';
import { QrCodeModal } from './components/QrCodeModal';
import { RenewModal } from './components/RenewModal';
import { InstallGuideModal } from './components/InstallGuideModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ProcessLogsModal } from './components/ProcessLogsModal';
import { LoginView } from './components/LoginView';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('admin');
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [isStandalone, setIsStandalone] = useState<boolean>(
    () => import.meta.env.VITE_STANDALONE === 'true'
  );

  // App Data
  const [configs, setConfigs] = useState<AnyTlsConfig[]>([]);
  const [serverIp, setServerIp] = useState<string>('127.0.0.1');
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'expired'>('all');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AnyTlsConfig | null>(null);
  const [qrModalConfig, setQrModalConfig] = useState<AnyTlsConfig | null>(null);
  const [renewModalConfig, setRenewModalConfig] = useState<AnyTlsConfig | null>(null);
  const [processLogsConfig, setProcessLogsConfig] = useState<AnyTlsConfig | null>(null);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; remark: string } | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Check system standalone mode
  useEffect(() => {
    api.getSystemInfo().then((info) => {
      if (info.isStandalone) {
        setIsStandalone(true);
      }
      if (info.serverIp) {
        setServerIp(info.serverIp);
      }
    });
  }, []);

  // Verify Auth on mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsCheckingAuth(false);
      setIsLoggedIn(false);
      return;
    }

    api
      .checkAuth()
      .then((res) => {
        if (res.isLoggedIn) {
          setIsLoggedIn(true);
          if (res.username) setUsername(res.username);
        } else {
          setIsLoggedIn(false);
        }
      })
      .catch(() => {
        setIsLoggedIn(false);
      })
      .finally(() => {
        setIsCheckingAuth(false);
      });
  }, []);

  // Fetch Data
  const fetchData = useCallback(async () => {
    if (!isLoggedIn) return;
    setIsLoading(true);
    try {
      const [configsRes, statusRes] = await Promise.all([
        api.getConfigs(),
        api.getServerStatus().catch(() => null),
      ]);
      setConfigs(configsRes.configs || []);
      if (configsRes.serverIp) setServerIp(configsRes.serverIp);
      if (statusRes) {
        setServerStatus(statusRes);
        if (statusRes.isStandalone) {
          setIsStandalone(true);
        }
      }
    } catch (err: any) {
      console.error('Failed to load configs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn, fetchData]);

  // Handle Login
  const handleLoginSuccess = (user: string) => {
    setUsername(user);
    setIsLoggedIn(true);
  };

  // Handle Logout
  const handleLogout = async () => {
    await api.logout();
    setIsLoggedIn(false);
  };

  // Create or Update Config
  const handleSaveConfig = async (payload: Partial<AnyTlsConfig>) => {
    if (editingConfig) {
      const res = await api.updateConfig(editingConfig.id, payload);
      setConfigs((prev) =>
        prev.map((c) => (c.id === editingConfig.id ? res.config : c))
      );
      showToast('Configuration updated successfully');
      setEditingConfig(null);
    } else {
      const res = await api.createConfig(payload);
      setConfigs((prev) => [res.config, ...prev]);
      showToast('New AnyTLS configuration created successfully');
    }
  };

  // Toggle Active/Disabled
  const handleToggleStatus = async (id: string) => {
    try {
      const res = await api.toggleConfig(id);
      setConfigs((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: res.status } : c))
      );
      showToast(res.status === 'active' ? 'Configuration activated' : 'Configuration disabled');
    } catch (err: any) {
      showToast(err.message || 'Error updating status');
    }
  };

  // Renew Config
  const handleRenew = async (id: string, options: RenewOptions) => {
    const res = await api.renewConfig(id, options);
    setConfigs((prev) => prev.map((c) => (c.id === id ? res.config : c)));
    showToast('Configuration renewed successfully');
  };

  // Delete Config
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.deleteConfig(deleteConfirm.id);
      setConfigs((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
      showToast('Configuration deleted successfully');
    } catch (err: any) {
      showToast(err.message || 'Error deleting configuration');
    } finally {
      setDeleteConfirm(null);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090909] text-white/50">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-amber-500" />
          <span>Loading AnyTLS Panel...</span>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
          isStandalone={isStandalone}
        />
        {!isStandalone && (
          <InstallGuideModal
            isOpen={isInstallGuideOpen}
            onClose={() => setIsInstallGuideOpen(false)}
            serverIp={serverIp}
            panelPort={3000}
          />
        )}
      </>
    );
  }

  // Filtered configs
  const filteredConfigs = configs.filter((cfg) => {
    const matchQuery =
      cfg.remark.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(cfg.port).includes(searchQuery) ||
      (cfg.notes && cfg.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchQuery) return false;

    if (statusFilter === 'all') return true;
    return cfg.status === statusFilter;
  });

  const existingPorts = configs.map((c) => c.port);

  return (
    <div className="min-h-screen bg-[#090909] text-[#e0e0e0] pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-white/10 bg-[#151515] px-4 py-2.5 text-xs sm:text-sm font-medium text-amber-400 shadow-2xl backdrop-blur-md">
          {toastMessage}
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        serverStatus={serverStatus}
        username={username}
        isStandalone={isStandalone}
        onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Quick Announcement / Setup Banner (Hidden on standalone Ubuntu deployment) */}
        {!isStandalone && (
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d0d] p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-amber-500 border border-white/5 shadow-lg">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-medium text-white text-base flex items-center gap-2">
                    <span>AnyTLS Server Management Panel & Auto-Deployer</span>
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-mono text-amber-400">
                      anytls-go v1.0
                    </span>
                  </h2>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">
                    Ready for one-click deployment on Ubuntu 22+ or download ZIP package directly.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => setIsInstallGuideOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs sm:text-sm font-bold text-black shadow-lg transition"
                >
                  <Terminal className="h-4 w-4" />
                  <span>Ubuntu Install Guide</span>
                </button>

                <a
                  href="/api/download-zip"
                  download="anytls-panel-ubuntu.zip"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs sm:text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <Download className="h-4 w-4" />
                  <span>Download ZIP</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Stats & Server Metrics */}
        <StatsCards configs={configs} serverStatus={serverStatus} />

        {/* Action Bar: Create, Search, Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-white/5 bg-[#0d0d0d] p-3 sm:p-4">
          {/* Create Button */}
          <button
            id="btn-create-config"
            onClick={() => {
              setEditingConfig(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs sm:text-sm font-bold text-black shadow-lg transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Config</span>
          </button>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by remark, port, or note..."
                className="w-full rounded-xl border border-white/10 bg-[#090909] px-3 py-2 pr-9 text-xs text-white placeholder:text-white/30 focus:border-amber-500 focus:outline-none"
              />
              <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-white/40" />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-[#090909] p-1 border border-white/5 text-xs">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'active', label: 'Active' },
                  { id: 'disabled', label: 'Disabled' },
                  { id: 'expired', label: 'Expired' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-lg px-2.5 py-1 font-medium transition ${
                    statusFilter === tab.id
                      ? 'bg-amber-500 text-black font-bold'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchData}
              disabled={isLoading}
              title="Refresh data"
              className="rounded-xl border border-white/5 bg-[#090909] p-2 text-white/40 hover:border-white/20 hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Configs List */}
        {filteredConfigs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredConfigs.map((config) => (
              <ConfigCard
                key={config.id}
                config={config}
                serverIp={serverIp}
                onOpenQr={(c) => setQrModalConfig(c)}
                onOpenRenew={(c) => setRenewModalConfig(c)}
                onOpenEdit={(c) => {
                  setEditingConfig(c);
                  setIsCreateOpen(true);
                }}
                onOpenProcessLogs={(c) => setProcessLogsConfig(c)}
                onToggleStatus={handleToggleStatus}
                onDelete={(id, remark) => setDeleteConfirm({ id, remark })}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#0d0d0d] p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/40 mb-4">
              <Layers className="h-7 w-7" />
            </div>
            <h3 className="text-base font-medium text-white">No configurations found</h3>
            <p className="text-xs text-white/40 mt-1 max-w-sm">
              {searchQuery || statusFilter !== 'all'
                ? 'No configurations matched the current filter or search query.'
                : 'No configurations added yet. Click below to create your first AnyTLS configuration.'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => {
                  setEditingConfig(null);
                  setIsCreateOpen(true);
                }}
                className="mt-4 flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-black transition"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Config</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateEditModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingConfig(null);
        }}
        onSubmit={handleSaveConfig}
        editConfig={editingConfig}
        existingPorts={existingPorts}
      />

      <QrCodeModal
        isOpen={Boolean(qrModalConfig)}
        onClose={() => setQrModalConfig(null)}
        config={qrModalConfig}
        serverIp={serverIp}
      />

      <RenewModal
        isOpen={Boolean(renewModalConfig)}
        onClose={() => setRenewModalConfig(null)}
        config={renewModalConfig}
        onRenew={handleRenew}
      />

      <ProcessLogsModal
        isOpen={Boolean(processLogsConfig)}
        onClose={() => setProcessLogsConfig(null)}
        config={processLogsConfig}
        serverIp={serverIp}
      />

      {!isStandalone && (
        <InstallGuideModal
          isOpen={isInstallGuideOpen}
          onClose={() => setIsInstallGuideOpen(false)}
          serverIp={serverIp}
          panelPort={serverStatus?.panelPort || 3000}
        />
      )}

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        currentPort={serverStatus?.panelPort || 3000}
        serverIp={serverIp || serverStatus?.serverIp || ''}
        isStandalone={isStandalone}
        onClose={() => setIsChangePasswordOpen(false)}
        onSuccess={() => {
          fetchData();
          showToast('Panel settings updated');
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#151515] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertCircle className="h-6 w-6" />
              <h3 className="font-medium text-white text-base">Confirm Delete Configuration</h3>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              Are you sure you want to delete configuration <strong className="text-white">"{deleteConfirm.remark}"</strong>? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-bold text-white transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
