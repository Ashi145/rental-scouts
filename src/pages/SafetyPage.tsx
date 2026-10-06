import React from 'react';
import { Breadcrumbs } from '../components/common/Breadcrumbs.tsx';
import { ShieldCheck, AlertTriangle, Eye, Lock, FileCheck, PhoneCall, CheckCircle2 } from 'lucide-react';

interface SafetyPageProps {
  onNavigate: (view: string, param?: string) => void;
}

export const SafetyPage: React.FC<SafetyPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs items={[{ label: 'Trust & Safety Guide' }]} onNavigate={onNavigate} />

      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Rental Scout Trust & Safety Protocol</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          How to Avoid Rental Scams in Uganda
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Rental Scout was founded to eliminate deceptive rental brokers and fake housing classifieds. Here are the mandatory rules every tenant should follow to ensure secure house discovery.
        </p>
      </div>

      {/* Core Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Eye className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">1. Always Inspect in Person</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Never pay any deposit or rent advance before physically entering the house, testing the water taps, checking the Umeme Yaka meter, and inspecting the perimeter wall. Photos and video walkthroughs assist in shortlisting, not substituting physical inspection.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">2. Beware Urgent Advance Demands</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            A common scam involves someone claiming &quot;another tenant is rushing to pay right now, send 200,000 UGX to reserve the key.&quot; Legitimate landlords will meet you at the property or have an authorized caretaker on site.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <FileCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">3. Verify Ownership & Tenancy Agreement</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Ask to see a copy of the LC1 Local Council letter or title document. Always demand a signed written Tenancy Agreement stating the agreed rent, security deposit terms, and notice period before handing over rent payments.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">4. What the UGX 5,000 Fee Means</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            The UGX 5,000 unlock fee strictly connects you directly with the verified property owner, cutting out 1-month agent commission costs. It is NOT rent, NOT a booking fee, and does NOT guarantee property tenancy.
          </p>
        </div>
      </div>

      {/* Landlord Verification Explanation */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>What Our Verified Landlord Badge Signifies</span>
        </div>
        <h3 className="text-xl font-bold text-white">How Rental Scout Verifies Property Owners</h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          When you see a <strong className="text-emerald-400">✓ Verified Landlord</strong> badge, Rental Scout has validated:
        </p>
        <ul className="space-y-2 text-xs text-slate-300">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>National Identification Number (NIN) matched with government ID records.</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Property ownership documentation (Land Title, Mailo Agreement, or LC1 Confirmation Letter).</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Verified mobile money registered telephone number.</span>
          </li>
        </ul>
      </div>

      {/* Reporting Prompt */}
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div>
          <h4 className="font-bold text-amber-950 text-sm">Notice Suspicious Activity?</h4>
          <p className="text-amber-800 mt-0.5">
            You can report any property using the &quot;Report suspicious listing&quot; button on its page. Our trust & safety team investigates every complaint.
          </p>
        </div>
        <button
          onClick={() => onNavigate('contact')}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shrink-0"
        >
          Contact Safety Team
        </button>
      </div>
    </div>
  );
};
