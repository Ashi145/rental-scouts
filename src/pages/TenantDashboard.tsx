import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { ContactUnlock, PaymentTransaction, Property, Notification } from '../types/index.ts';
import { PropertyCard } from '../components/property/PropertyCard.tsx';
import {
  Lock,
  Phone,
  MessageSquare,
  Heart,
  Receipt,
  Bell,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ChevronRight,
  User,
} from 'lucide-react';

interface TenantDashboardProps {
  onNavigate: (view: string, param?: string) => void;
  onSelectProperty: (slugOrId: string) => void;
}

export const TenantDashboard: React.FC<TenantDashboardProps> = ({ onNavigate, onSelectProperty }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'UNLOCKS' | 'SAVED' | 'PAYMENTS' | 'NOTIFICATIONS'>('UNLOCKS');
  const [unlocks, setUnlocks] = useState<ContactUnlock[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [favoriteProperties, setFavoriteProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [unlocksRes, txRes, notifRes, allPropsRes] = await Promise.all([
        api.payments.unlocks(),
        api.payments.history(),
        api.notifications.list(),
        api.properties.list(),
      ]);

      setUnlocks(unlocksRes.unlocks);
      setTransactions(txRes.transactions);
      setNotifications(notifRes.notifications);
      setFavoriteProperties(allPropsRes.properties.filter(p => p.isFavorite));
    } catch (err) {
      console.error('Failed to load tenant dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xl shadow-xs">
            {user?.fullName?.charAt(0) || 'T'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{user?.fullName}</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Verified Tenant
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email} · {user?.phone}</p>
          </div>
        </div>

        {/* Quick Stat Counter */}
        <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Unlocked Contacts</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">{unlocks.length}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Saved Homes</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">{favoriteProperties.length}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Total Paid</span>
            <span className="text-xl font-extrabold text-amber-700 font-mono tabular-nums">
              UGX {(unlocks.length * 5000).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('UNLOCKS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'UNLOCKS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Phone className="w-3.5 h-3.5 text-amber-400" />
          <span>Unlocked Landlord Contacts ({unlocks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SAVED')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'SAVED' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Saved Properties ({favoriteProperties.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PAYMENTS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'PAYMENTS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Payment History & Receipts ({transactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('NOTIFICATIONS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'NOTIFICATIONS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Notifications</span>
          {notifications.some(n => !n.isRead) && <span className="w-2 h-2 rounded-full bg-amber-500" />}
        </button>
      </div>

      {/* Tab Panels */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">Loading dashboard records...</div>
      ) : (
        <div>
          {/* TAB 1: UNLOCKED CONTACTS */}
          {activeTab === 'UNLOCKS' && (
            <div className="space-y-4">
              {unlocks.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
                  <Lock className="w-8 h-8 text-slate-300 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900">No contacts unlocked yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    When you find a rental property you like, pay UGX 5,000 to reveal the verified landlord&apos;s direct phone and WhatsApp.
                  </p>
                  <button
                    onClick={() => onNavigate('search')}
                    className="mt-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                  >
                    Browse Rentals
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {unlocks.map(unlock => (
                    <div
                      key={unlock.id}
                      className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 mb-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Contact Unlocked
                          </span>
                          <h4
                            onClick={() => unlock.property?.slug && onSelectProperty(unlock.property.slug)}
                            className="text-base font-bold text-slate-900 truncate hover:text-amber-600 cursor-pointer"
                          >
                            {unlock.property?.title || 'Rental Property'}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {unlock.property?.location?.neighborhood}, {unlock.property?.location?.cityOrTown}
                          </p>
                        </div>
                        {unlock.property?.image && (
                          <img
                            src={unlock.property.image}
                            alt=""
                            className="w-16 h-16 rounded-lg object-cover shrink-0"
                          />
                        )}
                      </div>

                      {/* Landlord Contact Info */}
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Landlord / Owner:</span>
                          <span className="font-bold text-slate-900">{unlock.revealedLandlordName}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Direct Phone:</span>
                          <span className="font-mono font-extrabold text-slate-950 text-sm">{unlock.revealedPhone}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={`tel:${unlock.revealedPhone}`}
                          className="flex-1 py-2 px-3 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-amber-400" /> Call
                        </a>
                        {unlock.whatsappEnabled && (
                          <a
                            href={`https://wa.me/${unlock.revealedPhone.replace(/[^0-9]/g, '')}?text=Hello,%20I%20am%20interested%20in%20your%20property%20"${encodeURIComponent(unlock.property?.title || 'Rental')}"%20on%20Rental%20Scout.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        )}
                        {unlock.property?.slug && (
                          <button
                            onClick={() => onSelectProperty(unlock.property!.slug)}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                            title="View Property Page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAVED FAVORITES */}
          {activeTab === 'SAVED' && (
            <div>
              {favoriteProperties.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
                  <Heart className="w-8 h-8 text-slate-300 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900">No saved properties</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Click the heart icon on any property card to save homes for quick inspection later.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoriteProperties.map(prop => (
                    <PropertyCard
                      key={prop.id}
                      property={prop}
                      onSelect={onSelectProperty}
                      onFavoriteChange={(id, isFav) => {
                        if (!isFav) {
                          setFavoriteProperties(prev => prev.filter(p => p.id !== id));
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENT RECEIPTS */}
          {activeTab === 'PAYMENTS' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Payment Transactions</h3>
                <span className="text-xs text-slate-400 font-mono">Standard Fee: UGX 5,000 / unlock</span>
              </div>

              {transactions.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500">No payment transactions recorded.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Internal Reference</th>
                        <th className="px-4 py-3">Property</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Provider</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">{tx.internalReference}</td>
                          <td className="px-4 py-3 max-w-xs truncate">{tx.propertyTitle || 'Rental Property'}</td>
                          <td className="px-4 py-3 font-mono tabular-nums font-bold text-slate-900">
                            UGX {tx.amountUGX.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{tx.provider}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.status === 'SUCCESS'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : tx.status === 'FAILED'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                            {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === 'NOTIFICATIONS' && (
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
                  No notifications.
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkNotificationRead(notif.id)}
                    className={`p-4 rounded-xl border transition-colors cursor-pointer flex items-start justify-between gap-4 ${
                      notif.isRead ? 'bg-white border-slate-200' : 'bg-amber-50/40 border-amber-200/80 shadow-xs'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                        {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                      <span className="text-[10px] text-slate-400 block pt-1 font-mono">
                        {new Date(notif.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {notif.linkUrl && (
                      <button
                        onClick={() => {
                          if (notif.linkUrl?.includes('/property/')) {
                            const slug = notif.linkUrl.split('/property/')[1];
                            onSelectProperty(slug);
                          }
                        }}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-800 shrink-0"
                      >
                        View Details →
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
