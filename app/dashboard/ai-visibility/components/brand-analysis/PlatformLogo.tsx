"use client";
import React from 'react';
import Image from 'next/image';
import { Globe } from 'lucide-react';

// Use images from public folder
const chatgptLogo = '/images/chatgpt.png';
const perplexityLogo = '/images/perplexity.png';
const claudeLogo = '/images/claude.png';
const geminiLogo = '/images/gemini 1.png';


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
    return <Image src={chatgptLogo} alt="ChatGPT" width={size} height={size} className={className} />;
  } else if (normalizedPlatform.includes('perplexity')) {
    return <Image src={perplexityLogo} alt="Perplexity" width={size} height={size} className={className} />;
  } else if (normalizedPlatform.includes('claude')) {
    return <Image src={claudeLogo} alt="Claude" width={size} height={size} className={className} />;
  } else if (normalizedPlatform.includes('grok')) {
    return <Globe style={{ width: size, height: size }} className={className} />; // Fallback for Grok
  } else if (normalizedPlatform.includes('gemini')) {
    return <Image src={geminiLogo} alt="Gemini" width={size} height={size} className={className} />;
  } else {
    return <Globe style={{ width: size, height: size }} className={className} />; // Fallback icon
  }
};