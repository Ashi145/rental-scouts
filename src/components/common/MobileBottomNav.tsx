import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Home, Search, Heart, User, Building2, Shield, PlusCircle } from 'lucide-react';

interface MobileBottomNavProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentView, onNavigate, onOpenAuth }) => {
  const { user } = useAuth();

  const getDashboardTarget = () => {
    if (!user) return 'auth';
    if (user.role === 'ADMIN') return 'admin-dashboard';
    if (user.role === 'LANDLORD') return 'landlord-dashboard';
    return 'tenant-dashboard';
  };

  const isDashboardActive = ['tenant-dashboard', 'landlord-dashboard', 'admin-dashboard'].includes(currentView);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Home */}
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            currentView === 'home' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Home className="w-4 h-4 stroke-[2.2]" />
          <span>Home</span>
        </button>

        {/* Search */}
        <button
          onClick={() => onNavigate('search')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            currentView === 'search' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Search className="w-4 h-4 stroke-[2.2]" />
          <span>Search</span>
        </button>

        {/* Post / List Property */}
        <button
          onClick={() => {
            if (!user) {
              onOpenAuth('login');
            } else if (user.role === 'LANDLORD') {
              onNavigate('landlord-dashboard', 'new');
            } else {
              onNavigate('landlord-dashboard', 'new');
            }
          }}
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-slate-700 hover:text-amber-600 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center -mt-2 shadow-sm">
            <PlusCircle className="w-4 h-4" />
          </div>
          <span>Post</span>
        </button>

        {/* Safety Guide */}
        <button
          onClick={() => onNavigate('safety')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            currentView === 'safety' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4 stroke-[2.2]" />
          <span>Safety</span>
        </button>

        {/* Dashboard / Account */}
        <button
          onClick={() => {
            if (!user) {
              onOpenAuth('login');
            } else {
              onNavigate(getDashboardTarget());
            }
          }}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            isDashboardActive ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {user?.role === 'LANDLORD' ? (
            <Building2 className="w-4 h-4 stroke-[2.2]" />
          ) : user?.role === 'ADMIN' ? (
            <Shield className="w-4 h-4 stroke-[2.2] text-red-600" />
          ) : (
            <User className="w-4 h-4 stroke-[2.2]" />
          )}
          <span>{user ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : 'Sign In'}</span>
        </button>
      </div>
    </div>
  );
};
