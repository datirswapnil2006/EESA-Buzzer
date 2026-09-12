import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EESALogo from './EESALogo';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogOut, Tv } from 'lucide-react';

export default function Header({ isConnected = true, role = 'student', eventCode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-2.5 transition-all shadow-[0_1px_2px_0_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="hover:opacity-90 transition-opacity">
          <EESALogo size="sm" />
        </Link>

        {/* Status Indicators & Navigation */}
        <div className="flex items-center gap-3">
          {/* Connection Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="hidden sm:inline text-[11px] font-medium">
              {isConnected ? 'System Live' : 'Disconnected'}
            </span>
          </div>

          {/* Quick Shortcuts */}
          {eventCode && (
            <Link
              to={`/display/${eventCode}`}
              target="_blank"
              rel="noreferrer"
              title="Open Projector Display"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg transition shadow-sm"
            >
              <Tv className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Projector Display</span>
            </Link>
          )}

          {role === 'student' ? (
            eventCode ? (
              <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                {eventCode}
              </span>
            ) : null
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/admin/dashboard"
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg transition shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin Dashboard</span>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                title="Logout"
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/#register-section"
                className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg transition shadow-sm flex items-center gap-1"
              >
                Register Team
              </Link>
              <Link
                to="/login"
                className="text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-eesa-border transition"
              >
                Host Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
