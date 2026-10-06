import React from 'react';
import { PropertyLocation } from '../../types/index.ts';
import { MapPin, ShieldCheck } from 'lucide-react';

interface PropertyMapProps {
  location: PropertyLocation;
}

export const PropertyMap: React.FC<PropertyMapProps> = ({ location }) => {
  const mapKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const mapCenter = location.exactLocation && location.latitude !== undefined && location.longitude !== undefined
    ? { lat: location.latitude, lng: location.longitude }
    : location.approximateLocation;

  const mapUrl = mapKey && mapCenter
    ? `https://www.google.com/maps/embed/v1/view?${new URLSearchParams({
        key: mapKey,
        center: `${mapCenter.lat},${mapCenter.lng}`,
        zoom: location.exactLocation ? '17' : '14',
        language: 'en',
        region: 'UG',
      }).toString()}`
    : undefined;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Getting There & Accessibility</h3>
          <p className="text-xs text-slate-500">
            Road access and distance from main transport corridor
          </p>
        </div>
        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
          {location.distanceFromMainRoadMeters}m off main road
        </span>
      </div>

      <div className="relative aspect-[21/9] w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
        {mapUrl ? (
          <iframe
            title={`Map of ${location.neighborhood}, ${location.cityOrTown}`}
            src={mapUrl}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="max-w-md text-center space-y-3">
              <MapPin className="w-8 h-8 text-amber-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-900">{location.neighborhood}</p>
              <p className="text-xs text-slate-600">
                {mapKey
                  ? 'Approximate map location is not available for this listing.'
                  : 'Map preview is unavailable. Exact location remains private until a confirmed contact unlock.'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <span className="text-slate-500 block mb-1">Main Arterial Road</span>
          <span className="font-semibold text-slate-900 block truncate">{location.mainRoadReference}</span>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 sm:col-span-2">
          <span className="text-slate-500 block mb-1">Area</span>
          <span className="font-semibold text-slate-900 block">{location.neighborhood}, {location.cityOrTown}</span>
        </div>
      </div>

      {location.publicDescription && (
        <p className="text-xs text-slate-600 bg-amber-50/50 p-3 rounded-lg border border-amber-100/60 leading-relaxed">
          <strong className="text-slate-800">Access Notes: </strong>
          {location.publicDescription}
        </p>
      )}

      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>
          {location.exactLocation
            ? 'Exact location is shown because this account has access.'
            : 'Approximate area only. The exact location is available after a confirmed contact unlock.'}
        </span>
      </div>
    </div>
  );
};
