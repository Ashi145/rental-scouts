import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { AdminAnalytics, Property, LandlordProfile, PaymentTransaction, Report, User } from '../types/index.ts';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Receipt,
  Users,
  Building2,
  FileText,
  Clock,
  Sparkles,
  Lock,
  Search,
  Filter,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (view: string, param?: string) => void;
  onSelectProperty: (slugOrId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, onSelectProperty }) => {
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'PROPERTIES' | 'LANDLORDS' | 'PAYMENTS' | 'REPORTS' | 'USERS' | 'AUDIT'>('ANALYTICS');
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [landlords, setLandlords] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Rejection modal
  const [rejectingItem, setRejectingItem] = useState<{ type: 'PROPERTY' | 'LANDLORD'; id: string; title: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [anRes, propsRes, lndRes, txRes, repRes, usersRes, logsRes] = await Promise.all([
        api.admin.analytics(),
        api.admin.properties(),
        api.admin.landlords(),
        api.admin.transactions(),
        api.admin.reports(),
        api.admin.users(),
        api.admin.auditLogs(),
      ]);

      setAnalytics(anRes.analytics);
      setProperties(propsRes.properties);
      setLandlords(lndRes.landlords);
      setTransactions(txRes.transactions);
      setReports(repRes.reports);
      setUsers(usersRes.users);
      setAuditLogs(logsRes.logs);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleApproveProperty = async (id: string) => {
    try {
      await api.admin.updatePropertyStatus(id, { status: 'APPROVED' });
      await loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectPropertySubmit = async () => {
    if (!rejectingItem) return;
    try {
      if (rejectingItem.type === 'PROPERTY') {
        await api.admin.updatePropertyStatus(rejectingItem.id, {
          status: 'REJECTED',
          rejectionReason,
        });
      } else {
        await api.admin.updateLandlordVerification(rejectingItem.id, 'REJECTED', rejectionReason);
      }
      setRejectingItem(null);
      setRejectionReason('');
      await loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyLandlord = async (id: string) => {
    try {
      await api.admin.updateLandlordVerification(id, 'VERIFIED');
      await loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    if (!confirm(`Are you sure you want to ${user.isActive ? 'suspend' : 'reactivate'} ${user.fullName}?`)) return;
    try {
      await api.admin.updateUserStatus(user.id, !user.isActive);
      await loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateReport = async (id: string, status: string) => {
    try {
      await api.admin.updateReport(id, { status, adminNotes: `Reviewed and marked ${status}` });
      await loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Title */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center font-bold text-2xl">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white">System Administrator Console</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-950 text-red-400 border border-red-800">
                Staff Only
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Uganda Rental Scout Platform · Moderation, Payment Reconciliation & Trust Enforcement
            </p>
          </div>
        </div>

        <button
          onClick={loadAdminData}
          className="self-start md:self-auto py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('ANALYTICS')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'ANALYTICS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Platform Analytics & Revenue
        </button>

        <button
          onClick={() => setActiveTab('PROPERTIES')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'PROPERTIES' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Property Moderation</span>
          {properties.filter(p => p.status === 'PENDING_REVIEW').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950">
              {properties.filter(p => p.status === 'PENDING_REVIEW').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('LANDLORDS')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'LANDLORDS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Landlord Verification</span>
          {landlords.filter(l => l.verificationStatus === 'PENDING').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950">
              {landlords.filter(l => l.verificationStatus === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('PAYMENTS')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'PAYMENTS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Payment Reconciliation ({transactions.length})
        </button>

        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'REPORTS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Fraud Reports</span>
          {reports.filter(r => r.status === 'OPEN').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white">
              {reports.filter(r => r.status === 'OPEN').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('USERS')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'USERS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          User Accounts ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'AUDIT' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Security Audit Logs
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 animate-pulse">Loading administration data...</div>
      ) : (
        <div>
          {/* TAB 1: ANALYTICS & REVENUE */}
          {activeTab === 'ANALYTICS' && analytics && (
            <div className="space-y-6">
              {/* Financial Metric Highlight */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Gross Contact Unlock Revenue (Platform Fee)
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-slate-950 font-mono tabular-nums mt-1">
                    UGX {analytics.totalRevenueUGX.toLocaleString()}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Generated from {analytics.totalUnlocks} verified contact unlocks @ UGX 5,000 each.
                  </p>
                </div>

                <div className="text-right border-t sm:border-t-0 sm:border-l border-amber-200 pt-3 sm:pt-0 sm:pl-6">
                  <span className="text-xs text-slate-500 block">Successful Payment Rate</span>
                  <span className="text-xl font-bold text-emerald-700 font-mono tabular-nums">
                    {analytics.transactionCount > 0
                      ? Math.round((analytics.successfulTransactionCount / analytics.transactionCount) * 100)
                      : 100}%
                  </span>
                </div>
              </div>

              {/* Standard Analytics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Total Users</span>
                  <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">{analytics.totalUsers}</span>
                  <span className="text-[11px] text-slate-400 block mt-1">{analytics.tenants} Tenants · {analytics.landlords} Landlords</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Approved Listings</span>
                  <span className="text-2xl font-black text-emerald-700 font-mono tabular-nums">{analytics.approvedProperties}</span>
                  <span className="text-[11px] text-slate-400 block mt-1">{analytics.pendingProperties} Pending Review</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Verified Landlords</span>
                  <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">{analytics.verifiedLandlords}</span>
                  <span className="text-[11px] text-slate-400 block mt-1">Badge recipients</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Open Reports</span>
                  <span className="text-2xl font-black text-rose-600 font-mono tabular-nums">{analytics.openReports}</span>
                  <span className="text-[11px] text-slate-400 block mt-1">Requires review</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROPERTY MODERATION */}
          {activeTab === 'PROPERTIES' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Properties Moderation Queue</h3>
                <span className="text-xs text-slate-400 font-mono">{properties.length} listings</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Property</th>
                      <th className="px-4 py-3">Landlord</th>
                      <th className="px-4 py-3">Rent (UGX)</th>
                      <th className="px-4 py-3">Road Distance</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {properties.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 max-w-xs">
                          <button
                            onClick={() => onSelectProperty(p.slug || p.id)}
                            className="font-bold text-slate-900 hover:text-amber-600 truncate block text-left"
                          >
                            {p.title}
                          </button>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {p.location.neighborhood}, {p.location.cityOrTown}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="block font-bold text-slate-800">{p.landlord?.displayName}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{p.landlord?.phone}</span>
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums font-bold text-slate-900">
                          UGX {p.monthlyRentUGX.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {p.location.distanceFromMainRoadMeters}m off {p.location.mainRoadReference}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : p.status === 'PENDING_REVIEW'
                                ? 'bg-amber-50 text-amber-700 font-bold'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {p.status !== 'APPROVED' && (
                              <button
                                onClick={() => handleApproveProperty(p.id)}
                                className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                            )}
                            {p.status !== 'REJECTED' && (
                              <button
                                onClick={() => setRejectingItem({ type: 'PROPERTY', id: p.id, title: p.title })}
                                className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold"
                              >
                                Reject
                              </button>
                            )}
                            <button
                              onClick={() => onSelectProperty(p.slug || p.id)}
                              className="px-2 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-100"
                            >
                              Inspect
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: LANDLORD VERIFICATION */}
          {activeTab === 'LANDLORDS' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Landlords Identity & Ownership Queue</h3>
                <span className="text-xs text-slate-400 font-mono">{landlords.length} landlords</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Landlord Name / Business</th>
                      <th className="px-4 py-3">National ID (Masked)</th>
                      <th className="px-4 py-3">Proof Document Type</th>
                      <th className="px-4 py-3">Public Phone</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Verification Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {landlords.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 block">{l.userName || l.businessName}</span>
                          <span className="text-[11px] text-slate-400 block">{l.userEmail}</span>
                        </td>
                        <td className="px-4 py-3 font-mono">{l.nationalIdNumberMasked || 'Not provided'}</td>
                        <td className="px-4 py-3">{l.ownershipProofType || 'Standard'}</td>
                        <td className="px-4 py-3 font-mono">{l.publicContactPhone}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              l.verificationStatus === 'VERIFIED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : l.verificationStatus === 'PENDING'
                                ? 'bg-amber-50 text-amber-700 font-bold'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {l.verificationStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {l.verificationStatus !== 'VERIFIED' && (
                              <button
                                onClick={() => handleVerifyLandlord(l.id)}
                                className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                              >
                                Verify Landlord
                              </button>
                            )}
                            {l.verificationStatus !== 'REJECTED' && (
                              <button
                                onClick={() => setRejectingItem({ type: 'LANDLORD', id: l.id, title: l.businessName || l.userName })}
                                className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENT RECONCILIATION */}
          {activeTab === 'PAYMENTS' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Payment Reconciliation Ledger</h3>
                  <p className="text-xs text-slate-500">Internal Reference vs Mobile-Money Provider Transaction IDs</p>
                </div>
                <span className="text-xs text-slate-400 font-mono">{transactions.length} records</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Internal Ref</th>
                      <th className="px-4 py-3">Provider Tx ID</th>
                      <th className="px-4 py-3">Tenant</th>
                      <th className="px-4 py-3">Property</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Provider</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Completed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium font-mono text-[11px]">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-900">{tx.internalReference}</td>
                        <td className="px-4 py-3 text-slate-600">{tx.providerTransactionId || '—'}</td>
                        <td className="px-4 py-3 font-sans text-xs text-slate-800">{tx.tenantName}</td>
                        <td className="px-4 py-3 font-sans text-xs max-w-xs truncate">{tx.propertyTitle}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 tabular-nums">
                          UGX {tx.amountUGX.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{tx.provider}</td>
                        <td className="px-4 py-3 font-sans">
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
                        <td className="px-4 py-3 text-slate-400">
                          {tx.completedAt ? new Date(tx.completedAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: FRAUD REPORTS */}
          {activeTab === 'REPORTS' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Fraud & Scam Reports</h3>
                <span className="text-xs text-slate-400 font-mono">{reports.length} reports</span>
              </div>

              {reports.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">No active reports.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {reports.map(rep => (
                    <div key={rep.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 uppercase">
                            {rep.reason.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{rep.propertyTitle}</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">{rep.description}</p>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>Reported by: {rep.reporterEmail}</span>
                          <span>·</span>
                          <span>{new Date(rep.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {rep.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleUpdateReport(rep.id, 'RESOLVED')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                          >
                            Mark Resolved
                          </button>
                        )}
                        {rep.status !== 'DISMISSED' && (
                          <button
                            onClick={() => handleUpdateReport(rep.id, 'DISMISSED')}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: USERS */}
          {activeTab === 'USERS' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Registered Accounts</h3>
                <span className="text-xs text-slate-400 font-mono">{users.length} users</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Full Name</th>
                      <th className="px-4 py-3">Email Address</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-900">{u.fullName}</td>
                        <td className="px-4 py-3 text-slate-600">{u.email}</td>
                        <td className="px-4 py-3 font-mono">{u.phone}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {u.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                              u.isActive
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {u.isActive ? 'Suspend' : 'Reactivate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: SECURITY AUDIT LOGS */}
          {activeTab === 'AUDIT' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Security Audit Trail</h3>
                <span className="text-xs text-slate-400 font-mono">{auditLogs.length} events</span>
              </div>

              <div className="overflow-x-auto font-mono text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Timestamp</th>
                      <th className="px-4 py-2.5">Actor</th>
                      <th className="px-4 py-2.5">Role</th>
                      <th className="px-4 py-2.5">Action</th>
                      <th className="px-4 py-2.5">Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-2 font-bold text-slate-800">{log.actorEmail || 'System'}</td>
                        <td className="px-4 py-2 text-slate-600">{log.actorRole || 'SYSTEM'}</td>
                        <td className="px-4 py-2 text-amber-700 font-bold">{log.action}</td>
                        <td className="px-4 py-2 text-slate-600">{log.targetType}:{log.targetId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">
              Reject {rejectingItem.type === 'PROPERTY' ? 'Listing' : 'Landlord Verification'}
            </h3>
            <p className="text-xs text-slate-500">
              Target: <strong className="text-slate-800">{rejectingItem.title}</strong>
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Rejection *
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="e.g. Unclear ownership proof documents, incorrect road distance description, or photos not matching location..."
                className="w-full p-3 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleRejectPropertySubmit}
                disabled={!rejectionReason.trim()}
                className="flex-1 py-2 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
