import React from 'react';
import { Breadcrumbs } from '../components/common/Breadcrumbs.tsx';
import { Home, Shield, Users, Target, HeartHandshake } from 'lucide-react';

interface AboutPageProps {
  onNavigate: (view: string, param?: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <Breadcrumbs items={[{ label: 'About Us' }]} onNavigate={onNavigate} />

      <div className="space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
          About Rental Scout
        </h1>
        <p className="text-base text-slate-600 leading-relaxed font-normal">
          <strong className="text-slate-900">Find it. See it. Connect.</strong> Rental Scout was built to solve a deeply frustrating problem faced by thousands of house hunters across Uganda every week.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
          <Target className="w-8 h-8 text-amber-500" />
          <h3 className="text-base font-bold text-slate-900">The Problem We Solve</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Finding a home to rent in Uganda traditionally meant spending whole days travelling from zone to zone, negotiating with informal brokers, paying unpredictable &quot;viewing fees&quot;, and ultimately losing up to an entire month’s rent in broker commissions.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
          <HeartHandshake className="w-8 h-8 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">Our Direct Connection Model</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Rental Scout provides an honest, digital window into the house: real photos, video tours, precise road distances, and transparent rent numbers. Tenants pay a flat UGX 5,000 fee to directly connect with verified property owners.
          </p>
        </div>
      </div>

      {/* Philosophy */}
      <div className="bg-slate-900 text-white rounded-2xl p-8 space-y-4">
        <h3 className="text-xl font-bold text-white">Built for Uganda&apos;s Growing Urban Centers</h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          From Kira, Ntinda, Naalya, and Kololo to Entebbe, Mukono, and beyond, Rental Scout is expanding countrywide to bring modern digital transparency to Ugandan rental real estate.
        </p>
      </div>
    </div>
  );
};
