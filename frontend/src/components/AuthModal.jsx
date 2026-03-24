import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    let result;
    if (mode === 'login') {
      result = await login(email, password);
    } else {
      result = await register(email, password, name);
    }
    if (result.success) {
      onClose();
      setEmail(''); setPassword(''); setName('');
    } else {
      setError(result.error || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-[#0a0f1a] border-2 border-white/[0.08] rounded-md overflow-hidden shadow-[0_20px_60px_-12px_rgba(129,140,248,0.15)]" data-testid="auth-modal">
            {/* Header */}
            <div className="relative p-6 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-sm bg-indigo-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">
                    {mode === 'login' ? 'Welcome back' : 'Create account'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {mode === 'login' ? 'Sign in to access your projects' : 'Start creating cinematic videos'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-300 rounded-sm hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-sm bg-red-500/10 border-2 border-red-500/20 text-sm text-red-400 font-medium">
                  {error}
                </div>
              )}

              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border-2 border-white/[0.08] rounded-sm text-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0a0f1a] outline-none" data-testid="auth-name" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border-2 border-white/[0.08] rounded-sm text-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0a0f1a] outline-none" data-testid="auth-email" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border-2 border-white/[0.08] rounded-sm text-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0a0f1a] outline-none" data-testid="auth-password" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-2.5 rounded-none bg-indigo-500 text-white font-bold text-sm btn-sharp disabled:opacity-50" data-testid="auth-submit">
                {loading ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Please wait...</span>
                ) : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {/* Footer */}
            <div className="px-6 pb-6">
              <p className="text-center text-sm text-slate-500">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="text-indigo-400 hover:text-indigo-300 font-bold" data-testid="auth-toggle">
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
