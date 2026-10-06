import React, { useState, useEffect } from 'react';
import { Property } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../../src/context/AuthContext.tsx';
import { PropertyGallery } from '../components/property/PropertyGallery.tsx';
import { PropertyMap } from '../components/property/PropertyMap.tsx';
import { UnlockModal } from '../components/property/UnlockModal.tsx';
import { ReportModal } from '../components/property/ReportModal.tsx';
import { Breadcrumbs } from '../components/common/Breadcrumbs.tsx';
import {
  MapPin,
  Lock,
  Phone,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Share2,
  Heart,
  Flag,
  Video,
  Check,
  Building2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface PropertyDetailPageProps {
  slugOrId: string;
  onNavigate: (view: string, param?: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const PropertyDetailPage: React.FC<PropertyDetailPageProps> = ({ slugOrId, onNavigate, onOpenAuth }) => {
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMediaTab, setActiveMediaTab] = useState<'PHOTOS' | 'VIDEO'>('PHOTOS');
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const fetchProperty = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.properties.get(slugOrId);
      setProperty(res.property);
      setIsFavorite(!!res.property.isFavorite);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Property not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperty();
  }, [slugOrId]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      onOpenAuth('login');
      return;
    }
    if (!property) return;
    try {
      await api.properties.toggleFavorite(property.id, isFavorite);
      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error(err);
    }
  };

  const handleContactUnlocked = (contact: { phone: string; name: string; whatsappEnabled: boolean }) => {
    if (property) {
      setProperty({
        ...property,
        contactUnlocked: true,
        landlordContact: contact,
      });
    }
  };

  const handleUnlockClick = () => {
    if (!user) {
      onOpenAuth('login');
      return;
    }
    setUnlockModalOpen(true);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded" />
        <div className="h-10 w-3/4 bg-slate-200 rounded" />
        <div className="aspect-[16/9] w-full bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Property Unavailable</h2>
        <p className="text-xs text-slate-500">
          This rental listing is no longer available or is currently pending moderator review.
        </p>
        <button
          onClick={() => onNavigate('search')}
          className="px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
        >
          Return to Search
        </button>
      </div>
    );
  }

  const formatPropertyType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-28 md:pb-12">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: 'Rentals', view: 'search' },
          { label: property.location.district, view: 'search', param: property.location.district },
          { label: property.location.neighborhood, view: 'search', param: property.location.neighborhood },
          { label: property.title },
        ]}
        onNavigate={onNavigate}
      />

      {/* Title & Header Bar */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-800">{formatPropertyType(property.propertyType)}</span>
            <span aria-hidden="true">·</span>
            <span>{property.location.neighborhood}, {property.location.cityOrTown}</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-700 font-semibold">{property.location.distanceFromMainRoadMeters}m off {property.location.mainRoadReference}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
            {property.title}
          </h1>

          <p className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{property.location.district} District, Uganda</span>
          </p>
        </div>

        {/* Actions (Share & Save) */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={handleShare}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
            title="Share property link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{copiedLink ? 'Link Copied!' : 'Share'}</span>
          </button>

          <button
            onClick={handleToggleFavorite}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isFavorite
                ? 'border-rose-300 bg-rose-50 text-rose-600'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">{isFavorite ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Media & Details, Right Contiguous Purchase Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Media Gallery, Tour, Details, Getting There */}
        <div className="lg:col-span-8 space-y-8">
          {/* Media Tabs (Photos vs Virtual Video Tour) */}
          <div className="space-y-3">
            {property.video && (
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setActiveMediaTab('PHOTOS')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    activeMediaTab === 'PHOTOS'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Property Photos ({property.images?.length || 0})
                </button>
                <button
                  onClick={() => setActiveMediaTab('VIDEO')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeMediaTab === 'VIDEO'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Virtual Video Tour</span>
                </button>
              </div>
            )}

            {activeMediaTab === 'PHOTOS' ? (
              <PropertyGallery images={property.images} title={property.title} />
            ) : (
              <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                <video
                  controls
                  className="w-full h-full object-contain"
                  src={property.video?.videoUrl}
                  poster={property.video?.thumbnailUrl || property.images?.[0]?.url}
                >
                  Your browser does not support the video tour tag.
                </video>
              </div>
            )}
          </div>

          {/* Quick Specs Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Bedrooms</span>
              <span className="font-bold text-slate-900 text-sm">{property.bedrooms} {property.bedrooms === 1 ? 'Bed' : 'Beds'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Bathrooms</span>
              <span className="font-bold text-slate-900 text-sm">{property.bathrooms} {property.bathrooms === 1 ? 'Bath' : 'Baths'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Furnished</span>
              <span className="font-bold text-slate-900 text-sm">{property.furnished ? 'Yes' : 'Unfurnished'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Availability</span>
              <span className="font-bold text-emerald-700 text-sm">{property.availableFrom || 'Immediate'}</span>
            </div>
          </div>

          {/* Description Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">About this property</h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {property.description}
            </p>
          </div>

          {/* Amenities Checklist */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Amenities & Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {property.amenities.map((amenity, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Getting There & Road Accessibility */}
          <PropertyMap location={property.location} />

          {/* Report Listing Trigger */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Listing ID: <code className="font-mono text-slate-700">{property.id}</code></span>
            <button
              onClick={() => setReportModalOpen(true)}
              className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report suspicious listing</span>
            </button>
          </div>
        </div>

        {/* Right Column (4 cols): Contiguous Purchase & Landlord Contact Module */}
        <div className="lg:col-span-4 sticky top-24 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-5">
            {/* Rent Pricing Header */}
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs text-slate-500 block">Monthly Rent</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono tabular-nums">
                  UGX {property.monthlyRentUGX.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 font-medium">/ month</span>
              </div>
              {property.securityDepositUGX && (
                <p className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
                  Security deposit: UGX {property.securityDepositUGX.toLocaleString()}
                </p>
              )}
            </div>

            {/* Landlord Trust Badge */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                {property.landlord?.displayName?.charAt(0) || 'L'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {property.landlord?.displayName}
                  </span>
                  {property.landlord?.isVerified && (
                    <span title="Verified Landlord">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 block truncate">
                  {property.landlord?.isVerified ? 'Verified Property Owner' : 'Direct Landlord Listing'}
                </span>
              </div>
            </div>

            {/* Unlock Status / State */}
            {property.contactUnlocked && property.landlordContact ? (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-950">Landlord Contact</h4>
                      <p className="text-[11px] text-emerald-800 font-medium">Direct contact verified & unlocked</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-200">
                    {property.landlordContact.role?.replace(/_/g, ' ') || 'Property Owner'}
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      {property.landlordContact.name || 'Landlord / Property Manager'}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold">Verified</span>
                  </div>
                  {property.landlordContact.phone ? (
                    <a
                      href={`tel:${property.landlordContact.phone}`}
                      className="text-lg font-black text-slate-950 font-mono tracking-wider hover:text-amber-600 transition-colors block"
                    >
                      {property.landlordContact.phone}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500">Contact temporarily unavailable</span>
                  )}
                </div>

                {/* Exclusively Option 1 (Phone Call) and Option 2 (WhatsApp) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {property.landlordContact.phone && (
                    <a
                      href={`tel:${property.landlordContact.phone}`}
                      className="py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                      <Phone className="w-4 h-4 text-amber-400" />
                      <span>Call Landlord</span>
                    </a>
                  )}

                  {property.landlordContact.whatsappEnabled !== false && (property.landlordContact.whatsappUrl || property.landlordContact.phone) && (
                    <a
                      href={
                        property.landlordContact.whatsappUrl ||
                        `https://wa.me/${property.landlordContact.phone?.replace(/[^0-9]/g, '') || ''}?text=${encodeURIComponent(
                          `Hello, I am interested in your property "${property.title}" on Rental Scout.`
                        )}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>WhatsApp Landlord</span>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 text-left space-y-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-bold text-slate-900">Contact Landlord</h4>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Direct contact information is protected.
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Direct phone & WhatsApp are protected from broker scraping. Pay a one-time fee to reveal direct owner contact.
                  </p>
                </div>

                <button
                  onClick={handleUnlockClick}
                  className="w-full py-3.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Unlock Contact — UGX 5,000</span>
                </button>

                <p className="text-[11px] text-center text-slate-400 font-medium">
                  Instant unlock via MTN MoMo (*165#) or Airtel Money (*185#). Never pay double.
                </p>
              </div>
            )}

            {/* Safety Reminder */}
            <div className="border-t border-slate-100 pt-4 text-[11px] text-slate-500 space-y-1">
              <strong className="text-slate-700 block">Tenant Safety Tip:</strong>
              <p>
                Always view the rental in person and meet the landlord or caretaker before paying advance rent or deposits.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action for Mobile (Requirement #36: under 15% mobile viewport cap) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Monthly Rent</span>
            <span className="text-base font-extrabold text-slate-950 font-mono tabular-nums">
              UGX {property.monthlyRentUGX.toLocaleString()}
            </span>
          </div>

          {property.contactUnlocked && property.landlordContact ? (
            <div className="flex items-center gap-2">
              {property.landlordContact.phone && (
                <a
                  href={`tel:${property.landlordContact.phone}`}
                  className="py-2.5 px-3 rounded-xl bg-slate-950 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Call Landlord</span>
                </a>
              )}
              {property.landlordContact.whatsappEnabled !== false && (property.landlordContact.whatsappUrl || property.landlordContact.phone) && (
                <a
                  href={
                    property.landlordContact.whatsappUrl ||
                    `https://wa.me/${property.landlordContact.phone?.replace(/[^0-9]/g, '') || ''}?text=${encodeURIComponent(
                      `Hello, I am interested in your property "${property.title}" on Rental Scout.`
                    )}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp Landlord</span>
                </a>
              )}
            </div>
          ) : (
            <button
              onClick={handleUnlockClick}
              className="py-2.5 px-4 rounded-xl bg-slate-950 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Unlock — UGX 5,000</span>
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      <UnlockModal
        property={property}
        isOpen={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        onUnlocked={handleContactUnlocked}
      />

      <ReportModal
        property={property}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
};
