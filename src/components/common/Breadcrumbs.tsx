import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  view?: string;
  param?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (view: string, param?: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onNavigate }) => {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500 py-3 overflow-x-auto whitespace-nowrap" aria-label="Breadcrumb">
      <button
        onClick={() => onNavigate('home')}
        className="flex items-center gap-1 hover:text-slate-900 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </button>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {isLast || !item.view ? (
              <span className="font-semibold text-slate-900 truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(item.view!, item.param)}
                className="hover:text-slate-900 transition-colors truncate max-w-[150px]"
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
