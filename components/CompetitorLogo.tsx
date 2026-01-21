'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Building2, Globe } from 'lucide-react';
import { normalizeDomain, extractDomainFromName, getClearbitLogoUrl, getFaviconUrl, getDomainVariations } from '@/lib/utils/competitorUtils';

interface CompetitorLogoProps {
  name: string;
  domain?: string;
  className?: string;
  size?: number;
  showFallbackInitial?: boolean;
}

/**
 * CompetitorLogo Component
 * Displays company logos with automatic fallback between Clearbit and Google Favicon APIs
 */
export const CompetitorLogo: React.FC<CompetitorLogoProps> = ({
  name,
  domain,
  className = "",
  size = 24,
  showFallbackInitial = true
}) => {
  const [currentSource, setCurrentSource] = useState<'clearbit' | 'google' | 'direct' | 'fallback'>('clearbit');
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const mountedRef = useRef(true);

  // Normalize the domain and get variations
  const baseDomain = domain ? normalizeDomain(domain) : extractDomainFromName(name);
  const domainVariations = getDomainVariations(baseDomain);

  useEffect(() => {
    mountedRef.current = true;
    // Reset state when domain or name changes
    setCurrentSource('clearbit');
    setCurrentDomainIndex(0);
    setImageLoaded(false);
    return () => {
      mountedRef.current = false;
    };
  }, [baseDomain, name]);

  const handleImageError = () => {
    if (!mountedRef.current) return;
    
    // Try next source or next domain variation
    if (currentSource === 'clearbit') {
      // Try Google favicon with current domain
      setCurrentSource('google');
      setImageLoaded(false);
    } else if (currentSource === 'google') {
      // Try direct favicon.ico with current domain
      setCurrentSource('direct');
      setImageLoaded(false);
    } else if (currentSource === 'direct') {
      // Try next domain variation with clearbit
      if (currentDomainIndex < domainVariations.length - 1) {
        setCurrentDomainIndex(prev => prev + 1);
        setCurrentSource('clearbit');
        setImageLoaded(false);
      } else {
        // All variations exhausted, show fallback
        setCurrentSource('fallback');
        setImageLoaded(false);
      }
    }
  };

  const handleImageLoad = () => {
    if (mountedRef.current) {
      setImageLoaded(true);
    }
  };

  // Get the appropriate URL based on current source and domain variation
  const getLogoUrl = () => {
    const currentDomain = domainVariations[currentDomainIndex] || baseDomain;
    switch (currentSource) {
      case 'clearbit':
        return getClearbitLogoUrl(currentDomain);
      case 'google':
        return getFaviconUrl(currentDomain, 128);
      case 'direct':
        // Try direct favicon from domain
        return `https://${currentDomain}/favicon.ico`;
      default:
        return null;
    }
  };

  const logoUrl = getLogoUrl();

  // Fallback: show initial letter or globe icon
  if (currentSource === 'fallback' || !logoUrl) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-sm bg-gray-200 text-gray-600 font-semibold flex-shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.5, lineHeight: 1 }}
      >
        {showFallbackInitial ? (
          name.charAt(0).toUpperCase()
        ) : (
          <Globe size={size * 0.6} className="text-gray-400" />
        )}
      </div>
    );
  }

  return (
    <div 
      className="relative inline-flex items-center justify-center flex-shrink-0" 
      style={{ width: size, height: size, verticalAlign: 'middle' }}
    >
      {/* Placeholder while loading */}
      {!imageLoaded && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-sm bg-gray-200 text-gray-400"
          style={{ fontSize: size * 0.5, lineHeight: 1 }}
        >
          {showFallbackInitial ? name.charAt(0).toUpperCase() : <Building2 size={size * 0.6} />}
        </div>
      )}
      {/* Actual logo image */}
      <img
        src={logoUrl}
        alt={`${name} logo`}
        style={{ 
          width: size, 
          height: size, 
          opacity: imageLoaded ? 1 : 0,
          display: 'block',
          verticalAlign: 'middle',
          margin: 0,
          padding: 0
        }}
        className={`flex-shrink-0 rounded-sm object-contain bg-white transition-opacity duration-200 ${className}`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />
    </div>
  );
};
