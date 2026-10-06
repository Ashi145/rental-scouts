import React, { useState } from 'react';
import { PropertyImage } from '../../types/index.ts';
import { Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PropertyGalleryProps {
  images: PropertyImage[];
  title: string;
}

export const PropertyGallery: React.FC<PropertyGalleryProps> = ({ images, title }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[16/10] bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
        No images available
      </div>
    );
  }

  const currentImage = images[selectedIndex] || images[0];

  const handleNext = () => {
    setSelectedIndex((selectedIndex + 1) % images.length);
  };

  const handlePrev = () => {
    setSelectedIndex((selectedIndex - 1 + images.length) % images.length);
  };

  return (
    <div className="space-y-3">
      {/* Main Viewport */}
      <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-slate-950 group">
        <img
          src={currentImage.url}
          alt={currentImage.caption || title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-opacity duration-200"
        />

        {/* Fullscreen Button */}
        <button
          onClick={() => setIsFullScreen(true)}
          className="absolute top-4 right-4 p-2 rounded-lg bg-slate-900/80 text-white hover:bg-slate-900 transition-colors backdrop-blur-xs"
          title="View full screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Counter */}
        <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-md bg-slate-900/80 text-white text-xs font-mono tabular-nums backdrop-blur-xs">
          {selectedIndex + 1} / {images.length}
        </div>

        {/* Caption */}
        {currentImage.caption && (
          <div className="absolute bottom-4 left-4 max-w-[70%] px-3 py-1.5 rounded-md bg-slate-900/80 text-slate-200 text-xs backdrop-blur-xs truncate">
            {currentImage.caption}
          </div>
        )}

        {/* Nav Arrows if > 1 image */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 text-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 text-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Bar */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={img.id || idx}
              onClick={() => setSelectedIndex(idx)}
              className={`relative aspect-[4/3] w-20 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                selectedIndex === idx ? 'border-amber-500 scale-95' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={img.url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Full Screen Modal */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setIsFullScreen(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center">
            <img
              src={currentImage.url}
              alt={title}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 text-white hover:bg-white/30"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 text-white hover:bg-white/30"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          <div className="text-white text-sm mt-4 font-mono tabular-nums">
            {selectedIndex + 1} of {images.length}
          </div>
        </div>
      )}
    </div>
  );
};
