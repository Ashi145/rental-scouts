import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { X, Lock, Mail, User, Phone, Building2, AlertCircle, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'register';
  initialRole?: 'TENANT' | 'LANDLORD';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  initialRole = 'TENANT',
  onClose,
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [role, setRole] = useState<'TENANT' | 'LANDLORD'>(initialRole);
  const [landlordRole, setLandlordRole] = useState<'LANDLORD' | 'LANDLADY' | 'PROPERTY_OWNER' | 'PROPERTY_MANAGER'>('LANDLORD');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({
          email,
          password,
          fullName,
          phone,
          role,
          landlordRole: role === 'LANDLORD' ? landlordRole : undefined,
          secondaryPhone: role === 'LANDLORD' && secondaryPhone ? secondaryPhone : undefined,
          businessName: role === 'LANDLORD' && businessName ? businessName : undefined,
        });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {mode === 'login' ? 'Sign in to Rental Scout' : 'Create an Account'}
            </h3>
            <p className="text-xs text-slate-500">
              {mode === 'login' ? 'Access your saved homes & unlocked contacts' : 'Join Uganda’s premier rental platform'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'register' && (
            <>
              {/* Role Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  I want to register as a:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('TENANT')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      role === 'TENANT'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Tenant</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('LANDLORD')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      role === 'LANDLORD'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Landlord</span>
                  </button>
                </div>
              </div>

              {role === 'LANDLORD' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Your Landlord / Owner Role *
                  </label>
                  <select
                    value={landlordRole}
                    onChange={e => setLandlordRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  >
                    <option value="LANDLORD">Landlord</option>
                    <option value="LANDLADY">Landlady</option>
                    <option value="PROPERTY_OWNER">Property Owner</option>
                    <option value="PROPERTY_MANAGER">Authorized Property Manager</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder={role === 'LANDLORD' ? 'e.g. David Kasule' : 'e.g. Arthur Kyeyune'}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {role === 'LANDLORD' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Business / Property Trading Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. Kasule Prime Estates"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {role === 'LANDLORD' ? 'Primary Contact Phone Number *' : 'Uganda Phone Number *'}
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0772 123 456"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {role === 'LANDLORD' && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Official primary number for tenant calls & WhatsApp. Inherited by default across your property listings.
                  </p>
                )}
              </div>

              {role === 'LANDLORD' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Secondary Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={secondaryPhone}
                    onChange={e => setSecondaryPhone(e.target.value)}
                    placeholder="0701 987 654"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg flex items-center gap-2 border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : null}
            <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
          </button>

          <div className="text-center pt-2">
            {mode === 'login' ? (
              <p className="text-xs text-slate-500">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  Register now
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
