import React, { useState } from 'react';
import { X, RefreshCw, Calendar, HardDrive, RotateCcw } from 'lucide-react';
import { AnyTlsConfig, RenewOptions } from '../types';
import { getDaysRemaining } from '../lib/formatters';

interface RenewModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AnyTlsConfig | null;
  onRenew: (id: string, options: RenewOptions) => Promise<void>;
}

export const RenewModal: React.FC<RenewModalProps> = ({
  isOpen,
  onClose,
  config,
  onRenew,
}) => {
  const [addDays, setAddDays] = useState<number>(30);
  const [addTrafficGB, setAddTrafficGB] = useState<number>(0);
  const [resetTraffic, setResetTraffic] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !config) return null;

  const daysInfo = getDaysRemaining(config.expireAt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onRenew(config.id, {
        addDays,
        addTrafficGB,
        resetTraffic,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error renewing configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#151515] shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-amber-500 border border-white/5">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-medium text-white tracking-wide">
                Renew Configuration: {config.remark}
              </h2>
              <p className="text-xs text-white/40">
                Current Status: {daysInfo.text}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {/* Add Days */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              ⏱ Extend Validity Duration (Add Days)
            </label>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {[15, 30, 60, 90].map((days) => (
                <button
                  type="button"
                  key={days}
                  onClick={() => setAddDays(days)}
                  className={`rounded-lg py-1.5 text-xs font-mono transition border ${
                    addDays === days
                      ? 'bg-amber-500 text-black font-bold border-amber-500'
                      : 'bg-[#0d0d0d] text-white/70 border-white/5 hover:border-white/20'
                  }`}
                >
                  +{days} days
                </button>
              ))}
            </div>
            <input
              type="number"
              min="0"
              value={addDays}
              onChange={(e) => setAddDays(Number(e.target.value))}
              placeholder="Enter number of days..."
              className="w-full font-mono rounded-xl border border-white/10 bg-[#0d0d0d] px-3.5 py-2 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Add Traffic */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              🔢 Add Bandwidth Quota (GB)
            </label>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {[0, 10, 20, 50].map((gb) => (
                <button
                  type="button"
                  key={gb}
                  onClick={() => setAddTrafficGB(gb)}
                  className={`rounded-lg py-1.5 text-xs font-mono transition border ${
                    addTrafficGB === gb
                      ? 'bg-amber-500 text-black font-bold border-amber-500'
                      : 'bg-[#0d0d0d] text-white/70 border-white/5 hover:border-white/20'
                  }`}
                >
                  {gb === 0 ? 'No change' : `+${gb} GB`}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="0"
              value={addTrafficGB}
              onChange={(e) => setAddTrafficGB(Number(e.target.value))}
              placeholder="0 if unchanged..."
              className="w-full font-mono rounded-xl border border-white/10 bg-[#0d0d0d] px-3.5 py-2 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Reset Used Traffic Checkbox */}
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#0d0d0d] p-3">
            <div>
              <div className="text-xs font-medium text-white/80">
                Reset Used Bandwidth
              </div>
              <div className="text-[11px] text-white/40">
                Reset the used traffic counter for this user to zero
              </div>
            </div>
            <input
              type="checkbox"
              checked={resetTraffic}
              onChange={(e) => setResetTraffic(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-[#151515] text-amber-500 focus:ring-amber-500"
            />
          </div>

          {/* Footer */}
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
              {isSubmitting ? 'Submitting...' : 'Confirm Renewal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
