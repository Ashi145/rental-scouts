import React, { useEffect, useState } from 'react';
import { Property } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  X,
  Lock,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ShieldAlert,
  ArrowRight,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';

interface UnlockModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onUnlocked: (contact: { phone: string; name: string; whatsappEnabled: boolean }) => void;
}

export const UnlockModal: React.FC<UnlockModalProps> = ({ property, isOpen, onClose, onUnlocked }) => {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState<'MTN_MOMO' | 'AIRTEL_MONEY'>('MTN_MOMO');
  const [step, setStep] = useState<'DETAILS' | 'PROCESSING' | 'SUCCESS' | 'FAILED'>('DETAILS');
  const [transactionId, setTransactionId] = useState<string>('');
  const [internalRef, setInternalRef] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [unlockedContact, setUnlockedContact] = useState<{ phone: string; name: string; whatsappEnabled: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      setErrorMessage('Please enter your mobile money phone number.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await api.payments.initiate({
        propertyId: property.id,
        phoneNumber,
        paymentMethod,
      });

      setTransactionId(res.transaction.id);
      setInternalRef(res.transaction.internalReference);
      setInstructions(res.instructions);
      setStep('PROCESSING');

      setLoading(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to initiate payment.');
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!transactionId) return;
    setLoading(true);
    try {
      const statusRes = await api.payments.status(transactionId);
      if (statusRes.transaction.status === 'SUCCESS' && statusRes.contactUnlock) {
        const contact = {
          phone: statusRes.contactUnlock.revealedPhone,
          name: statusRes.contactUnlock.revealedLandlordName,
          whatsappEnabled: statusRes.contactUnlock.whatsappEnabled,
        };
        setUnlockedContact(contact);
        setStep('SUCCESS');
        onUnlocked(contact);
      } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(statusRes.transaction.status)) {
        setErrorMessage(statusRes.failureReason || `Payment ${statusRes.transaction.status.toLowerCase()}.`);
        setStep('FAILED');
      } else {
        setErrorMessage('Waiting for your mobile money PIN confirmation.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to check payment status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 'PROCESSING' || !transactionId) return;
    const startedAt = Date.now();
    const poll = () => {
      if (Date.now() - startedAt >= 120_000) {
        setErrorMessage('Payment status is taking longer than expected. You can check again or retry later.');
        setStep('FAILED');
        return;
      }
      void checkPaymentStatus();
    };
    const interval = window.setInterval(poll, 3000);
    void checkPaymentStatus();
    return () => window.clearInterval(interval);
  }, [step, transactionId]);

  const handleCopyPhone = () => {
    if (unlockedContact?.phone) {
      navigator.clipboard.writeText(unlockedContact.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Unlock Landlord Contact</h3>
              <p className="text-xs text-slate-500 truncate max-w-[280px]">{property.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {step === 'DETAILS' && (
            <form onSubmit={handleInitiate} className="space-y-5">
              {/* Fee Announcement Card */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-amber-900 block">Direct Contact Unlock Fee</span>
                  <span className="text-2xl font-black text-slate-950 font-mono tabular-nums">
                    UGX 5,000
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200/70 text-amber-950">
                    One-time payment
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-1">Direct Landlord</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Mobile Money Provider
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('MTN_MOMO')}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      paymentMethod === 'MTN_MOMO'
                        ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-yellow-400 text-slate-950 font-extrabold text-xs flex items-center justify-center shrink-0">
                      MTN
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">MTN MoMo</p>
                      <p className="text-[10px] text-slate-500">*165# Push</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('AIRTEL_MONEY')}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      paymentMethod === 'AIRTEL_MONEY'
                        ? 'border-red-500 bg-red-50/40 ring-2 ring-red-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-red-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      AIR
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Airtel Money</p>
                      <p className="text-[10px] text-slate-500">*185# Push</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Phone Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mobile Money Phone Number
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 0772 123 456 or +256701..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  You will receive a USSD push notification on this phone to enter your PIN.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2 border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* What this fee is and is not */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Rental Scout Guarantee</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  • Revealing direct landlord contact avoids inflated middleman agent broker fees (typically 1 month rent).
                </p>
                <p className="text-[11px] leading-relaxed">
                  • This UGX 5,000 fee strictly covers contact discovery. Never pay advance rent before inspecting the home.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-slate-950 text-white font-bold text-sm hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Initiating Mobile Money Push...</span>
                  </>
                ) : (
                  <>
                    <span>Pay UGX 5,000 & Unlock Contact</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'PROCESSING' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-3">
                <Loader2 className="w-7 h-7 animate-spin text-amber-500 mx-auto" />
                <h4 className="font-bold text-slate-900">Waiting for payment confirmation</h4>
                <p className="text-xs text-slate-600">Approve the request on your phone. Your contact stays private until the payment provider confirms success.</p>
                <p className="text-[11px] text-slate-500 font-mono">Reference: {internalRef}</p>
                <button
                  type="button"
                  onClick={checkPaymentStatus}
                  disabled={loading}
                  className="min-h-11 px-4 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-50"
                >
                  {loading ? 'Checking…' : 'Check payment status'}
                </button>
                {errorMessage && <p role="status" className="text-xs text-amber-700">{errorMessage}</p>}
              </div>
            </div>
          )}

          {step === 'SUCCESS' && unlockedContact && (
            <div className="text-center py-4 space-y-5 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border-2 border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-extrabold text-slate-950">Landlord Contact Unlocked!</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified landlord for {property.title}
                </p>
              </div>

              {/* Revealed Contact Card */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-left space-y-4">
                <div>
                  <span className="text-xs text-slate-400 block">Verified Landlord / Contact Person</span>
                  <span className="text-sm font-bold text-slate-900">{unlockedContact.name}</span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block mb-1">Direct Phone Number</span>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
                    <span className="font-mono text-base font-extrabold text-slate-950 tracking-wider">
                      {unlockedContact.phone}
                    </span>
                    <button
                      onClick={handleCopyPhone}
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Instant Actions (Exclusively Option 1: Call Landlord and Option 2: WhatsApp Landlord) */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`tel:${unlockedContact.phone}`}
                    className="py-2.5 px-3 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    <Phone className="w-4 h-4 text-amber-400" />
                    <span>Call Landlord</span>
                  </a>

                  {unlockedContact.whatsappEnabled ? (
                    <a
                      href={`https://wa.me/${
                        unlockedContact.phone.replace(/[^0-9]/g, '').startsWith('0')
                          ? '256' + unlockedContact.phone.replace(/[^0-9]/g, '').slice(1)
                          : unlockedContact.phone.replace(/[^0-9]/g, '').startsWith('256')
                          ? unlockedContact.phone.replace(/[^0-9]/g, '')
                          : '256' + unlockedContact.phone.replace(/[^0-9]/g, '')
                      }?text=${encodeURIComponent(`Hello, I am interested in your rental property "${property.title}" on Rental Scout.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>WhatsApp Landlord</span>
                    </a>
                  ) : (
                    <div className="py-2.5 px-3 rounded-lg bg-slate-100 text-slate-400 text-xs flex items-center justify-center font-medium">
                      WhatsApp not active
                    </div>
                  )}
                </div>
              </div>

              {/* Receipt Note */}
              <p className="text-[11px] text-slate-400">
                Receipt reference: <span className="font-mono">{internalRef}</span>. Saved in your Tenant Dashboard.
              </p>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close & Return to Property
              </button>
            </div>
          )}

          {step === 'FAILED' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 border-2 border-rose-500/20 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Payment Could Not Complete</h4>
                <p className="text-xs text-rose-600 mt-1 max-w-sm mx-auto">
                  {errorMessage || 'Mobile money transaction was cancelled or timed out.'}
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setStep('DETAILS')}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
