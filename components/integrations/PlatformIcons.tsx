import Image from 'next/image';

interface PlatformIconsProps {
  platform: string;
  className?: string;
}

export const PlatformIcons: React.FC<PlatformIconsProps> = ({ platform, className = "" }) => {
  // Simple text-based icons for now
  if (platform === 'WordPress') {
    return (
      <div className={`bg-blue-600 text-white rounded flex items-center justify-center font-bold ${className}`}>
        WP
      </div>
    );
  }
  
  if (platform === 'ShopifyFullyManaged') {
    return (
      <div className={`bg-green-600 text-white rounded flex items-center justify-center font-bold ${className}`}>
        S
      </div>
    );
  }
  
  return (
    <div className={`bg-gray-400 text-white rounded flex items-center justify-center font-bold ${className}`}>
      ?
    </div>
  );
};
