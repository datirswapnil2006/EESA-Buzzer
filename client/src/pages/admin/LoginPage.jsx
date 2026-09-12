import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EESALogo from '../../components/common/EESALogo';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-eesa-bg flex flex-col justify-center px-4 py-8 relative select-none">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block mb-3">
            <EESALogo size="lg" showText={false} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-eesa-text">
            Host & Admin Portal
          </h1>
          <p className="text-xs text-eesa-textSecondary mt-1">
            Electronics Engineering Students Association Quiz Platform
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-eesa-border shadow-sm">
          <div className="flex items-center gap-2 pb-4 mb-5 border-b border-eesa-border">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-eesa-text">
              Authorized Access
            </h2>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-eesa-textSecondary mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@eesa.org"
                  required
                  className="w-full bg-white border border-eesa-border focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-eesa-text font-medium transition placeholder:text-slate-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-eesa-textSecondary mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white border border-eesa-border focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-eesa-text font-medium transition placeholder:text-slate-400 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all transform active:scale-95 disabled:opacity-50 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  SIGN IN TO DASHBOARD <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Back to Public Site */}
        <div className="text-center mt-6">
          <Link
            to="/join"
            className="text-xs text-eesa-textSecondary hover:text-eesa-text transition inline-flex items-center gap-1"
          >
            ← Back to Student Game Join
          </Link>
        </div>
      </div>
    </div>
  );
}
