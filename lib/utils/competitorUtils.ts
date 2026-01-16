export function extractDomainFromName(name: string): string | null {
  // Try to extract domain from name
  const urlPattern = /(https?:\/\/)?([\w-]+\.)+[\w-]+/i;
  const match = name.match(urlPattern);
  if (match) {
    return match[0].replace(/^https?:\/\//, '');
  }
  return null;
}
