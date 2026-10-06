import React, { useState } from 'react';
import { Breadcrumbs } from '../components/common/Breadcrumbs.tsx';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqPageProps {
  onNavigate: (view: string, param?: string) => void;
}

export const FaqPage: React.FC<FaqPageProps> = ({ onNavigate }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does Rental Scout work?',
      a: 'Rental Scout is an online rental property discovery marketplace for Uganda. Instead of paying brokers upfront or spending full days walking around neighborhoods, you can view verified interior photos, video walkthroughs, and road accessibility online. Once you choose a home you like, pay a small fee of UGX 5,000 to instantly unlock the landlord’s verified direct phone number and WhatsApp.',
    },
    {
      q: 'Why is there a UGX 5,000 contact unlock fee?',
      a: 'Traditional rental brokers in Uganda often charge tenants between 50,000 to 100,000 UGX just for viewing homes, and then take an entire month’s rent (e.g. 700,000 UGX) upon agreement. Rental Scout replaces this expensive system with a nominal UGX 5,000 fee that protects landlords from spam while allowing tenants to deal directly with verified owners for a fraction of traditional costs.',
    },
    {
      q: 'Is the UGX 5,000 fee a rent payment or deposit?',
      a: 'No. The UGX 5,000 fee strictly reveals the direct contact information of the landlord. It is NOT rent, NOT a booking fee, and does NOT guarantee that the property will be rented to you. Always inspect the property in person before paying rent or signing a lease agreement.',
    },
    {
      q: 'Which mobile money payment methods are supported?',
      a: 'We support instant push payments from MTN Mobile Money (*165#) and Airtel Money (*185#). You will receive a USSD prompt directly on your phone to enter your PIN. Once authorized, the landlord contact is unlocked instantly.',
    },
    {
      q: 'Are landlords on Rental Scout verified?',
      a: 'Yes! Landlords who have submitted their National ID (NIN) and property ownership documentation (Land Title, Mailo agreement, or LC1 letter) receive the green "✓ Verified Landlord" badge. Our admin team validates these credentials before awarding the badge.',
    },
    {
      q: 'Can I see how far a house is from the main tarmac road?',
      a: 'Yes. Every listing explicitly states the distance in meters from the nearest main transport road (e.g. 450m from Kira-Kasangati Road) as well as estimated walking and driving access times.',
    },
    {
      q: 'How can landlords list properties on Rental Scout?',
      a: 'Property owners can register as a Landlord, upload high-resolution photos, describe amenities, specify distance from the main road, and submit for review. Once approved, your property is discovered by thousands of active house seekers in your area.',
    },
    {
      q: 'What if a property is already rented or fraudulent?',
      a: 'You can immediately click the "Report suspicious listing" button on any property page. Our trust & safety team investigates reports promptly and suspends fraudulent accounts.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs items={[{ label: 'Frequently Asked Questions' }]} onNavigate={onNavigate} />

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Help & Clarity</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-xs text-slate-500">
          Everything you need to know about discovering rentals and connecting with landlords on Rental Scout.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all shadow-xs"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full p-4 text-left font-bold text-sm text-slate-900 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-amber-600' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-2">
        <h4 className="font-bold text-sm text-slate-900">Still have questions?</h4>
        <p className="text-xs text-slate-500">Our support team is ready to assist tenants and property owners.</p>
        <button
          onClick={() => onNavigate('contact')}
          className="mt-2 px-4 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
        >
          Contact Support
        </button>
      </div>
    </div>
  );
};
