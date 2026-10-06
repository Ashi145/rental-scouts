import React, { useState, useEffect } from 'react';
import { Property } from '../types/index.ts';
import { api } from '../services/api.ts';
import { PropertyCard } from '../components/property/PropertyCard.tsx';
import {
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  RecentSearch,
} from '../utils/recentSearches.ts';
import {
  Search,
  MapPin,
  Home,
  ShieldCheck,
  PhoneCall,
  Navigation,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Building,
  History,
  X,
  RotateCcw,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (view: string, param?: string) => void;
  onSelectProperty: (slugOrId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectProperty }) => {
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Search Bar Form State
  const [district, setDistrict] = useState('ALL');
  const [propertyType, setPropertyType] = useState('ALL');
  const [maxRent, setMaxRent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load local recent searches for returning users
    setRecentSearches(getRecentSearches());

    const fetchHomes = async () => {
      try {
        const res = await api.properties.list();
        const feat = res.properties.filter(p => p.isFeatured).slice(0, 3);
        setFeaturedProperties(feat.length > 0 ? feat : res.properties.slice(0, 3));
        setRecentProperties(res.properties.slice(0, 6));
      } catch (err) {
        console.error('Failed to load homepage properties', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHomes();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Save to local state for returning user tracking
    const updated = saveRecentSearch({
      query: searchQuery,
      district,
      propertyType,
      maxRent,
    });
    setRecentSearches(updated);

    const params = new URLSearchParams();
    if (district !== 'ALL') params.set('district', district);
    if (propertyType !== 'ALL') params.set('propertyType', propertyType);
    if (maxRent) params.set('maxRent', maxRent);
    if (searchQuery) params.set('q', searchQuery);
    onNavigate('search', params.toString());
  };

  const handleResumeRecentSearch = (item: RecentSearch) => {
    const params = new URLSearchParams();
    if (item.district && item.district !== 'ALL') params.set('district', item.district);
    if (item.propertyType && item.propertyType !== 'ALL') params.set('propertyType', item.propertyType);
    if (item.maxRent) params.set('maxRent', item.maxRent);
    if (item.query) params.set('q', item.query);
    onNavigate('search', params.toString());
  };

  const handleRemoveRecentSearch = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = removeRecentSearch(id);
    setRecentSearches(updated);
  };

  const handleClearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentSearches();
    setRecentSearches([]);
  };

  const popularLocations = [
    { name: 'Kira', district: 'Wakiso', count: '142 rentals', image: '/src/assets/images/property_apartment_kira_1791212350054.jpg' },
    { name: 'Ntinda', district: 'Kampala', count: '98 rentals', image: '/src/assets/images/property_studio_ntinda_1791212372657.jpg' },
    { name: 'Naalya', district: 'Wakiso', count: '84 rentals', image: '/src/assets/images/property_house_naalya_1791212362283.jpg' },
    { name: 'Kololo', district: 'Kampala', count: '56 rentals', image: '/src/assets/images/hero_rental_kampala_1791212335872.jpg' },
    { name: 'Entebbe', district: 'Wakiso', count: '64 rentals', image: '/src/assets/images/hero_rental_kampala_1791212335872.jpg' },
  ];

  return (
    <div className="space-y-20 pb-16">
      {/* 1. Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-slate-900 text-white">
        {/* Background Image Scrim */}
        <div className="absolute inset-0 z-0 opacity-25">
          <img
            src="/src/assets/images/hero_rental_kampala_1791212335872.jpg"
            alt="Kampala Residential Homes"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent z-0" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-amber-400 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Uganda&apos;s Direct Landlord Marketplace</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-sans text-white text-balance max-w-4xl mx-auto">
            Find your next home without the hassle.
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed text-balance">
            Search rental houses across Uganda, inspect verified interior photos, see road distance, and connect directly with landlords for only <strong className="text-amber-400">UGX 5,000</strong>.
          </p>

          {/* Search Card Container */}
          <div className="pt-4 max-w-4xl mx-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white text-slate-900 p-4 sm:p-5 rounded-2xl shadow-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left"
            >
              {/* Location */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Location / Area
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="e.g. Kira, Ntinda, Naalya..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Property Type
                </label>
                <select
                  value={propertyType}
                  onChange={e => setPropertyType(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ALL">All Types</option>
                  <option value="1_BEDROOM">1 Bedroom</option>
                  <option value="2_BEDROOM">2 Bedroom</option>
                  <option value="3_BEDROOM">3 Bedroom</option>
                  <option value="APARTMENT">Apartment</option>
                  <option value="HOUSE">House / Townhouse</option>
                  <option value="STUDIO">Studio</option>
                  <option value="SINGLE_ROOM">Single Room</option>
                </select>
              </div>

              {/* Maximum Rent */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Max Monthly Rent
                </label>
                <select
                  value={maxRent}
                  onChange={e => setMaxRent(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Any Price</option>
                  <option value="400000">Up to UGX 400,000</option>
                  <option value="700000">Up to UGX 700,000</option>
                  <option value="1200000">Up to UGX 1,200,000</option>
                  <option value="2000000">Up to UGX 2,000,000</option>
                  <option value="3500000">Up to UGX 3,500,000</option>
                </select>
              </div>

              {/* Submit CTA */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Search Rentals</span>
                </button>
              </div>
            </form>

            {/* Recent Searches for Returning Users (Lightweight & Performance-focused Local State) */}
            {recentSearches.length > 0 && (
              <div className="mt-4 pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase tracking-wider shrink-0 mr-1">
                  <History className="w-3.5 h-3.5" />
                  <span>Recent Searches:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {recentSearches.map(item => (
                    <div
                      key={item.id}
                      className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-all text-xs shadow-xs"
                    >
                      <button
                        type="button"
                        onClick={() => handleResumeRecentSearch(item)}
                        className="hover:text-amber-400 transition-colors font-medium cursor-pointer text-left"
                        title="Click to resume this search"
                      >
                        {item.label}
                      </button>
                      <button
                        type="button"
                        onClick={e => handleRemoveRecentSearch(e, item.id)}
                        className="text-slate-400 hover:text-rose-400 transition-colors p-0.5 rounded cursor-pointer"
                        title="Remove from history"
                        aria-label="Remove search"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleClearAllRecent}
                    className="text-[11px] text-slate-400 hover:text-slate-200 font-semibold underline underline-offset-2 ml-1 cursor-pointer transition-colors"
                  >
                    Clear history
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Trust Highlights */}
          <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-300 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Verified Landlords</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Navigation className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Main Road Distance</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <PhoneCall className="w-4 h-4 text-blue-400 shrink-0" />
              <span>No Broker Fees</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Secure UGX 5k Unlock</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Popular Neighborhoods */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Popular Uganda Locations</h2>
            <p className="text-xs text-slate-500 mt-1">High-demand residential areas with verified listings</p>
          </div>
          <button
            onClick={() => onNavigate('search')}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <span>View All Areas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {popularLocations.map(loc => (
            <button
              key={loc.name}
              onClick={() => onNavigate('search', loc.name)}
              className="group relative rounded-xl overflow-hidden aspect-[4/3] bg-slate-900 text-left border border-slate-200 transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer"
            >
              <img
                src={loc.image}
                alt={loc.name}
                className="w-full h-full object-cover opacity-75 group-hover:scale-105 group-hover:opacity-90 transition-all duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="text-[11px] text-slate-300 uppercase tracking-wider block font-medium">
                  {loc.district}
                </span>
                <span className="text-base font-bold text-white block group-hover:text-amber-400 transition-colors">
                  {loc.name}
                </span>
                <span className="text-[11px] text-slate-300 font-mono tabular-nums">
                  {loc.count}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Featured Properties Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hand-Picked & Verified</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Featured Rental Homes</h2>
          </div>
          <button
            onClick={() => onNavigate('search')}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
          >
            <span>See all rentals</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-[4/5] bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredProperties.map(prop => (
              <PropertyCard
                key={prop.id}
                property={prop}
                onSelect={onSelectProperty}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. How Rental Scout Works (Editorial Sequence) */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              How Rental Scout Works
            </h2>
            <p className="text-xs text-slate-500">
              Stop wandering through dusty neighborhoods or paying expensive 1-month agent commission fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
              <span className="text-amber-600 font-extrabold text-sm font-mono">01.</span>
              <h3 className="text-base font-bold text-slate-900">Explore Distance & Photos</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Filter by neighborhood, price, bedrooms, and exact distance from the main tarmac road. View authentic interior photos and video walkthroughs before stepping outside.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
              <span className="text-amber-600 font-extrabold text-sm font-mono">02.</span>
              <h3 className="text-base font-bold text-slate-900">Unlock Direct Landlord Contact</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pay a small fee of <strong className="text-slate-900">UGX 5,000</strong> via MTN MoMo or Airtel Money. Our backend instantly confirms the transaction and reveals the verified property owner’s direct phone and WhatsApp.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
              <span className="text-amber-600 font-extrabold text-sm font-mono">03.</span>
              <h3 className="text-base font-bold text-slate-900">Inspect & Finalize Lease</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Call or message the landlord directly, arrange a physical viewing of the property, verify documents, and negotiate terms directly without broker intermediaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Recently Added Properties */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Recently Added Rentals</h2>
            <p className="text-xs text-slate-500 mt-1">Fresh verified rental listings in Kampala, Wakiso, and Entebbe</p>
          </div>
          <button
            onClick={() => onNavigate('search')}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <span>Explore All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentProperties.map(prop => (
            <PropertyCard
              key={prop.id}
              property={prop}
              onSelect={onSelectProperty}
            />
          ))}
        </div>
      </section>

      {/* 6. Landlord Call to Action */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-950 text-white rounded-2xl p-8 sm:p-12 relative overflow-hidden border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">For Property Owners & Landlords</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Have rental houses or apartments in Uganda?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              List your property on Rental Scout for free. Reach serious, verified tenants actively searching in your neighborhood without giving up weeks of rent to broker middlemen.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => onNavigate('landlord-dashboard', 'new')}
              className="py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm transition-colors text-center cursor-pointer shadow-md"
            >
              List Your Property
            </button>
            <button
              onClick={() => onNavigate('safety')}
              className="py-3 px-5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-900 font-semibold text-xs sm:text-sm transition-colors text-center cursor-pointer"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
