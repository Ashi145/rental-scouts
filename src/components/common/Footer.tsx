import React from 'react';
import { Home, ShieldCheck, PhoneCall, HelpCircle, MapPin } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-950 text-slate-400 text-sm border-t border-slate-900 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
                <Home className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white font-sans">
                Rental<span className="text-amber-500">Scout</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              Find it. See it. Connect. Uganda&apos;s direct rental discovery marketplace connecting tenants directly with verified property owners without intermediaries or inflated broker commissions.
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verified Landlords
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <PhoneCall className="w-4 h-4 text-amber-400" /> Direct Contact
              </span>
            </div>
          </div>

          {/* Popular Areas */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">
              Popular Rentals
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button onClick={() => onNavigate('search', 'Kira')} className="hover:text-white transition-colors">
                  Kira Municipality
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('search', 'Ntinda')} className="hover:text-white transition-colors">
                  Ntinda & Nakawa
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('search', 'Naalya')} className="hover:text-white transition-colors">
                  Naalya & Namugongo
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('search', 'Kololo')} className="hover:text-white transition-colors">
                  Kololo & Nakasero
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('search', 'Muyenga')} className="hover:text-white transition-colors">
                  Muyenga & Kansanga
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('search', 'Entebbe')} className="hover:text-white transition-colors">
                  Entebbe & Wakiso
                </button>
              </li>
            </ul>
          </div>

          {/* Trust & Resources */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">
              Trust & Safety
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button onClick={() => onNavigate('safety')} className="hover:text-white transition-colors">
                  Avoid Rental Scams
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('safety')} className="hover:text-white transition-colors">
                  Physical Inspection Notice
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-white transition-colors">
                  Why UGX 5,000 Unlock Fee?
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-white transition-colors">
                  How Landlord Verification Works
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-white transition-colors">
                  About Rental Scout
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Portals */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">
              Portals & Legal
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button onClick={() => onNavigate('landlord-dashboard')} className="hover:text-white transition-colors">
                  Landlord Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('tenant-dashboard')} className="hover:text-white transition-colors">
                  Tenant Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors">
                  Contact Support
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('terms')} className="hover:text-white transition-colors">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('privacy')} className="hover:text-white transition-colors">
                  Privacy Policy
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer & Copyright */}
        <div className="mt-12 pt-8 border-t border-slate-900/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {new Date().getFullYear()} Rental Scout Uganda. All rights reserved. Registered rental discovery marketplace.
          </p>
          <p className="text-[11px] text-slate-400 max-w-xl text-center md:text-right">
            Important Notice: The UGX 5,000 fee strictly unlocks the verified direct phone and WhatsApp contact of the property owner. It is not rent, a booking deposit, or a lease guarantee. Always inspect the premises in person before signing agreements or transferring rent.
          </p>
        </div>
      </div>
    </footer>
  );
};
