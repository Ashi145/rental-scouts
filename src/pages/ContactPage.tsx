import React, { useState } from 'react';
import { Breadcrumbs } from '../components/common/Breadcrumbs.tsx';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';

interface ContactPageProps {
  onNavigate: (view: string, param?: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onNavigate }) => {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs items={[{ label: 'Contact Support' }]} onNavigate={onNavigate} />

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Contact Rental Scout</h1>
        <p className="text-xs text-slate-500">
          Have an inquiry, listing support issue, or feedback? Get in touch with our Kampala support desk.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4 text-xs text-slate-600">
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <Mail className="w-5 h-5 text-amber-500" />
            <h4 className="font-bold text-slate-900">Email Inquiries</h4>
            <p className="font-mono text-slate-700">support@rentalscout.ug</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <Phone className="w-5 h-5 text-emerald-600" />
            <h4 className="font-bold text-slate-900">Support Desk</h4>
            <p className="font-mono text-slate-700">+256 700 123 456</p>
            <p className="text-[11px] text-slate-400">Mon - Sat, 8:00 AM - 6:00 PM EAT</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-slate-900">Uganda Operations</h4>
            <p className="text-slate-700">Kampala & Wakiso Metro Area, Uganda</p>
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          {submitted ? (
            <div className="text-center py-12 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">Message Received</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Thank you for contacting Rental Scout. One of our support associates will respond to your email promptly.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Send us a message</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. David Mukasa"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Describe your inquiry or question..."
                  className="w-full p-3 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Message</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
