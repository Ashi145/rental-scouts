import React from 'react';
import { Breadcrumbs } from '../components/common/Breadcrumbs.tsx';

interface LegalPageProps {
  type: 'terms' | 'privacy';
  onNavigate: (view: string, param?: string) => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({ type, onNavigate }) => {
  const isTerms = type === 'terms';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs items={[{ label: isTerms ? 'Terms of Service' : 'Privacy Policy' }]} onNavigate={onNavigate} />

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          {isTerms ? 'Terms of Service' : 'Privacy Policy'}
        </h1>
        <p className="text-xs text-slate-500 font-mono">Last updated: October 2026 · Rental Scout Uganda</p>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs text-xs sm:text-sm text-slate-700 leading-relaxed space-y-6">
        {isTerms ? (
          <>
            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
              <p>
                By accessing and using Rental Scout (&quot;the Platform&quot;), you acknowledge and agree to be bound by these Terms of Service. If you disagree with any part of these terms, you must discontinue using our services.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">2. Scope of Service & The UGX 5,000 Unlock Fee</h2>
              <p>
                Rental Scout operates as a digital rental discovery directory connecting tenants directly with property owners. The non-refundable UGX 5,000 contact-unlock fee is solely a platform access fee for revealing the verified owner’s direct telephone and WhatsApp contact.
              </p>
              <p className="font-semibold text-slate-900">
                The unlock fee is NOT rent, NOT a security deposit, and NOT a reservation guarantee. Rental Scout does not collect rental payments on behalf of landlords.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">3. Physical Inspection Requirement</h2>
              <p>
                Tenants are strictly required to conduct physical property inspections before executing tenancy agreements or transferring rent. Rental Scout makes reasonable verification efforts but does not replace the tenant’s obligation to perform physical due diligence.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">4. Landlord Representations</h2>
              <p>
                Landlords warrant that listings submitted represent real, available residential premises and that they possess lawful authority or ownership to lease the premises. Fraudulent submissions will lead to immediate account termination and reporting to relevant Ugandan civil authorities.
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">1. Information We Collect</h2>
              <p>
                We collect information provided directly by you, including your name, email address, telephone number, user role (Tenant or Landlord), and property listing information. For landlords requesting verification badges, we securely record National ID (NIN) numbers and proof documents.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">2. Landlord Phone Privacy Protection</h2>
              <p>
                In accordance with our core product principles, landlord telephone numbers are never published in public web markup, public API responses, or client search results. Contact details are securely retained on the backend and disclosed exclusively to authenticated tenants following verified mobile money transactions.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">3. Payment & Mobile Money Data</h2>
              <p>
                Payment processing is carried out through compliant telecom gateway integrations (MTN MoMo and Airtel Money). Sensitive Mobile Money PINs are entered strictly via carrier USSD prompts on user devices and never pass through or get stored on Rental Scout servers.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
