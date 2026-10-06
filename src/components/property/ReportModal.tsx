import React, { useState } from 'react';
import { Property } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { X, ShieldAlert, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ReportModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ property, isOpen, onClose }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('FAKE_LISTING');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in to submit a listing report.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide details explaining the issue.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.reports.create({
        propertyId: property.id,
        reason,
        description,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-600">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900">Report Listing</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-900">Report Submitted</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Thank you for helping keep Rental Scout safe. Our trust & safety team investigates every report.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-500">
                Reporting: <strong className="text-slate-800">{property.title}</strong>
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for Report
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="FAKE_LISTING">Fake property or non-existent listing</option>
                  <option value="INCORRECT_LOCATION">Incorrect road distance or false location</option>
                  <option value="WRONG_PRICE">Wrong price or hidden fees demanded</option>
                  <option value="FRAUDULENT_LANDLORD">Suspected fraudulent landlord / imposter</option>
                  <option value="ALREADY_RENTED">Property is already occupied / rented out</option>
                  <option value="SUSPICIOUS_BEHAVIOR">Demanding payment before physical inspection</option>
                  <option value="OTHER">Other safety or policy concern</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Detailed Explanation
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe what occurred, who you spoke with, or discrepancies found..."
                  className="w-full p-3 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {error && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Fraud Report'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
