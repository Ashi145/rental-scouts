import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { LandlordRole } from '../../types/index.ts';
import {
  ShieldCheck,
  Phone,
  MessageSquare,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building,
  KeyRound,
  Edit2,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  X,
  Loader2,
  HelpCircle,
  Building2,
} from 'lucide-react';

interface ContactProperty {
  id: string;
  slug: string;
  title: string;
  monthlyRentUGX: number;
  location: any;
  usesCustomContact: boolean;
  effectiveContactPhone: string;
  effectiveContactName: string;
  effectiveRole: string;
}

export const ContactPrivacySettings: React.FC = () => {
  const { user, landlordProfile, refreshUser } = useAuth();

  // Contact settings form state
  const [primaryPhone, setPrimaryPhone] = useState(landlordProfile?.publicContactPhone || user?.phone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(landlordProfile?.secondaryPhone || '');
  const [landlordRole, setLandlordRole] = useState<LandlordRole>(landlordProfile?.landlordRole || 'LANDLORD');
  const [whatsappEnabled, setWhatsappEnabled] = useState(landlordProfile?.whatsappEnabled ?? true);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Phone Verification Challenge state (Requirement 11)
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [verifyingCodeLoading, setVerifyingCodeLoading] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  // Contact inheritance properties (Requirement 2 & 10)
  const [contactProperties, setContactProperties] = useState<ContactProperty[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  // Property Manager Override Modal
  const [editingProperty, setEditingProperty] = useState<ContactProperty | null>(null);
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [managerRole, setManagerRole] = useState<LandlordRole>('PROPERTY_MANAGER');
  const [savingManager, setSavingManager] = useState(false);
  const [managerError, setManagerError] = useState('');

  const loadProperties = async () => {
    setLoadingProperties(true);
    try {
      const res = await api.landlord.getContactProperties();
      setContactProperties(res.properties);
    } catch (err) {
      console.error('Failed to load contact properties', err);
    } finally {
      setLoadingProperties(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (landlordProfile) {
      setPrimaryPhone(landlordProfile.publicContactPhone || user?.phone || '');
      setSecondaryPhone(landlordProfile.secondaryPhone || '');
      setLandlordRole(landlordProfile.landlordRole || 'LANDLORD');
      setWhatsappEnabled(landlordProfile.whatsappEnabled ?? true);
    }
  }, [landlordProfile, user]);

  const handleSaveContactSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage(null);

    try {
      const res = await api.landlord.updateContactSettings({
        publicContactPhone: primaryPhone,
        secondaryPhone: secondaryPhone.trim() || undefined,
        landlordRole,
        whatsappEnabled,
      });

      if (res.requiresPhoneVerification) {
        setIsVerifyingPhone(true);
        setVerificationCode('');
        setVerificationError('');
      } else {
        setSettingsMessage({ type: 'success', text: res.message || 'Contact settings updated successfully.' });
        setIsEditingContact(false);
      }

      await refreshUser();
      await loadProperties();
    } catch (err: unknown) {
      setSettingsMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update contact settings.',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleVerifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.trim().length < 4) {
      setVerificationError('Please enter the 6-digit verification code.');
      return;
    }

    setVerifyingCodeLoading(true);
    setVerificationError('');

    try {
      const res = await api.landlord.verifyPhone(verificationCode.trim());
      setVerificationSuccess(true);
      setTimeout(async () => {
        setIsVerifyingPhone(false);
        setVerificationSuccess(false);
        setIsEditingContact(false);
        setSettingsMessage({ type: 'success', text: 'Phone number verified and activated for direct tenant unlock.' });
        await refreshUser();
        await loadProperties();
      }, 1500);
    } catch (err: unknown) {
      setVerificationError(err instanceof Error ? err.message : 'Invalid verification code.');
    } finally {
      setVerifyingCodeLoading(false);
    }
  };

  const handleOpenManagerModal = (prop: ContactProperty) => {
    setEditingProperty(prop);
    setManagerName(prop.usesCustomContact ? prop.effectiveContactName : '');
    setManagerPhone(prop.usesCustomContact ? prop.effectiveContactPhone : '');
    setManagerRole((prop.effectiveRole as LandlordRole) || 'PROPERTY_MANAGER');
    setManagerError('');
  };

  const handleSaveManagerOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;

    if (!managerName || !managerPhone) {
      setManagerError('Please enter both the manager name and phone number.');
      return;
    }

    setSavingManager(true);
    setManagerError('');

    try {
      await api.properties.update(editingProperty.id, {
        customContactName: managerName.trim(),
        customContactPhone: managerPhone.trim(),
        contactRole: managerRole,
      });

      setEditingProperty(null);
      await loadProperties();
    } catch (err: unknown) {
      setManagerError(err instanceof Error ? err.message : 'Failed to save property manager.');
    } finally {
      setSavingManager(false);
    }
  };

  const handleResetToPrimaryContact = async (propertyId: string) => {
    if (!confirm('Reset this property to inherit your primary landlord phone number?')) return;
    try {
      await api.properties.update(propertyId, {
        customContactName: '',
        customContactPhone: '',
        contactRole: landlordProfile?.landlordRole || 'PROPERTY_OWNER',
      });
      await loadProperties();
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  const isPhoneVerified = landlordProfile?.phoneVerified ?? true;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Official Primary Contact Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Official Primary Contact & Privacy</h3>
              {isPhoneVerified ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified for Unlock
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Verification Required
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              The official phone number used by Rental Scout for tenant call & WhatsApp contact after payment.
            </p>
          </div>

          {!isEditingContact && (
            <button
              onClick={() => setIsEditingContact(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Edit2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Update Contact Details</span>
            </button>
          )}
        </div>

        {/* View Mode */}
        {!isEditingContact ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Primary Phone Number
              </span>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span className="text-base font-black text-slate-950 font-mono">
                  {landlordProfile?.publicContactPhone || user?.phone || 'Not configured'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Official contact number inherited across your properties.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Official Role
              </span>
              <span className="text-sm font-bold text-slate-900 block capitalize">
                {landlordProfile?.landlordRole?.replace(/_/g, ' ') || 'Landlord'}
              </span>
              <p className="text-[11px] text-slate-500">
                Displayed to tenants when contact is unlocked.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Secondary Phone
              </span>
              <span className="text-sm font-mono font-bold text-slate-800 block">
                {landlordProfile?.secondaryPhone || 'None provided'}
              </span>
              <p className="text-[11px] text-slate-500">
                Optional backup communication line.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                WhatsApp Messaging
              </span>
              <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>{landlordProfile?.whatsappEnabled !== false ? 'Enabled' : 'Disabled'}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Allows prospective tenants to click-to-chat via wa.me link.
              </p>
            </div>
          </div>
        ) : (
          /* Edit Mode Form */
          <form onSubmit={handleSaveContactSettings} className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={primaryPhone}
                  onChange={e => setPrimaryPhone(e.target.value)}
                  placeholder="e.g. 0772 123 456 or +256701..."
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Changing your phone number requires instant SMS verification before it becomes unlockable.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Your Landlord Role *
                </label>
                <select
                  value={landlordRole}
                  onChange={e => setLandlordRole(e.target.value as LandlordRole)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800"
                >
                  <option value="LANDLORD">Landlord</option>
                  <option value="LANDLADY">Landlady</option>
                  <option value="PROPERTY_OWNER">Property Owner</option>
                  <option value="PROPERTY_MANAGER">Authorized Property Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Secondary Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={secondaryPhone}
                  onChange={e => setSecondaryPhone(e.target.value)}
                  placeholder="0701 987 654"
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  WhatsApp Direct Communication
                </label>
                <select
                  value={whatsappEnabled ? 'yes' : 'no'}
                  onChange={e => setWhatsappEnabled(e.target.value === 'yes')}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800"
                >
                  <option value="yes">Enable WhatsApp button upon unlock</option>
                  <option value="no">Disable WhatsApp (Phone Call only)</option>
                </select>
              </div>
            </div>

            {settingsMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  settingsMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {settingsMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{settingsMessage.text}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : null}
                <span>Save Changes</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingContact(false);
                  setSettingsMessage(null);
                }}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. Phone Verification Modal Challenge (Requirement 11) */}
      {isVerifyingPhone && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Verify Updated Phone Number</h3>
              </div>
              <button onClick={() => setIsVerifyingPhone(false)} className="p-1 rounded text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Rental Scout security requires phone verification before an updated number can become the active contact number for prospective tenants.
            </p>

            <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 space-y-1">
              <span className="font-bold block">Security Note:</span>
              <p className="text-[11px] leading-relaxed">
                Unverified phone numbers will not be revealed to tenants. SMS verification is currently unavailable.
              </p>
            </div>

            <form onSubmit={handleVerifyPhoneCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value)}
                  placeholder="SMS verification unavailable"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-center font-mono text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {verificationError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{verificationError}</span>
                </div>
              )}

              {verificationSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center gap-2 border border-emerald-200 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Phone verified successfully! Activating...</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={verifyingCodeLoading || verificationSuccess}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {verifyingCodeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : null}
                  <span>Verify & Activate Phone</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsVerifyingPhone(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Property Contact Inheritance Table (Requirement 2 & 10) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Properties & Contact Inheritance</h3>
            <p className="text-xs text-slate-500">
              Shows which properties inherit your primary number versus custom authorized property managers.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 font-mono">
            {contactProperties.length} Properties Configured
          </span>
        </div>

        {/* Explain Rule */}
        <div className="p-4 bg-blue-50/60 border-b border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Default Inheritance Rule:</strong> When you post a property, it automatically links to your verified landlord phone number without requiring you to re-type it. If a specific property has an on-site manager or authorized caretaker, use the <span className="font-semibold text-blue-950">&quot;Assign Manager&quot;</span> button.
          </p>
        </div>

        {loadingProperties ? (
          <div className="p-8 text-center text-xs text-slate-400 animate-pulse">Loading contact mapping...</div>
        ) : contactProperties.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No properties posted yet. Once you add properties, their contact inheritance will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Property</th>
                  <th className="px-5 py-3">Contact Person</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Inheritance Source</th>
                  <th className="px-5 py-3">Effective Phone</th>
                  <th className="px-5 py-3 text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {contactProperties.map(prop => (
                  <tr key={prop.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 max-w-xs">
                      <span className="font-bold text-slate-900 block truncate">{prop.title}</span>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {prop.location?.neighborhood}, {prop.location?.cityOrTown}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {prop.effectiveContactName}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                        {prop.effectiveRole?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {prop.usesCustomContact ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Custom Property Manager
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Inherited Primary Number
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      {prop.effectiveContactPhone}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenManagerModal(prop)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white font-bold text-[11px] text-slate-700 hover:text-slate-900 cursor-pointer shadow-2xs"
                        >
                          {prop.usesCustomContact ? 'Edit Manager' : 'Assign Manager'}
                        </button>
                        {prop.usesCustomContact && (
                          <button
                            onClick={() => handleResetToPrimaryContact(prop.id)}
                            title="Reset to default landlord primary phone"
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Edit Property Manager Override Modal (Requirement 2 & 10) */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Set Property Manager Contact</h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{editingProperty.title}</p>
              </div>
              <button onClick={() => setEditingProperty(null)} className="p-1 rounded text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              If this property has an authorized property manager, caretaker, or on-site supervisor who handles tenant viewings, enter their contact info below.
            </p>

            <form onSubmit={handleSaveManagerOverride} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Manager / Contact Person Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={managerName}
                  onChange={e => setManagerName(e.target.value)}
                  placeholder="e.g. Samuel Mugisha (On-site Caretaker)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contact Person Role *
                </label>
                <select
                  value={managerRole}
                  onChange={e => setManagerRole(e.target.value as LandlordRole)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold"
                >
                  <option value="PROPERTY_MANAGER">Authorized Property Manager</option>
                  <option value="LANDLORD">Landlord</option>
                  <option value="LANDLADY">Landlady</option>
                  <option value="PROPERTY_OWNER">Property Owner</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Manager Ugandan Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={managerPhone}
                  onChange={e => setManagerPhone(e.target.value)}
                  placeholder="0772 123 456 or +256..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Tenants who pay UGX 5,000 for this listing will receive this manager&apos;s phone & WhatsApp links.
                </p>
              </div>

              {managerError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{managerError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingManager}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingManager ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : null}
                  <span>Save Manager Contact</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Rental Scout Privacy & Unlock Guarantee Review (Section 3, 4, 7, 8, 16, 17) */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Rental Scout Landlord Privacy & Anti-Spam Guarantee</h3>
            <p className="text-xs text-slate-400">Strict platform rules protecting your personal phone number</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Zero Public Leakage</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Your phone number is strictly excluded from public APIs, HTML, CSS, JavaScript variables, and metadata. Scrapers and unsolicited brokers can never view your number.
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>UGX 5,000 Unlock Filter</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Only genuine tenants who complete a verified UGX 5,000 transaction via MTN MoMo or Airtel Money can access your direct number. This filters out 99% of unserious window-shoppers.
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Only Call + WhatsApp</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              We strictly permit only two direct contact channels: Direct Phone Call and official WhatsApp. No third-party chat tools (Telegram, Facebook Messenger, Discord, etc.) are allowed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
