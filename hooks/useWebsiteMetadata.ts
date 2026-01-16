"use client";

import { useState, useEffect } from 'react';

export function useWebsiteMetadata(url?: string) {
  const [metadata, setMetadata] = useState<{
    title?: string;
    description?: string;
    image?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setMetadata(null);
      return;
    }

    setLoading(true);
    // Placeholder - could fetch metadata from API
    setTimeout(() => {
      setMetadata({
        title: new URL(url).hostname,
        description: '',
        image: undefined,
      });
      setLoading(false);
    }, 100);
  }, [url]);

  return { metadata, loading };
}
