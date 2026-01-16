import React from 'react';
import { Globe } from 'lucide-react';

// Import logos
import chatgptLogo from '@/assets/platform-logos/chatgpt.svg';
import perplexityLogo from '@/assets/platform-logos/perplexity.png';
import claudeLogo from '@/assets/platform-logos/claude.png';
import grokLogo from '@/assets/platform-logos/grok.png';
import geminiLogo from '@/assets/platform-logos/gemini.png';


interface PlatformLogoProps {
  platform: string;
  className?: string;
  size?: number;
}

export const PlatformLogo: React.FC<PlatformLogoProps> = ({ platform, className, size = 20 }) => {
  const normalizedPlatform = (platform || '').toLowerCase();
  
  const props = {
    src: '',
    alt: `${platform} logo`,
    style: { width: size, height: size },
    className: `inline-block flex-shrink-0 ${className || ''}`
  };

  if (normalizedPlatform.includes('chatgpt') || normalizedPlatform.includes('openai')) {
    props.src = chatgptLogo;
  } else if (normalizedPlatform.includes('perplexity')) {
    props.src = perplexityLogo;
  } else if (normalizedPlatform.includes('claude')) {
    props.src = claudeLogo;
  } else if (normalizedPlatform.includes('grok')) {
    props.src = grokLogo;
    props.alt = 'Grok logo';
  } else if (normalizedPlatform.includes('gemini')) {
    props.src = geminiLogo;
  } else {
    return <Globe style={{ width: size, height: size }} className={props.className} />; // Fallback icon
  }

  return <img {...props} />;
};