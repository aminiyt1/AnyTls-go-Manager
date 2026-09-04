import React, { useState, useEffect } from 'react';
import { X, Key, RefreshCw, Hash, Shield, Sparkles, Clock, HardDrive, Globe } from 'lucide-react';
import { AnyTlsConfig } from '../types';
import { generateRandomPassword } from '../lib/formatters';

interface CreateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<AnyTlsConfig>) => Promise<void>;
  editConfig?: AnyTlsConfig | null;
  existingPorts: number[];
}

export const CreateEditModal: React.FC<CreateEditModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editConfig,
  existingPorts,
}) => {
  const isEditing = Boolean(editConfig);

  const [remark, setRemark] = useState('');
  const [port, setPort] = useState<number>(8443);
  const [password, setPassword] = useState('');
  const [enableSni, setEnableSni] = useState<boolean>(true);
  const [sni, setSni] = useState('cloudflare.com');
  const [trafficLimitGB, setTrafficLimitGB] = useState<number>(50);
  const [expireDays, setExpireDays] = useState<number>(30);
  const [insecure, setInsecure] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Find next unused port
  const getNextAvailablePort = () => {
    const candidates = [8443, 9443, 10443, 11443, 2083, 2087, 2096, 8880];
    for (const p of candidates) {
      if (!existingPorts.includes(p)) return p;
    }
    // Random between 10000 and 60000
    let randomP = Math.floor(Math.random() * (60000 - 10000) + 10000);
    while (existingPorts.includes(randomP)) {
      randomP++;
    }
    return randomP;
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      if (editConfig) {
        setRemark(editConfig.remark);
        setPort(editConfig.port);
        setPassword(editConfig.password);
        const hasSni = Boolean(editConfig.sni && editConfig.sni.trim());
        setEnableSni(hasSni);
        setSni(hasSni ? editConfig.sni.trim() : 'cloudflare.com');
        setTrafficLimitGB(editConfig.trafficLimitGB);
        setExpireDays(editConfig.expireDays);
        setInsecure(editConfig.insecure ?? true);
        setNotes(editConfig.notes || '');
      } else {
        const unusedPort = getNextAvailablePort();
        setRemark(`User-${Math.floor(100 + Math.random() * 900)}`);
        setPort(unusedPort);
        setPassword(generateRandomPassword(14));
        setEnableSni(true);
        setSni('cloudflare.com');
        setTrafficLimitGB(50);
        setExpireDays(30);
        setInsecure(true);
        setNotes('');
      }
    }
  }, [isOpen, editConfig]);

  if (!isOpen) return null;

  const handleRandomPassword = () => {
    setPassword(generateRandomPassword(14));
  };

  const handleRandomPort = () => {
    setPort(getNextAvailablePort());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!remark.trim()) {
      setErrorMessage('Please enter a remark or user identifier');
      return;
    }

    if (!port || port < 1 || port > 65535) {
      setErrorMessage('Port must be between 1 and 65535');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('AnyTLS password cannot be empty');
      return;
    }

    const finalSni = enableSni && sni.trim() ? sni.trim() : '';

    setIsSubmitting(true);
    try {
      await onSubmit({
        remark: remark.trim(),
        port: Number(port),
        password: password.trim(),
        sni: finalSni,
        trafficLimitGB: Number(trafficLimitGB),
        expireDays: Number(expireDays),
        insecure,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#151515] shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-amber-500 border border-white/5">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-base font-medium text-white tracking-wide">
              {isEditing ? 'Edit AnyTLS Configuration' : 'New AnyTLS Configuration'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {errorMessage && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              {errorMessage}
            </div>
          )}

          {/* User Remark */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              👤 Remark / User Label
            </label>
            <input
              type="text"
              required
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. User-VIP-01"
              className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-3.5 py-2.5 text-white placeholder:text-white/30 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Port Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-white/60">
                🔌 Server Port
              </label>
              <button
                type="button"
                onClick={handleRandomPort}
                className="text-[11px] text-amber-500 hover:underline"
              >
                Suggest open port
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="65535"
                required
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full font-mono rounded-xl border border-white/10 bg-[#0d0d0d] px-3.5 py-2.5 text-white placeholder:text-white/30 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-white/40 mt-1">
              Popular AnyTLS ports: 8443, 9443, 443, 2053, 2083
            </p>
          </div>

          {/* Password with Auto-generation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-white/60">
                🔑 AnyTLS Password
              </label>
              <button
                type="button"
                onClick={handleRandomPassword}
                className="flex items-center gap-1 text-[11px] text-amber-500 hover:underline"
              >
                <RefreshCw className="h-3 w-3" />
                Generate random password
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full font-mono rounded-xl border border-white/10 bg-[#0d0d0d] px-3.5 py-2.5 text-amber-400 placeholder:text-white/30 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* SNI / Domain with ON/OFF Toggle */}
          <div className="rounded-xl border border-white/5 bg-black/30 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-amber-500" />
                <div>
                  <label className="text-xs font-medium text-white block">
                    SNI / Camouflage Domain
                  </label>
                  <span className="text-[11px] text-white/40">
                    {enableSni ? 'TLS simulation enabled with domain' : 'Config without SNI (disabled)'}
                  </span>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={enableSni}
                onClick={() => setEnableSni(!enableSni)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  enableSni ? 'bg-amber-500' : 'bg-white/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                    enableSni ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {enableSni ? (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <input
                  type="text"
                  value={sni}
                  onChange={(e) => setSni(e.target.value)}
                  placeholder="cloudflare.com"
                  className="w-full font-mono rounded-xl border border-white/10 bg-[#0d0d0d] px-3.5 py-2.5 text-white placeholder:text-white/30 focus:border-amber-500 focus:outline-none"
                />

                {/* Preset Domain Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-white/40">Presets:</span>
                  {['cloudflare.com', 'speedtest.net', 'yahoo.com', 'zoom.us'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSni(d)}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-mono transition border ${
                        sni === d
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-white/5 text-white/60 border-white/5 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-white/40">
                  Popular domains used to bypass SNI filtering and emulate legitimate TLS traffic.
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-2.5 text-[11px] text-amber-300/80 leading-relaxed">
                ⚡ <strong>No SNI Mode:</strong> The configuration will be generated without any SNI or ServerName header.
              </div>
            )}
          </div>

          {/* Traffic Limit Presets */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              🔢 Bandwidth Limit (GB)
            </label>
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {[10, 20, 50, 100, 0].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setTrafficLimitGB(val)}
                  className={`rounded-lg py-1.5 text-xs font-mono transition border ${
                    trafficLimitGB === val
                      ? 'bg-amber-500 text-black font-bold border-amber-500'
                      : 'bg-[#0d0d0d] text-white/70 border-white/5 hover:border-white/20'
                  }`}
                >
                  {val === 0 ? 'Unlimited' : `${val} GB`}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="0"
              value={trafficLimitGB}
              onChange={(e) => setTrafficLimitGB(Number(e.target.value))}
              placeholder="0 for unlimited"
              className="w-full font-mono rounded-xl border border-white/10 bg-[#0d0d0d] px-3.5 py-2 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Expiration Days Presets */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              ⏱ Validity Duration (Days)
            </label>
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {[7, 30, 60, 90, 0].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setExpireDays(val)}
                  className={`rounded-lg py-1.5 text-xs font-mono transition border ${
                    expireDays === val
                      ? 'bg-amber-500 text-black font-bold border-amber-500'
                      : 'bg-[#0d0d0d] text-white/70 border-white/5 hover:border-white/20'
                  }`}
                >
                  {val === 0 ? 'Unlimited' : `${val}d`}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="0"
              value={expireDays}
              onChange={(e) => setExpireDays(Number(e.target.value))}
              placeholder="0 for unlimited"
              className="w-full font-mono rounded-xl border border-white/10 bg-[#0d0d0d] px-3.5 py-2 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Insecure Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#0d0d0d] p-3">
            <div>
              <div className="text-xs font-medium text-white/80">
                Allow Self-Signed Certificates (Insecure Skip Verify)
              </div>
              <div className="text-[11px] text-white/40">
                Keep enabled if you do not have an official SSL certificate
              </div>
            </div>
            <input
              type="checkbox"
              checked={insecure}
              onChange={(e) => setInsecure(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-[#151515] text-amber-500 focus:ring-amber-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              📝 Notes & Description (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Client remarks, phone number, renewal notes..."
              className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-3.5 py-2 text-white placeholder:text-white/30 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-5 py-2 text-xs font-bold transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Configuration' : 'Create Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
