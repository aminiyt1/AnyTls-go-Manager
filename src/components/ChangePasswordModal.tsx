import React, { useState, useEffect } from 'react';
import { X, Key, Check, AlertCircle, Server, Globe } from 'lucide-react';
import { api } from '../lib/api';

interface ChangePasswordModalProps {
  isOpen: boolean;
  currentPort?: number;
  serverIp?: string;
  isStandalone?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  currentPort = 3000,
  serverIp = '',
  isStandalone = false,
  onClose,
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [panelPort, setPanelPort] = useState<number | string>(currentPort || 3000);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [portNotice, setPortNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPanelPort(currentPort || 3000);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccessMsg('');
      setPortNotice(null);
    }
  }, [isOpen, currentPort]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setPortNotice(null);

    if (!currentPassword) {
      setError('Please enter your current password to authorize changes');
      return;
    }

    const portNum = parseInt(String(panelPort), 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setError('Panel port must be a valid number between 1 and 65535');
      return;
    }

    const isChangingPassword = Boolean(newPassword.trim());
    if (isChangingPassword) {
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters');
        return;
      }
    }

    const isChangingPort = portNum !== currentPort;
    if (!isChangingPassword && !isChangingPort) {
      setError('No changes detected. Enter a new password or change the panel port.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.updateSettings({
        currentPassword,
        newPassword: isChangingPassword ? newPassword : undefined,
        newPort: isChangingPort ? portNum : undefined,
      });

      setSuccessMsg(res.message || 'Settings updated successfully');

      if (res.portChanged) {
        const targetIp = serverIp || window.location.hostname;
        const newUrl = `http://${targetIp}:${res.newPort || portNum}`;
        setPortNotice(newUrl);

        if (onSuccess) onSuccess();

        // If in standalone mode, the server is restarting on the new port
        if (isStandalone) {
          setTimeout(() => {
            window.location.href = newUrl;
          }, 3500);
        }
      } else {
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#151515] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-amber-500 border border-white/5">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-medium text-white tracking-wide">
                Panel Security & Port Settings
              </h2>
              <p className="text-xs text-white/40">Change admin credentials or web port</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </div>
              {portNotice && (
                <div className="mt-1 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
                  <p className="font-mono font-bold">New URL: {portNotice}</p>
                  {isStandalone && <p className="text-white/60 text-[11px] mt-0.5">Redirecting in 3 seconds...</p>}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              Current Password <span className="text-amber-500">*</span>
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password to authorize changes"
              className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-3.5 py-2.5 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 border-t border-white/5">
            <label className="block text-xs font-medium text-white/70 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-amber-500" />
                Panel Web Port
              </span>
              <span className="text-[11px] text-white/40">Current: {currentPort}</span>
            </label>
            <input
              type="number"
              min="1"
              max="65535"
              required
              value={panelPort}
              onChange={(e) => setPanelPort(e.target.value)}
              placeholder="e.g. 3000, 8080, 8443"
              className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-3.5 py-2.5 text-white font-mono focus:border-amber-500 focus:outline-none"
            />
            <p className="text-[11px] text-white/40 mt-1">
              Port used to access this web panel (Ubuntu systemd service and firewall will update automatically)
            </p>
          </div>

          <div className="pt-2 border-t border-white/5">
            <label className="block text-xs font-medium text-white/60 mb-1">
              New Admin Password <span className="text-white/40 text-[11px] font-normal">(Leave blank to keep current)</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-3.5 py-2.5 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          {newPassword && (
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">
                Confirm New Password <span className="text-amber-500">*</span>
              </label>
              <input
                type="password"
                required={Boolean(newPassword)}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-3.5 py-2.5 text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-5 py-2 text-xs font-bold transition disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
