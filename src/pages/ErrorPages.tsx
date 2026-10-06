import React from 'react';
import { Home, ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

interface ErrorPageProps {
  code: 404 | 403 | 500 | 503;
  onNavigate: (view: string, param?: string) => void;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({ code, onNavigate }) => {
  const content = {
    404: {
      title: 'Page Not Found',
      message: 'The rental property, location, or page you requested could not be located.',
      actionText: 'Return to Search',
      actionView: 'search',
    },
    403: {
      title: 'Access Restricted',
      message: 'You do not have administrative privileges to access this area.',
      actionText: 'Back to Home',
      actionView: 'home',
    },
    500: {
      title: 'System Error',
      message: 'Our backend encountered an unexpected condition. Technical logs have been recorded.',
      actionText: 'Try Again',
      actionView: 'home',
    },
    503: {
      title: 'Service Temporarily Unavailable',
      message: 'The marketplace is undergoing brief maintenance. Please check back in a few minutes.',
      actionText: 'Refresh',
      actionView: 'home',
    },
  }[code];

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-2xl mx-auto shadow-md">
        {code}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">{content.title}</h1>
        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          {content.message}
        </p>
      </div>

      <div className="pt-2 flex items-center justify-center gap-3">
        <button
          onClick={() => onNavigate(content.actionView)}
          className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Home className="w-4 h-4 text-amber-400" />
          <span>{content.actionText}</span>
        </button>
      </div>
    </div>
  );
};
