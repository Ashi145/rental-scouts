import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Home, Shield, LogOut, ChevronDown, PlusCircle, Building2, User } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, logout, unreadNotifications } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single Wordmark Element */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left text-slate-900 group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-amber-500 shadow-sm transition-transform group-hover:scale-105">
              <Home className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-950 font-sans">
              Rental<span className="text-amber-600">Scout</span>
            </span>
          </button>

          {/* Quick role indicator */}
          {user && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {user.role === 'ADMIN' && <Shield className="w-3 h-3 text-red-600" />}
              {user.role === 'LANDLORD' && <Building2 className="w-3 h-3 text-blue-600" />}
              {user.role === 'TENANT' && <User className="w-3 h-3 text-emerald-600" />}
              {user.role}
            </span>
          )}
        </div>

        {/* Zone 2: 4-5 Text Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            onClick={() => onNavigate('search')}
            className={`transition-colors hover:text-slate-950 ${currentView === 'search' ? 'text-slate-950 font-semibold' : ''}`}
          >
            Search Rentals
          </button>
          <button
            onClick={() => onNavigate('safety')}
            className={`transition-colors hover:text-slate-950 ${currentView === 'safety' ? 'text-slate-950 font-semibold' : ''}`}
          >
            Safety & Scam Guide
          </button>
          <button
            onClick={() => onNavigate('faq')}
            className={`transition-colors hover:text-slate-950 ${currentView === 'faq' ? 'text-slate-950 font-semibold' : ''}`}
          >
            How it Works
          </button>
          {user?.role === 'LANDLORD' ? (
            <button
              onClick={() => onNavigate('landlord-dashboard', 'new')}
              className="text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Add Property
            </button>
          ) : (
            <button
              onClick={() => {
                if (!user) {
                  onNavigate('auth', 'landlord');
                } else if (user.role === 'TENANT') {
                  window.alert('To list a property, create a landlord account. Your tenant account will not be changed.');
                } else {
                  onNavigate('landlord-dashboard', 'new');
                }
              }}
              className="text-slate-600 hover:text-slate-950 font-medium"
            >
              List Your Property
            </button>
          )}
        </nav>

        {/* Zone 3: Primary actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-800 text-sm font-medium"
              >
                <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs">
                  {user.fullName.charAt(0)}
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate">{user.fullName.split(' ')[0]}</span>
                {unreadNotifications > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-sm"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="font-semibold text-slate-900 truncate">{user.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>

                  {user.role === 'TENANT' && (
                    <button
                      onClick={() => onNavigate('tenant-dashboard')}
                      className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-slate-500" /> Tenant Dashboard
                    </button>
                  )}

                  {user.role === 'LANDLORD' && (
                    <button
                      onClick={() => onNavigate('landlord-dashboard')}
                      className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4 text-slate-500" /> Landlord Portal
                    </button>
                  )}

                  {user.role === 'ADMIN' && (
                    <button
                      onClick={() => onNavigate('admin-dashboard')}
                      className="w-full text-left px-4 py-2 text-red-700 hover:bg-red-50 flex items-center gap-2 font-medium"
                    >
                      <Shield className="w-4 h-4 text-red-600" /> Admin Control
                    </button>
                  )}

                  <button
                    onClick={() => {
                      logout();
                      onNavigate('home');
                    }}
                    className="w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100 mt-1"
                  >
                    <LogOut className="w-4 h-4 text-slate-400" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('auth', 'login')}
                className="px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:text-slate-950 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('auth', 'register')}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
