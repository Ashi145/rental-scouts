import React, { useState, useEffect } from 'react';
import { Property } from '../types/index.ts';
import { api } from '../services/api.ts';
import { PropertyCard } from '../components/property/PropertyCard.tsx';
import { PropertyCompareModal } from '../components/property/PropertyCompareModal.tsx';
import { Breadcrumbs } from '../components/common/Breadcrumbs.tsx';
import { saveRecentSearch } from '../utils/recentSearches.ts';
import {
  Search,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  ArrowUpDown,
  Navigation,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Layers,
  MapPin,
  Scale,
  X,
} from 'lucide-react';

interface SearchPageProps {
  initialSearchQuery?: string;
  onNavigate: (view: string, param?: string) => void;
  onSelectProperty: (slugOrId: string) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ initialSearchQuery = '', onNavigate, onSelectProperty }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [district, setDistrict] = useState('ALL');
  const [propertyType, setPropertyType] = useState('ALL');
  const [minRent, setMinRent] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [sort, setSort] = useState('newest');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [maxRoadDistance, setMaxRoadDistance] = useState<number | null>(null);

  // Comparison State
  const [compareList, setCompareList] = useState<Property[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // View Mode: 'GRID' or 'MAP_FOCUS'
  const [viewMode, setViewMode] = useState<'GRID' | 'MAP_FOCUS'>('GRID');

  // Parse initial query params if passed as string
  useEffect(() => {
    if (initialSearchQuery) {
      if (initialSearchQuery.includes('=')) {
        const params = new URLSearchParams(initialSearchQuery);
        if (params.get('q')) setSearchQuery(params.get('q')!);
        if (params.get('district')) setDistrict(params.get('district')!);
        if (params.get('propertyType')) setPropertyType(params.get('propertyType')!);
        if (params.get('maxRent')) setMaxRent(params.get('maxRent')!);
      } else {
        setSearchQuery(initialSearchQuery);
      }
    }
  }, [initialSearchQuery]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const res = await api.properties.list({
        q: searchQuery,
        district: district !== 'ALL' ? district : undefined,
        propertyType: propertyType !== 'ALL' ? propertyType : undefined,
        minRent: minRent ? Number(minRent) : undefined,
        maxRent: maxRent ? Number(maxRent) : undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        sort,
      });

      let list = res.properties;
      if (onlyVerified) {
        list = list.filter(p => p.landlord?.isVerified);
      }
      if (maxRoadDistance !== null) {
        list = list.filter(p => p.location.distanceFromMainRoadMeters <= maxRoadDistance);
      }

      setProperties(list);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, [district, propertyType, minRent, maxRent, bedrooms, sort, onlyVerified, maxRoadDistance]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() || district !== 'ALL' || propertyType !== 'ALL' || maxRent) {
      saveRecentSearch({
        query: searchQuery,
        district,
        propertyType,
        maxRent,
      });
    }
    loadProperties();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDistrict('ALL');
    setPropertyType('ALL');
    setMinRent('');
    setMaxRent('');
    setBedrooms('');
    setSort('newest');
    setOnlyVerified(false);
    setMaxRoadDistance(null);
  };

  const toggleCompare = (prop: Property) => {
    if (compareList.find(p => p.id === prop.id)) {
      setCompareList(prev => prev.filter(p => p.id !== prop.id));
    } else {
      if (compareList.length >= 3) {
        alert('You can compare up to 3 properties at a time.');
        return;
      }
      setCompareList(prev => [...prev, prop]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-28 md:pb-16">
      <Breadcrumbs
        items={[{ label: 'Search Rentals', view: 'search' }]}
        onNavigate={onNavigate}
      />

      {/* Header & Main Search Input */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-sans">
              Search Rental Properties in Uganda
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Find verified rental houses, view road access distance, and connect directly with landlords
            </p>
          </div>

          {/* Quick Sort & View Mode Switcher */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* View Mode */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setViewMode('GRID')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  viewMode === 'GRID' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode('MAP_FOCUS')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  viewMode === 'MAP_FOCUS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Neighborhood Focus
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="newest">Newest First</option>
                <option value="lowest_rent">Lowest Rent</option>
                <option value="highest_rent">Highest Rent</option>
                <option value="closest_road">Closest to Main Road</option>
                <option value="featured">Featured First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <Search className="w-5 h-5 text-slate-400 absolute left-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by neighborhood, street, or landmark (e.g. Kira Town, Ntinda, Naalya, Kololo, Entebbe...)"
            className="w-full pl-12 pr-28 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
          />
          <button
            type="submit"
            className="absolute right-2.5 px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Quick Filter Presets (Buttons matching Universal Design Constitution) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider shrink-0 mr-1">
            Quick Filters:
          </span>

          <button
            onClick={() => setMaxRent(maxRent === '700000' ? '' : '700000')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors border ${
              maxRent === '700000'
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            Under UGX 700k
          </button>

          <button
            onClick={() => setMaxRent(maxRent === '1500000' ? '' : '1500000')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors border ${
              maxRent === '1500000'
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            Under UGX 1.5M
          </button>

          <button
            onClick={() => setMaxRoadDistance(maxRoadDistance === 300 ? null : 300)}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors border flex items-center gap-1.5 ${
              maxRoadDistance === 300
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Navigation className="w-3 h-3" />
            <span>&lt; 300m to Main Road</span>
          </button>

          <button
            onClick={() => setOnlyVerified(!onlyVerified)}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors border flex items-center gap-1.5 ${
              onlyVerified
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Landlords Only</span>
          </button>

          <button
            onClick={() => setDistrict(district === 'Wakiso' ? 'ALL' : 'Wakiso')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors border ${
              district === 'Wakiso'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            Wakiso (Kira / Naalya)
          </button>

          <button
            onClick={() => setDistrict(district === 'Kampala' ? 'ALL' : 'Kampala')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors border ${
              district === 'Kampala'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            Kampala (Ntinda / Kololo)
          </button>
        </div>
      </div>

      {/* Main Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <SlidersHorizontal className="w-4 h-4 text-amber-600" />
            <span>Advanced Filters</span>
          </div>

          {(district !== 'ALL' || propertyType !== 'ALL' || minRent || maxRent || bedrooms || searchQuery || onlyVerified || maxRoadDistance !== null) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset all filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          {/* District */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              District / Area
            </label>
            <select
              value={district}
              onChange={e => setDistrict(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Districts</option>
              <option value="Wakiso">Wakiso (Kira, Naalya, Nansana)</option>
              <option value="Kampala">Kampala (Ntinda, Kololo, Bukoto)</option>
              <option value="Mukono">Mukono Municipality</option>
              <option value="Entebbe">Entebbe Municipality</option>
            </select>
          </div>

          {/* Property Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Property Type
            </label>
            <select
              value={propertyType}
              onChange={e => setPropertyType(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Types</option>
              <option value="SINGLE_ROOM">Single Room</option>
              <option value="STUDIO">Studio</option>
              <option value="1_BEDROOM">1 Bedroom</option>
              <option value="2_BEDROOM">2 Bedroom</option>
              <option value="3_BEDROOM">3 Bedroom</option>
              <option value="APARTMENT">Apartment</option>
              <option value="HOUSE">House / Townhouse</option>
            </select>
          </div>

          {/* Min Rent */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Min Rent (UGX)
            </label>
            <select
              value={minRent}
              onChange={e => setMinRent(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">No Min</option>
              <option value="300000">UGX 300,000</option>
              <option value="500000">UGX 500,000</option>
              <option value="800000">UGX 800,000</option>
              <option value="1500000">UGX 1,500,000</option>
            </select>
          </div>

          {/* Max Rent */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Max Rent (UGX)
            </label>
            <select
              value={maxRent}
              onChange={e => setMaxRent(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">No Max</option>
              <option value="500000">UGX 500,000</option>
              <option value="800000">UGX 800,000</option>
              <option value="1500000">UGX 1,500,000</option>
              <option value="2500000">UGX 2,500,000</option>
              <option value="4000000">UGX 4,000,000</option>
            </select>
          </div>

          {/* Bedrooms */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Bedrooms
            </label>
            <select
              value={bedrooms}
              onChange={e => setBedrooms(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Any Beds</option>
              <option value="1">1+ Bedrooms</option>
              <option value="2">2+ Bedrooms</option>
              <option value="3">3+ Bedrooms</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-slate-600 font-mono tabular-nums">
            Showing {properties.length} {properties.length === 1 ? 'rental' : 'rentals'}
          </span>

          <span className="text-xs text-slate-400">
            {compareList.length > 0 && `${compareList.length} selected for comparison`}
          </span>
        </div>

        {/* View Mode 1: GRID */}
        {viewMode === 'GRID' && (
          <>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="aspect-[4/5] bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : properties.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">No properties matched your criteria</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Try widening your price range, clearing specific filters, or checking back soon as new properties are added daily.
                  </p>
                </div>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map(property => {
                  const isCompared = !!compareList.find(p => p.id === property.id);
                  return (
                    <div key={property.id} className="relative group">
                      <PropertyCard
                        property={property}
                        onSelect={onSelectProperty}
                      />
                      {/* Compare Checkbox Affordance */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCompare(property);
                        }}
                        className={`absolute bottom-3 right-3 text-[11px] font-bold px-2 py-1 rounded-md transition-colors shadow-xs flex items-center gap-1 z-10 ${
                          isCompared
                            ? 'bg-slate-900 text-amber-400'
                            : 'bg-white/90 text-slate-600 hover:bg-white hover:text-slate-950 border border-slate-200'
                        }`}
                      >
                        <Scale className="w-3 h-3" />
                        <span>{isCompared ? 'Comparing' : 'Compare'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* View Mode 2: NEIGHBORHOOD / MAP FOCUS */}
        {viewMode === 'MAP_FOCUS' && (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden border border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Uganda Neighborhood Corridors</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Visualizing accessibility distance from primary tarmac transport routes in Wakiso and Kampala
                  </p>
                </div>
                <span className="text-xs font-mono text-amber-400">
                  {properties.length} Active Listings in Corridor
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {properties.map(prop => (
                <div
                  key={prop.id}
                  onClick={() => onSelectProperty(prop.slug || prop.id)}
                  className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex gap-4"
                >
                  <img
                    src={prop.images?.[0]?.url || '/src/assets/images/property_apartment_kira_1791212350054.jpg'}
                    alt={prop.title}
                    className="w-28 h-28 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center gap-1 text-[11px] text-amber-700 font-bold mb-0.5">
                        <Navigation className="w-3 h-3" />
                        <span>{prop.location.distanceFromMainRoadMeters}m off {prop.location.mainRoadReference}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 truncate hover:text-amber-600">
                        {prop.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {prop.location.neighborhood}, {prop.location.cityOrTown}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="font-mono font-extrabold text-slate-950 text-sm tabular-nums">
                        UGX {prop.monthlyRentUGX.toLocaleString()}
                      </span>
                      {prop.landlord?.isVerified && (
                        <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Comparison Dock (Appears when >= 1 properties selected) */}
      {compareList.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold font-mono">
              {compareList.length} / 3 Selected
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            {compareList.map(item => (
              <span key={item.id} className="text-[11px] bg-slate-800 px-2 py-0.5 rounded max-w-[120px] truncate text-slate-300">
                {item.title}
              </span>
            ))}
          </div>

          <button
            onClick={() => setIsCompareOpen(true)}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition-colors cursor-pointer"
          >
            Compare Side-by-Side
          </button>

          <button
            onClick={() => setCompareList([])}
            className="p-1 text-slate-400 hover:text-white"
            title="Clear comparison list"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Comparison Modal */}
      <PropertyCompareModal
        properties={compareList}
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        onSelectProperty={onSelectProperty}
        onRemove={id => setCompareList(prev => prev.filter(p => p.id !== id))}
      />
    </div>
  );
};
