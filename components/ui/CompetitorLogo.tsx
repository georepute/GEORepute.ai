"use client";

"use client";

import { Globe } from 'lucide-react';
import Image from 'next/image';
import { extractDomainFromName } from '@/lib/utils/competitorUtils';

interface CompetitorLogoProps {
  competitor: string;
  size?: number;
  className?: string;
}

export function CompetitorLogo({ competitor, size = 20, className = "" }: CompetitorLogoProps) {
  // Try to extract domain from competitor name
  const domain = extractDomainFromName(competitor);
  
  if (domain) {
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
    return (
      <Image
        src={faviconUrl}
        alt={competitor}
        width={size}
        height={size}
        className={className}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }
  
  return <Globe size={size} className={className} />;
}
