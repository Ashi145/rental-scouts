import React from 'react';
import { Property } from '../../types/index.ts';
import { X, Check, ArrowRight, ShieldCheck, Navigation } from 'lucide-react';

interface PropertyCompareModalProps {
  properties: Property[];
  isOpen: boolean;
  onClose: () => void;
  onSelectProperty: (slugOrId: string) => void;
  onRemove: (id: string) => void;
}

export const PropertyCompareModal: React.FC<PropertyCompareModalProps> = ({
  properties,
  isOpen,
  onClose,
  onSelectProperty,
  onRemove,
}) => {
  if (!isOpen || properties.length === 0) return null;

  const comparisonAttributes = [
    { label: 'Monthly Rent', key: 'rent', format: (p: Property) => `UGX ${p.monthlyRentUGX.toLocaleString()}` },
    { label: 'Property Type', key: 'type', format: (p: Property) => p.propertyType.replace(/_/g, ' ') },
    { label: 'Bedrooms', key: 'beds', format: (p: Property) => `${p.bedrooms} Beds` },
    { label: 'Bathrooms', key: 'baths', format: (p: Property) => `${p.bathrooms} Baths` },
    { label: 'Main Road Distance', key: 'road', format: (p: Property) => `${p.location.distanceFromMainRoadMeters}m off ${p.location.mainRoadReference}` },
    { label: 'District / Area', key: 'area', format: (p: Property) => `${p.location.neighborhood}, ${p.location.district}` },
    { label: 'Furnished', key: 'furnished', format: (p: Property) => p.furnished ? 'Yes' : 'No' },
    { label: 'Landlord Verification', key: 'verified', format: (p: Property) => p.landlord?.isVerified ? '✓ Verified Landlord' : 'Direct Landlord' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Compare Rental Properties</h3>
            <p className="text-xs text-slate-500">Side-by-side comparison of rent, distance to main road, and amenities</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Header row with property cards */}
            <div className="grid grid-cols-4 gap-4 pb-4 border-b border-slate-200">
              <div className="col-span-1 pt-6 text-xs font-bold uppercase tracking-wider text-slate-400">
                Attributes
              </div>
              {properties.map(prop => (
                <div key={prop.id} className="col-span-1 relative bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <button
                    onClick={() => onRemove(prop.id)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600"
                    title="Remove from comparison"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <img
                    src={prop.images?.[0]?.url || '/src/assets/images/property_apartment_kira_1791212350054.jpg'}
                    alt={prop.title}
                    className="aspect-[4/3] w-full rounded-lg object-cover"
                  />
                  <h4 className="text-xs font-bold text-slate-900 truncate" title={prop.title}>
                    {prop.title}
                  </h4>
                  <button
                    onClick={() => {
                      onClose();
                      onSelectProperty(prop.slug || prop.id);
                    }}
                    className="w-full py-1.5 rounded-lg bg-slate-900 text-white font-bold text-[11px] hover:bg-slate-800 flex items-center justify-center gap-1"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Comparison Rows */}
            <div className="divide-y divide-slate-100 text-xs">
              {comparisonAttributes.map(attr => (
                <div key={attr.key} className="grid grid-cols-4 gap-4 py-3 items-center">
                  <div className="col-span-1 font-bold text-slate-700">{attr.label}</div>
                  {properties.map(prop => (
                    <div key={prop.id} className="col-span-1 font-medium text-slate-900 truncate">
                      {attr.format(prop)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">Tip: Unlocking any property costs UGX 5,000 for direct landlord phone & WhatsApp.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
