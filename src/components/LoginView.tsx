import React, { useState } from 'react';
import { Shield, Key, User, ArrowLeft, Lock, Terminal, Info } from 'lucide-react';
import { api } from '../lib/api';

interface LoginViewProps {
  onLoginSuccess: (username: string) => void;
  onOpenInstallGuide: () => void;
  isStandalone?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onOpenInstallGuide,
  isStandalone = false,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await api.login(username.trim(), password);
      onLoginSuccess(res.username);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#090909]">
      <div className="w-full max-w-md">
        {/* Header Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-amber-500 border border-white/5 shadow-2xl mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
            AnyTLS Manager
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Sign in to AnyTLS Server Management Panel
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-white/10 bg-[#111] p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Administrator Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-3.5 py-2.5 pl-10 text-white placeholder:text-white/30 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
                <User className="absolute left-3.5 top-3 h-4 w-4 text-white/40" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-3.5 py-2.5 pl-10 text-white placeholder:text-white/30 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-white/40" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-sm font-bold text-black transition disabled:opacity-50"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowLeft className="h-4 w-4" />
            </button>
          </form>

          {/* Default Credentials Callout */}
          <div className="mt-6 rounded-xl border border-white/5 bg-[#0d0d0d] p-3 text-xs text-white/50 space-y-1">
            <div className="flex items-center gap-1.5 text-white/70 font-medium">
              <Info className="h-3.5 w-3.5 text-amber-500" />
              Default credentials:
            </div>
            <div className="flex justify-between font-mono text-[11px] pt-1">
              <span>Username: <strong className="text-white">admin</strong></span>
              <span>Password: <strong className="text-white">admin123</strong></span>
            </div>
          </div>
        </div>

        {/* Server Install Helper Link (Only in Web Preview/Dev) */}
        {!isStandalone && (
          <div className="text-center mt-6">
            <button
              onClick={onOpenInstallGuide}
              className="inline-flex items-center gap-1.5 text-xs text-amber-500/90 hover:text-amber-400 hover:underline transition"
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>How to deploy this panel on Ubuntu Server? (Script & ZIP)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
