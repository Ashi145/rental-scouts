import React from 'react';
import { Property } from '../../types/index.ts';
import { Heart, MapPin, ShieldCheck, Eye, Sparkles, Navigation } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface PropertyCardProps {
  property: Property;
  onSelect: (slugOrId: string) => void;
  onFavoriteChange?: (propertyId: string, isFav: boolean) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, onSelect, onFavoriteChange }) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = React.useState(!!property.isFavorite);
  const [favLoading, setFavLoading] = React.useState(false);

  const primaryImage = property.images?.find(i => i.isPrimary)?.url || property.images?.[0]?.url || '/src/assets/images/property_apartment_kira_1791212350054.jpg';

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      alert('Please sign in to save your favorite rental properties.');
      return;
    }
    setFavLoading(true);
    try {
      await api.properties.toggleFavorite(property.id, isFavorite);
      const nextFav = !isFavorite;
      setIsFavorite(nextFav);
      if (onFavoriteChange) {
        onFavoriteChange(property.id, nextFav);
      }
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    } finally {
      setFavLoading(false);
    }
  };

  const formatPropertyType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <article
      onClick={() => onSelect(property.slug || property.id)}
      className="group cursor-pointer bg-white rounded-xl border border-slate-200 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col"
    >
      {/* Visual Slot: 65%-70% of upper visual hierarchy */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={primaryImage}
          alt={property.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Favorite Button */}
        <button
          onClick={handleToggleFavorite}
          disabled={favLoading}
          aria-label={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm ${
            isFavorite ? 'bg-rose-500 text-white' : 'bg-white/90 text-slate-700 hover:bg-white hover:text-rose-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Featured marker */}
        {property.isFeatured && (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-900/90 text-amber-400 backdrop-blur-xs flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Featured
          </div>
        )}

        {/* Video Tour Badge if available */}
        {property.hasVideo && (
          <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900/80 text-white backdrop-blur-xs">
            ▶ Video Tour
          </div>
        )}
      </div>

      {/* Body Content with Zero-Pill Unboxed Metadata Discipline */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Unboxed Metadata Line */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
            <span className="font-semibold text-slate-700">{formatPropertyType(property.propertyType)}</span>
            <span aria-hidden="true">·</span>
            <span>{property.bedrooms} {property.bedrooms === 1 ? 'Bed' : 'Beds'}</span>
            <span aria-hidden="true">·</span>
            <span>{property.bathrooms} {property.bathrooms === 1 ? 'Bath' : 'Baths'}</span>
            {property.furnished && (
              <>
                <span aria-hidden="true">·</span>
                <span>Furnished</span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors">
            {property.title}
          </h3>

          {/* Location & Neighborhood */}
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{property.location.neighborhood}, {property.location.cityOrTown}</span>
          </p>

          {/* Distance From Main Road: Crucial Uganda Discovery Feature */}
          <p className="text-xs text-slate-600 flex items-center gap-1 mt-1 font-medium">
            <Navigation className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{property.location.distanceFromMainRoadMeters}m off {property.location.mainRoadReference}</span>
          </p>
        </div>

        {/* Footer: Price in UGX + Verification */}
        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">Monthly Rent</span>
            <div className="text-base font-extrabold text-slate-950 font-mono tabular-nums">
              UGX {property.monthlyRentUGX.toLocaleString()}
            </div>
          </div>

          <div className="text-right">
            {property.landlord?.isVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Landlord
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Direct Landlord</span>
            )}

            {property.contactUnlocked && (
              <span className="block text-[11px] font-bold text-amber-700">
                Contact Unlocked ✓
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
