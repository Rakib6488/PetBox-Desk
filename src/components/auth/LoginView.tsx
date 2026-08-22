import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { authApi } from '../../features/auth/authApi';
import {
  MessageSquare,
  Lock,
  Mail,
  ArrowRight,
  Radio,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const data = await authApi.login(email, password);
      login(data.user);
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-full flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#0F172A] text-slate-100 select-none relative overflow-y-auto">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-lg mb-3">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Petbox Desk
          </h2>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            Sign in to access your Petbox Desk workspace
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 py-7 px-6 shadow-2xl rounded-2xl sm:px-8">
          <form className="space-y-4" onSubmit={handleLogin}>
            {error && <div className="rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">{error}</div>}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Email / User ID</span>
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="block w-full pl-9 pr-3 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Password</span>
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 text-teal-600 focus:ring-teal-500 border-slate-700 rounded bg-slate-800"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-400">
                  Remember this device
                </label>
              </div>

              <span className="text-[11px] text-slate-400">Secure workspace access</span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg shadow-lg text-xs font-bold text-white transition-all cursor-pointer bg-teal-600 hover:bg-teal-700 focus:ring-teal-500"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Radio className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          Petbox Desk &copy; 2026. All rights reserved.
        </p>
      </div>
    </div>
  );
};
