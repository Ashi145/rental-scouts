import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { Property, LandlordProfile, LandlordRole } from '../types/index.ts';
import { ContactPrivacySettings } from '../components/landlord/ContactPrivacySettings.tsx';
import {
  Building2,
  PlusCircle,
  ShieldCheck,
  Eye,
  PhoneCall,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Upload,
  ArrowRight,
  ArrowLeft,
  X,
  Trash2,
  Check,
  Lock,
  Phone,
  Settings,
} from 'lucide-react';

interface LandlordDashboardProps {
  initialAction?: string;
  onNavigate: (view: string, param?: string) => void;
  onSelectProperty: (slugOrId: string) => void;
}

export const LandlordDashboard: React.FC<LandlordDashboardProps> = ({ initialAction, onNavigate, onSelectProperty }) => {
  const { user, landlordProfile, refreshUser } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    pendingListings: 0,
    rentedListings: 0,
    totalViews: 0,
    totalUnlocks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'LISTINGS' | 'CONTACT_PRIVACY'>('LISTINGS');

  // Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(initialAction === 'new');
  const [wizardStep, setWizardStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Property Form Data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: '2_BEDROOM',
    monthlyRentUGX: 650000,
    securityDepositUGX: 650000,
    bedrooms: 2,
    bathrooms: 2,
    squareMeters: 75,
    furnished: false,
    availableFrom: 'Immediately',
    district: 'Wakiso',
    cityOrTown: 'Kira',
    neighborhood: '',
    mainRoadReference: '',
    distanceFromMainRoadMeters: 300,
    latitude: 0.3951,
    longitude: 32.6398,
    publicDescription: '',
    amenities: ['Security Guard', 'NWSC Water', 'Dedicated Yaka Meter', 'Paved Compound'],
    images: [
      {
        id: 'img_new_1',
        propertyId: '',
        url: '/src/assets/images/property_apartment_kira_1791212350054.jpg',
        caption: 'Living room',
        isPrimary: true,
        order: 0,
      },
    ],
    videoUrl: '',
    useCustomContact: false,
    customContactName: '',
    customContactPhone: '',
    contactRole: 'PROPERTY_MANAGER' as LandlordRole,
  });

  // Verification Form State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyBusinessName, setVerifyBusinessName] = useState(landlordProfile?.businessName || '');
  const [verifyIdNumber, setVerifyIdNumber] = useState('');
  const [verifyProofType, setVerifyProofType] = useState('Land Title Document');
  const [verifyPhone, setVerifyPhone] = useState(landlordProfile?.publicContactPhone || user?.phone || '');
  const [verifyWhatsapp, setVerifyWhatsapp] = useState(true);
  const [verifyBio, setVerifyBio] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');

  const loadLandlordData = async () => {
    setLoading(true);
    try {
      const [propsRes, statsRes] = await Promise.all([
        api.landlord.properties(),
        api.landlord.stats(),
      ]);
      setProperties(propsRes.properties);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load landlord data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLandlordData();
  }, []);

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.neighborhood || !formData.monthlyRentUGX) {
      alert('Please fill out all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      await api.properties.create({
        title: formData.title,
        description: formData.description,
        propertyType: formData.propertyType as any,
        monthlyRentUGX: Number(formData.monthlyRentUGX),
        securityDepositUGX: Number(formData.securityDepositUGX),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        squareMeters: Number(formData.squareMeters),
        furnished: formData.furnished,
        availableFrom: formData.availableFrom,
        amenities: formData.amenities,
        location: {
          district: formData.district,
          cityOrTown: formData.cityOrTown,
          neighborhood: formData.neighborhood,
          mainRoadReference: formData.mainRoadReference || 'Main Tarmac Road',
          distanceFromMainRoadMeters: Number(formData.distanceFromMainRoadMeters),
          latitude: formData.latitude,
          longitude: formData.longitude,
          publicDescription: formData.publicDescription,
        },
        images: formData.images,
        video: formData.videoUrl ? { id: `vid_${Date.now()}`, propertyId: '', videoUrl: formData.videoUrl } : undefined,
        contactRole: formData.useCustomContact ? formData.contactRole : (landlordProfile?.landlordRole || 'PROPERTY_OWNER'),
        customContactPhone: formData.useCustomContact && formData.customContactPhone.trim() ? formData.customContactPhone.trim() : undefined,
        customContactName: formData.useCustomContact && formData.customContactName.trim() ? formData.customContactName.trim() : undefined,
      });

      setIsWizardOpen(false);
      setWizardStep(1);
      await loadLandlordData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to publish listing');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRented = async (property: Property) => {
    const nextStatus = property.status === 'RENTED' ? 'APPROVED' : 'RENTED';
    try {
      await api.properties.update(property.id, { status: nextStatus as any });
      await loadLandlordData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm('Are you sure you want to remove this rental listing?')) return;
    try {
      await api.properties.delete(id);
      await loadLandlordData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyMessage('');
    try {
      await api.landlord.submitVerification({
        businessName: verifyBusinessName,
        nationalIdNumber: verifyIdNumber,
        ownershipProofType: verifyProofType,
        publicContactPhone: verifyPhone,
        whatsappEnabled: verifyWhatsapp,
        bio: verifyBio,
      });
      setVerifyMessage('Verification request submitted successfully. Our team will review within 24 hours.');
      await refreshUser();
      setTimeout(() => {
        setIsVerifyModalOpen(false);
        setVerifyMessage('');
      }, 2000);
    } catch (err: unknown) {
      setVerifyMessage(err instanceof Error ? err.message : 'Verification submission failed');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Landlord Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xl shadow-xs">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {landlordProfile?.businessName || user?.fullName}
              </h1>
              {landlordProfile?.verificationStatus === 'VERIFIED' ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified Landlord
                </span>
              ) : landlordProfile?.verificationStatus === 'PENDING' ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Verification Pending Review
                </span>
              ) : (
                <button
                  onClick={() => setIsVerifyModalOpen(true)}
                  className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                >
                  Verify Your Account →
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Contact Phone: <span className="font-mono">{landlordProfile?.publicContactPhone || user?.phone}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {landlordProfile?.verificationStatus !== 'VERIFIED' && (
            <button
              onClick={() => setIsVerifyModalOpen(true)}
              className="py-2.5 px-4 rounded-xl border border-amber-300 bg-amber-50/50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors"
            >
              Get Verified Badge
            </button>
          )}

          <button
            onClick={() => {
              setIsWizardOpen(true);
              setWizardStep(1);
            }}
            className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span>Post New Property</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">Active Listings</span>
          <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">{stats.activeListings}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">Pending Approval</span>
          <span className="text-2xl font-black text-amber-600 font-mono tabular-nums">{stats.pendingListings}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">Total Property Views</span>
          <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">{stats.totalViews}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">Direct Contacts Unlocked</span>
          <span className="text-2xl font-black text-emerald-600 font-mono tabular-nums">{stats.totalUnlocks}</span>
        </div>
      </div>

      {/* Section Navigation Tabs (Requirement 11) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('LISTINGS')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'LISTINGS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4 text-amber-400" />
          <span>Property Listings ({properties.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CONTACT_PRIVACY')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'CONTACT_PRIVACY'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Lock className="w-4 h-4 text-amber-400" />
          <span>Contact & Privacy Settings</span>
          {landlordProfile?.phoneVerified ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Phone verified" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-500" title="Verification required" />
          )}
        </button>
      </div>

      {/* Active Tab View */}
      {activeTab === 'CONTACT_PRIVACY' ? (
        <ContactPrivacySettings />
      ) : (
        /* Property List Section */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Your Property Listings</h3>
            <p className="text-xs text-slate-500">Manage status, photos, and tenant inquiries</p>
          </div>
          <span className="text-xs font-semibold text-slate-400 font-mono tabular-nums">
            {properties.length} Total
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">Loading properties...</div>
        ) : properties.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-900">No properties listed yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your rental units with photos, road distance, and rent amount to start receiving verified tenant inquiries.
            </p>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="mt-2 py-2 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Post First Property
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Property</th>
                  <th className="px-5 py-3">Monthly Rent</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Views</th>
                  <th className="px-5 py-3">Unlocks</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {properties.map(prop => (
                  <tr key={prop.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 max-w-sm">
                      <div className="flex items-center gap-3">
                        <img
                          src={prop.images?.[0]?.url || '/src/assets/images/property_apartment_kira_1791212350054.jpg'}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <button
                            onClick={() => onSelectProperty(prop.slug || prop.id)}
                            className="font-bold text-slate-900 hover:text-amber-600 truncate block text-left"
                          >
                            {prop.title}
                          </button>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {prop.location.neighborhood}, {prop.location.cityOrTown} · {prop.location.distanceFromMainRoadMeters}m off {prop.location.mainRoadReference}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-slate-900 tabular-nums">
                      UGX {prop.monthlyRentUGX.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          prop.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : prop.status === 'RENTED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {prop.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-600 tabular-nums">{prop.viewCount}</td>
                    <td className="px-5 py-4 font-mono text-emerald-700 font-bold tabular-nums">
                      {prop.unlockCount || 0}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleRented(prop)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700"
                        >
                          {prop.status === 'RENTED' ? 'Mark Available' : 'Mark Rented'}
                        </button>
                        <button
                          onClick={() => onSelectProperty(prop.slug || prop.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-900"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteProperty(prop.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600"
                          title="Delete Listing"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Multi-Step Property Creation Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Post New Rental Property</h3>
                <p className="text-xs text-slate-500">Step {wizardStep} of 4: {
                  wizardStep === 1 ? 'Basic Details & Rent' :
                  wizardStep === 2 ? 'Location & Road Access' :
                  wizardStep === 3 ? 'Amenities & Features' : 'Photos & Review'
                }</p>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="p-6 space-y-6">
              {/* STEP 1: BASICS */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Property Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Modern 2 Bedroom Apartment with Balcony in Kira"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Property Type
                      </label>
                      <select
                        value={formData.propertyType}
                        onChange={e => setFormData({ ...formData, propertyType: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="1_BEDROOM">1 Bedroom</option>
                        <option value="2_BEDROOM">2 Bedroom</option>
                        <option value="3_BEDROOM">3 Bedroom</option>
                        <option value="APARTMENT">Apartment</option>
                        <option value="HOUSE">House / Townhouse</option>
                        <option value="STUDIO">Studio</option>
                        <option value="SINGLE_ROOM">Single Room</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Monthly Rent (UGX) *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.monthlyRentUGX}
                        onChange={e => setFormData({ ...formData, monthlyRentUGX: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Bedrooms</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.bedrooms}
                        onChange={e => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Bathrooms</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.bathrooms}
                        onChange={e => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Furnished?</label>
                      <select
                        value={formData.furnished ? 'yes' : 'no'}
                        onChange={e => setFormData({ ...formData, furnished: e.target.value === 'yes' })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="no">Unfurnished</option>
                        <option value="yes">Furnished</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: LOCATION & ROAD ACCESS */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        District
                      </label>
                      <select
                        value={formData.district}
                        onChange={e => setFormData({ ...formData, district: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="Wakiso">Wakiso District</option>
                        <option value="Kampala">Kampala District</option>
                        <option value="Mukono">Mukono District</option>
                        <option value="Entebbe">Entebbe Municipality</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Town / Municipality
                      </label>
                      <input
                        type="text"
                        value={formData.cityOrTown}
                        onChange={e => setFormData({ ...formData, cityOrTown: e.target.value })}
                        placeholder="e.g. Kira, Nakawa, Makindye"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Neighborhood / Zone *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.neighborhood}
                      onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                      placeholder="e.g. Kira Town (Near Police Post), Ntinda Ministers Village"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Main Tarmac Road Reference *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.mainRoadReference}
                        onChange={e => setFormData({ ...formData, mainRoadReference: e.target.value })}
                        placeholder="e.g. Kira - Kasangati Main Road"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Distance from Main Road (Meters) *
                      </label>
                      <input
                        type="number"
                        required
                        min="10"
                        value={formData.distanceFromMainRoadMeters}
                        onChange={e => setFormData({ ...formData, distanceFromMainRoadMeters: Number(e.target.value) })}
                        placeholder="e.g. 350"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Public Road Access Description
                    </label>
                    <textarea
                      rows={2}
                      value={formData.publicDescription}
                      onChange={e => setFormData({ ...formData, publicDescription: e.target.value })}
                      placeholder="e.g. Located on a well-graded murram road with solar streetlights, 3 mins walk from taxi stage."
                      className="w-full p-2.5 text-xs rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: AMENITIES & DESCRIPTION */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Property Description *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the rooms, kitchen finishes, water reserve tanks, security features, neighborhood quietness..."
                      className="w-full p-3 text-xs rounded-lg border border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Key Amenities
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        'Security Guard 24/7',
                        'NWSC Water + Overhead Tank',
                        'Dedicated Umeme Yaka Meter',
                        'Paved Compound',
                        'CCTV Cameras in Common Areas',
                        'Balcony with Scenic View',
                        'In-built Wardrobes',
                        'Ample Vehicle Parking',
                        'Fiber Internet Ready',
                        'Perimeter Wall & Electric Fence',
                      ].map(amenity => {
                        const checked = formData.amenities.includes(amenity);
                        return (
                          <label key={amenity} className="flex items-center gap-2 text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? formData.amenities.filter(a => a !== amenity)
                                  : [...formData.amenities, amenity];
                                setFormData({ ...formData, amenities: next });
                              }}
                              className="rounded text-amber-600 focus:ring-amber-500"
                            />
                            <span>{amenity}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: PHOTOS & SUBMIT */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Property Photos
                    </label>
                    <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2 bg-slate-50">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-600 font-medium">
                        Standard property images attached for this preview
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Supports high-resolution JPG, PNG, and WebP up to 10MB each.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Virtual Video Tour URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={formData.videoUrl}
                      onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                    />
                  </div>

                  {/* Summary Review & Live Card Preview */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Live Tenant Card Preview
                    </label>
                    <div className="max-w-sm mx-auto bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <div className="aspect-[4/3] bg-slate-100 relative">
                        <img
                          src={formData.images[0]?.url || '/src/assets/images/property_apartment_kira_1791212350054.jpg'}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-900/90 text-amber-400">
                          Preview
                        </div>
                      </div>
                      <div className="p-3.5 space-y-1 text-left">
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span className="font-semibold text-slate-700">{formData.propertyType.replace(/_/g, ' ')}</span>
                          <span>·</span>
                          <span>{formData.bedrooms} Beds</span>
                          <span>·</span>
                          <span>{formData.bathrooms} Baths</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {formData.title || 'Property Title Here'}
                        </h4>
                        <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                          <span>{formData.distanceFromMainRoadMeters}m off {formData.mainRoadReference || 'Main Road'}</span>
                        </p>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Rent</span>
                            <span className="font-bold text-slate-900 font-mono">
                              UGX {Number(formData.monthlyRentUGX || 0).toLocaleString()}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700">
                            {landlordProfile?.verificationStatus === 'VERIFIED' ? '✓ Verified Landlord' : 'Direct Landlord'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Footer Nav */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                ) : (
                  <div />
                )}

                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep + 1)}
                    className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Submitting Property...' : 'Publish Property Listing'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Landlord Verification Modal */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Landlord Verification Request</h3>
              </div>
              <button onClick={() => setIsVerifyModalOpen(false)} className="p-1 rounded text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVerification} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Verified landlords receive a <strong className="text-slate-900">✓ Verified Landlord</strong> badge on all listings, inspiring higher tenant trust and more direct contact unlocks.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Business / Trading Name (Optional)
                </label>
                <input
                  type="text"
                  value={verifyBusinessName}
                  onChange={e => setVerifyBusinessName(e.target.value)}
                  placeholder="e.g. Kasule Prime Properties Ltd"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  National ID (NIN) Number *
                </label>
                <input
                  type="text"
                  required
                  value={verifyIdNumber}
                  onChange={e => setVerifyIdNumber(e.target.value)}
                  placeholder="e.g. CM89012345678K"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Stored securely with server-side masking.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ownership Proof Document Type *
                </label>
                <select
                  value={verifyProofType}
                  onChange={e => setVerifyProofType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  <option value="Land Title Document">Land Title Document</option>
                  <option value="Mailo Land Agreement">Mailo Land Sales Agreement</option>
                  <option value="LC1 Recommendation Letter">Local Council (LC1) Letter of Property Ownership</option>
                  <option value="Power of Attorney / Property Management Mandate">Property Management Mandate</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={verifyPhone}
                    onChange={e => setVerifyPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    WhatsApp Available?
                  </label>
                  <select
                    value={verifyWhatsapp ? 'yes' : 'no'}
                    onChange={e => setVerifyWhatsapp(e.target.value === 'yes')}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="yes">Yes, enable WhatsApp</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Brief Bio / Profile Description
                </label>
                <textarea
                  rows={2}
                  value={verifyBio}
                  onChange={e => setVerifyBio(e.target.value)}
                  placeholder="e.g. Providing residential housing in Wakiso and Kampala since 2018."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200"
                />
              </div>

              {verifyMessage && (
                <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200">
                  {verifyMessage}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={verifyLoading}
                  className="flex-1 py-2.5 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {verifyLoading ? 'Submitting...' : 'Submit Verification'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
