'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, MousePointerClick, Eye, ExternalLink, Search, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

interface GSCIntegrationData {
  domain_url?: string;
  verification_status?: 'pending' | 'verified' | 'failed';
  last_synced_at?: string;
  [key: string]: any;
}

interface Domain {
  id: string;
  domain: string;
  gsc_integration?: GSCIntegrationData | null;
  // Computed fields for backward compatibility
  domain_url?: string;
  verification_status?: string;
  last_synced_at?: string;
}

interface AnalyticsData {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Summary {
  totalClicks: number;
  totalImpressions: number;
  avgCTR: number;
  avgPosition: number;
  trends: {
    clicks: number;
    impressions: number;
  };
}

interface Query {
  id: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Page {
  id: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Country {
  id: string;
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SearchAppearance {
  search_appearance: string;
  clicks: number;
  impressions: number;
  ctr: number;
}

export default function GSCAnalyticsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [topQueries, setTopQueries] = useState<Query[]>([]);
  const [topPages, setTopPages] = useState<Page[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [searchAppearances, setSearchAppearances] = useState<SearchAppearance[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dateRange, setDateRange] = useState(30);
  const [activeTab, setActiveTab] = useState<'overview' | 'queries' | 'pages' | 'countries' | 'appearances'>('overview');

  useEffect(() => {
    loadDomains();
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      loadAllData();
    }
  }, [selectedDomain, dateRange]);

  const loadDomains = async () => {
    try {
      setLoadingDomains(true);
      const response = await fetch('/api/integrations/google-search-console/domains');
      const data = await response.json();
      
      // Map domains and filter for verified ones
      const mappedDomains = (data.domains || []).map((domain: any) => ({
        ...domain,
        domain_url: domain.gsc_integration?.domain_url || domain.domain,
        verification_status: domain.gsc_integration?.verification_status || 'pending',
        last_synced_at: domain.gsc_integration?.last_synced_at,
      }));
      
      const verifiedDomains = mappedDomains.filter((d: Domain) => d.verification_status === 'verified');
      setDomains(verifiedDomains);
      
      if (verifiedDomains.length > 0 && !selectedDomain) {
        setSelectedDomain(verifiedDomains[0].id);
      }
    } catch (error) {
      console.error('Load domains error:', error);
      toast.error('Failed to load domains');
    } finally {
      setLoadingDomains(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSummary(),
        loadAnalytics(),
        loadTopQueries(),
        loadTopPages(),
        loadCountries(),
        loadSearchAppearances(),
      ]);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const startDate = getDateDaysAgo(dateRange);
      const endDate = getDateDaysAgo(0);
      
      const response = await fetch(
        `/api/integrations/google-search-console/analytics/summary?domainId=${selectedDomain}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Load summary error:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const startDate = getDateDaysAgo(dateRange);
      const endDate = getDateDaysAgo(0);
      
      const response = await fetch(
        `/api/integrations/google-search-console/analytics/sync?domainId=${selectedDomain}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics || []);
      }
    } catch (error) {
      console.error('Load analytics error:', error);
    }
  };

  const loadTopQueries = async () => {
    try {
      const startDate = getDateDaysAgo(dateRange);
      const endDate = getDateDaysAgo(0);
      
      // Fetch all queries without limit
      const response = await fetch(
        `/api/integrations/google-search-console/analytics/queries?domainId=${selectedDomain}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      
      if (data.success) {
        setTopQueries(data.queries || []);
      }
    } catch (error) {
      console.error('Load queries error:', error);
    }
  };

  const loadTopPages = async () => {
    try {
      const startDate = getDateDaysAgo(dateRange);
      const endDate = getDateDaysAgo(0);
      
      // Fetch all pages without limit
      const response = await fetch(
        `/api/integrations/google-search-console/analytics/pages?domainId=${selectedDomain}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      
      if (data.success) {
        setTopPages(data.pages || []);
      }
    } catch (error) {
      console.error('Load pages error:', error);
    }
  };

  const loadCountries = async () => {
    try {
      const startDate = getDateDaysAgo(dateRange);
      const endDate = getDateDaysAgo(0);
      
      const response = await fetch(
        `/api/integrations/google-search-console/analytics/sync?domainId=${selectedDomain}&startDate=${startDate}&endDate=${endDate}&dataType=country`
      );
      const data = await response.json();
      
      if (data.success) {
        // Aggregate country data by grouping records
        const countryMap = new Map<string, Country>();
        (data.analytics || []).forEach((item: any) => {
          const countryCode = item.country || 'UNKNOWN';
          if (countryMap.has(countryCode)) {
            const existing = countryMap.get(countryCode)!;
            existing.clicks += item.clicks || 0;
            existing.impressions += item.impressions || 0;
            // Recalculate CTR based on aggregated clicks/impressions
            existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
            // Average the position (weighted by impressions would be better but simple average works)
            existing.position = (existing.position + (item.position || 0)) / 2;
          } else {
            countryMap.set(countryCode, {
              id: countryCode,
              country: countryCode,
              clicks: item.clicks || 0,
              impressions: item.impressions || 0,
              ctr: item.ctr || 0,
              position: item.position || 0,
            });
          }
        });
        // Sort by clicks descending
        const aggregatedCountries = Array.from(countryMap.values()).sort((a, b) => b.clicks - a.clicks);
        setCountries(aggregatedCountries);
      }
    } catch (error) {
      console.error('Load countries error:', error);
    }
  };

  const loadSearchAppearances = async () => {
    try {
      const startDate = getDateDaysAgo(dateRange);
      const endDate = getDateDaysAgo(0);
      
      const response = await fetch(
        `/api/integrations/google-search-console/analytics/sync?domainId=${selectedDomain}&startDate=${startDate}&endDate=${endDate}&dataType=search_appearance`
      );
      const data = await response.json();
      
      if (data.success) {
        // Aggregate search appearance data
        const appearanceMap = new Map<string, SearchAppearance>();
        (data.analytics || []).forEach((item: any) => {
          const appearance = item.search_appearance || 'UNKNOWN';
          if (appearanceMap.has(appearance)) {
            const existing = appearanceMap.get(appearance)!;
            existing.clicks += item.clicks || 0;
            existing.impressions += item.impressions || 0;
          } else {
            appearanceMap.set(appearance, {
              search_appearance: appearance,
              clicks: item.clicks || 0,
              impressions: item.impressions || 0,
              ctr: item.ctr || 0,
            });
          }
        });
        setSearchAppearances(Array.from(appearanceMap.values()));
      }
    } catch (error) {
      console.error('Load search appearances error:', error);
    }
  };

  const syncData = async () => {
    setSyncing(true);
    try {
      // Sync summary data (use the selected date range for consistency)
      const summaryResponse = await fetch('/api/integrations/google-search-console/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: selectedDomain,
          startDate: getDateDaysAgo(dateRange),
          endDate: getDateDaysAgo(0),
          dimensions: ['date'],
        }),
      });

      // Sync query data - fetch maximum allowed by GSC API (25,000 rows)
      const queryResponse = await fetch('/api/integrations/google-search-console/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: selectedDomain,
          startDate: getDateDaysAgo(dateRange),
          endDate: getDateDaysAgo(0),
          dimensions: ['date', 'query'],
          rowLimit: 25000,
        }),
      });

      // Sync page data - fetch maximum allowed by GSC API (25,000 rows)
      const pageResponse = await fetch('/api/integrations/google-search-console/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: selectedDomain,
          startDate: getDateDaysAgo(dateRange),
          endDate: getDateDaysAgo(0),
          dimensions: ['date', 'page'],
          rowLimit: 25000,
        }),
      });

      // Sync country data - fetch maximum allowed by GSC API (25,000 rows)
      const countryResponse = await fetch('/api/integrations/google-search-console/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: selectedDomain,
          startDate: getDateDaysAgo(dateRange),
          endDate: getDateDaysAgo(0),
          dimensions: ['date', 'country'],
          rowLimit: 25000,
        }),
      });

      // Sync search appearance data
      // Note: searchAppearance must be queried alone, cannot be combined with other dimensions
      const appearanceResponse = await fetch('/api/integrations/google-search-console/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: selectedDomain,
          startDate: getDateDaysAgo(dateRange),
          endDate: getDateDaysAgo(0),
          dimensions: ['searchAppearance'],
          rowLimit: 25000,
        }),
      });

      if (summaryResponse.ok) {
        toast.success('Data synced successfully!');
        loadAllData();
      } else {
        toast.error('Failed to sync data');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync data');
    } finally {
      setSyncing(false);
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getCountryName = (code: string) => {
    if (!code || code === 'UNKNOWN') return 'Unknown';
    
    const upperCode = code.toUpperCase();
    
    // Comprehensive mapping for 3-letter ISO country codes (ISO 3166-1 alpha-3)
    const countryMapping: { [key: string]: string } = {
      // A
      'AFG': 'Afghanistan', 'ALA': 'Åland Islands', 'ALB': 'Albania', 'DZA': 'Algeria',
      'ASM': 'American Samoa', 'AND': 'Andorra', 'AGO': 'Angola', 'AIA': 'Anguilla',
      'ATA': 'Antarctica', 'ATG': 'Antigua and Barbuda', 'ARG': 'Argentina', 'ARM': 'Armenia',
      'ABW': 'Aruba', 'AUS': 'Australia', 'AUT': 'Austria', 'AZE': 'Azerbaijan',
      
      // B
      'BHS': 'Bahamas', 'BHR': 'Bahrain', 'BGD': 'Bangladesh', 'BRB': 'Barbados',
      'BLR': 'Belarus', 'BEL': 'Belgium', 'BLZ': 'Belize', 'BEN': 'Benin',
      'BMU': 'Bermuda', 'BTN': 'Bhutan', 'BOL': 'Bolivia', 'BES': 'Bonaire, Sint Eustatius and Saba',
      'BIH': 'Bosnia and Herzegovina', 'BWA': 'Botswana', 'BVT': 'Bouvet Island', 'BRA': 'Brazil',
      'IOT': 'British Indian Ocean Territory', 'BRN': 'Brunei', 'BGR': 'Bulgaria', 'BFA': 'Burkina Faso',
      'BDI': 'Burundi',
      
      // C
      'CPV': 'Cabo Verde', 'KHM': 'Cambodia', 'CMR': 'Cameroon', 'CAN': 'Canada',
      'CYM': 'Cayman Islands', 'CAF': 'Central African Republic', 'TCD': 'Chad', 'CHL': 'Chile',
      'CHN': 'China', 'CXR': 'Christmas Island', 'CCK': 'Cocos (Keeling) Islands', 'COL': 'Colombia',
      'COM': 'Comoros', 'COG': 'Congo', 'COD': 'Congo (Democratic Republic)', 'COK': 'Cook Islands',
      'CRI': 'Costa Rica', 'CIV': 'Côte d\'Ivoire', 'HRV': 'Croatia', 'CUB': 'Cuba',
      'CUW': 'Curaçao', 'CYP': 'Cyprus', 'CZE': 'Czech Republic',
      
      // D
      'DNK': 'Denmark', 'DJI': 'Djibouti', 'DMA': 'Dominica', 'DOM': 'Dominican Republic',
      
      // E
      'ECU': 'Ecuador', 'EGY': 'Egypt', 'SLV': 'El Salvador', 'GNQ': 'Equatorial Guinea',
      'ERI': 'Eritrea', 'EST': 'Estonia', 'SWZ': 'Eswatini', 'ETH': 'Ethiopia',
      
      // F
      'FLK': 'Falkland Islands', 'FRO': 'Faroe Islands', 'FJI': 'Fiji', 'FIN': 'Finland',
      'FRA': 'France', 'GUF': 'French Guiana', 'PYF': 'French Polynesia', 'ATF': 'French Southern Territories',
      
      // G
      'GAB': 'Gabon', 'GMB': 'Gambia', 'GEO': 'Georgia', 'DEU': 'Germany',
      'GHA': 'Ghana', 'GIB': 'Gibraltar', 'GRC': 'Greece', 'GRL': 'Greenland',
      'GRD': 'Grenada', 'GLP': 'Guadeloupe', 'GUM': 'Guam', 'GTM': 'Guatemala',
      'GGY': 'Guernsey', 'GIN': 'Guinea', 'GNB': 'Guinea-Bissau', 'GUY': 'Guyana',
      
      // H
      'HTI': 'Haiti', 'HMD': 'Heard Island and McDonald Islands', 'VAT': 'Holy See', 'HND': 'Honduras',
      'HKG': 'Hong Kong', 'HUN': 'Hungary',
      
      // I
      'ISL': 'Iceland', 'IND': 'India', 'IDN': 'Indonesia', 'IRN': 'Iran',
      'IRQ': 'Iraq', 'IRL': 'Ireland', 'IMN': 'Isle of Man', 'ISR': 'Israel',
      'ITA': 'Italy',
      
      // J
      'JAM': 'Jamaica', 'JPN': 'Japan', 'JEY': 'Jersey', 'JOR': 'Jordan',
      
      // K
      'KAZ': 'Kazakhstan', 'KEN': 'Kenya', 'KIR': 'Kiribati', 'PRK': 'North Korea',
      'KOR': 'South Korea', 'KWT': 'Kuwait', 'KGZ': 'Kyrgyzstan',
      
      // L
      'LAO': 'Laos', 'LVA': 'Latvia', 'LBN': 'Lebanon', 'LSO': 'Lesotho',
      'LBR': 'Liberia', 'LBY': 'Libya', 'LIE': 'Liechtenstein', 'LTU': 'Lithuania',
      'LUX': 'Luxembourg',
      
      // M
      'MAC': 'Macao', 'MDG': 'Madagascar', 'MWI': 'Malawi', 'MYS': 'Malaysia',
      'MDV': 'Maldives', 'MLI': 'Mali', 'MLT': 'Malta', 'MHL': 'Marshall Islands',
      'MTQ': 'Martinique', 'MRT': 'Mauritania', 'MUS': 'Mauritius', 'MYT': 'Mayotte',
      'MEX': 'Mexico', 'FSM': 'Micronesia', 'MDA': 'Moldova', 'MCO': 'Monaco',
      'MNG': 'Mongolia', 'MNE': 'Montenegro', 'MSR': 'Montserrat', 'MAR': 'Morocco',
      'MOZ': 'Mozambique', 'MMR': 'Myanmar',
      
      // N
      'NAM': 'Namibia', 'NRU': 'Nauru', 'NPL': 'Nepal', 'NLD': 'Netherlands',
      'NCL': 'New Caledonia', 'NZL': 'New Zealand', 'NIC': 'Nicaragua', 'NER': 'Niger',
      'NGA': 'Nigeria', 'NIU': 'Niue', 'NFK': 'Norfolk Island', 'MKD': 'North Macedonia',
      'MNP': 'Northern Mariana Islands', 'NOR': 'Norway',
      
      // O
      'OMN': 'Oman',
      
      // P
      'PAK': 'Pakistan', 'PLW': 'Palau', 'PSE': 'Israel', 'PAN': 'Panama',
      'PNG': 'Papua New Guinea', 'PRY': 'Paraguay', 'PER': 'Peru', 'PHL': 'Philippines',
      'PCN': 'Pitcairn', 'POL': 'Poland', 'PRT': 'Portugal', 'PRI': 'Puerto Rico',
      
      // Q
      'QAT': 'Qatar',
      
      // R
      'REU': 'Réunion', 'ROU': 'Romania', 'RUS': 'Russia', 'RWA': 'Rwanda',
      
      // S
      'BLM': 'Saint Barthélemy', 'SHN': 'Saint Helena', 'KNA': 'Saint Kitts and Nevis',
      'LCA': 'Saint Lucia', 'MAF': 'Saint Martin', 'SPM': 'Saint Pierre and Miquelon',
      'VCT': 'Saint Vincent and the Grenadines', 'WSM': 'Samoa', 'SMR': 'San Marino',
      'STP': 'Sao Tome and Principe', 'SAU': 'Saudi Arabia', 'SEN': 'Senegal', 'SRB': 'Serbia',
      'SYC': 'Seychelles', 'SLE': 'Sierra Leone', 'SGP': 'Singapore', 'SXM': 'Sint Maarten',
      'SVK': 'Slovakia', 'SVN': 'Slovenia', 'SLB': 'Solomon Islands', 'SOM': 'Somalia',
      'ZAF': 'South Africa', 'SGS': 'South Georgia and the South Sandwich Islands', 'SSD': 'South Sudan',
      'ESP': 'Spain', 'LKA': 'Sri Lanka', 'SDN': 'Sudan', 'SUR': 'Suriname',
      'SJM': 'Svalbard and Jan Mayen', 'SWE': 'Sweden', 'CHE': 'Switzerland', 'SYR': 'Syria',
      
      // T
      'TWN': 'Taiwan', 'TJK': 'Tajikistan', 'TZA': 'Tanzania', 'THA': 'Thailand',
      'TLS': 'Timor-Leste', 'TGO': 'Togo', 'TKL': 'Tokelau', 'TON': 'Tonga',
      'TTO': 'Trinidad and Tobago', 'TUN': 'Tunisia', 'TUR': 'Turkey', 'TKM': 'Turkmenistan',
      'TCA': 'Turks and Caicos Islands', 'TUV': 'Tuvalu',
      
      // U
      'UGA': 'Uganda', 'UKR': 'Ukraine', 'ARE': 'United Arab Emirates', 'GBR': 'United Kingdom',
      'USA': 'United States', 'UMI': 'United States Minor Outlying Islands', 'URY': 'Uruguay',
      'UZB': 'Uzbekistan',
      
      // V
      'VUT': 'Vanuatu', 'VEN': 'Venezuela', 'VNM': 'Vietnam', 'VGB': 'Virgin Islands (British)',
      'VIR': 'Virgin Islands (U.S.)',
      
      // W
      'WLF': 'Wallis and Futuna', 'ESH': 'Western Sahara',
      
      // Y
      'YEM': 'Yemen',
      
      // Z
      'ZMB': 'Zambia', 'ZWE': 'Zimbabwe',
      
      // 2-letter codes (ISO 3166-1 alpha-2) - for backward compatibility
      'AF': 'Afghanistan', 'AX': 'Åland Islands', 'AL': 'Albania', 'DZ': 'Algeria',
      'AS': 'American Samoa', 'AD': 'Andorra', 'AO': 'Angola', 'AI': 'Anguilla',
      'AQ': 'Antarctica', 'AG': 'Antigua and Barbuda', 'AR': 'Argentina', 'AM': 'Armenia',
      'AW': 'Aruba', 'AU': 'Australia', 'AT': 'Austria', 'AZ': 'Azerbaijan',
      'BS': 'Bahamas', 'BH': 'Bahrain', 'BD': 'Bangladesh', 'BB': 'Barbados',
      'BY': 'Belarus', 'BE': 'Belgium', 'BZ': 'Belize', 'BJ': 'Benin',
      'BM': 'Bermuda', 'BT': 'Bhutan', 'BO': 'Bolivia', 'BQ': 'Bonaire, Sint Eustatius and Saba',
      'BA': 'Bosnia and Herzegovina', 'BW': 'Botswana', 'BV': 'Bouvet Island', 'BR': 'Brazil',
      'IO': 'British Indian Ocean Territory', 'BN': 'Brunei', 'BG': 'Bulgaria', 'BF': 'Burkina Faso',
      'BI': 'Burundi', 'CV': 'Cabo Verde', 'KH': 'Cambodia', 'CM': 'Cameroon',
      'CA': 'Canada', 'KY': 'Cayman Islands', 'CF': 'Central African Republic', 'TD': 'Chad',
      'CL': 'Chile', 'CN': 'China', 'CX': 'Christmas Island', 'CC': 'Cocos (Keeling) Islands',
      'CO': 'Colombia', 'KM': 'Comoros', 'CG': 'Congo', 'CD': 'Congo (Democratic Republic)',
      'CK': 'Cook Islands', 'CR': 'Costa Rica', 'CI': 'Côte d\'Ivoire', 'HR': 'Croatia',
      'CU': 'Cuba', 'CW': 'Curaçao', 'CY': 'Cyprus', 'CZ': 'Czech Republic',
      'DK': 'Denmark', 'DJ': 'Djibouti', 'DM': 'Dominica', 'DO': 'Dominican Republic',
      'EC': 'Ecuador', 'EG': 'Egypt', 'SV': 'El Salvador', 'GQ': 'Equatorial Guinea',
      'ER': 'Eritrea', 'EE': 'Estonia', 'SZ': 'Eswatini', 'ET': 'Ethiopia',
      'FK': 'Falkland Islands', 'FO': 'Faroe Islands', 'FJ': 'Fiji', 'FI': 'Finland',
      'FR': 'France', 'GF': 'French Guiana', 'PF': 'French Polynesia', 'TF': 'French Southern Territories',
      'GA': 'Gabon', 'GM': 'Gambia', 'GE': 'Georgia', 'DE': 'Germany',
      'GH': 'Ghana', 'GI': 'Gibraltar', 'GR': 'Greece', 'GL': 'Greenland',
      'GD': 'Grenada', 'GP': 'Guadeloupe', 'GU': 'Guam', 'GT': 'Guatemala',
      'GG': 'Guernsey', 'GN': 'Guinea', 'GW': 'Guinea-Bissau', 'GY': 'Guyana',
      'HT': 'Haiti', 'HM': 'Heard Island and McDonald Islands', 'VA': 'Holy See',
      'HN': 'Honduras', 'HK': 'Hong Kong', 'HU': 'Hungary', 'IS': 'Iceland',
      'IN': 'India', 'ID': 'Indonesia', 'IR': 'Iran', 'IQ': 'Iraq',
      'IE': 'Ireland', 'IM': 'Isle of Man', 'IL': 'Israel', 'IT': 'Italy', 'ISR': 'Israel',
      'JM': 'Jamaica', 'JP': 'Japan', 'JE': 'Jersey', 'JO': 'Jordan',
      'KZ': 'Kazakhstan', 'KE': 'Kenya', 'KI': 'Kiribati', 'KP': 'North Korea',
      'KR': 'South Korea', 'KW': 'Kuwait', 'KG': 'Kyrgyzstan', 'LA': 'Laos',
      'LV': 'Latvia', 'LB': 'Lebanon', 'LS': 'Lesotho', 'LR': 'Liberia',
      'LY': 'Libya', 'LI': 'Liechtenstein', 'LT': 'Lithuania', 'LU': 'Luxembourg',
      'MO': 'Macao', 'MG': 'Madagascar', 'MW': 'Malawi', 'MY': 'Malaysia',
      'MV': 'Maldives', 'ML': 'Mali', 'MT': 'Malta', 'MH': 'Marshall Islands',
      'MQ': 'Martinique', 'MR': 'Mauritania', 'MU': 'Mauritius', 'YT': 'Mayotte',
      'MX': 'Mexico', 'FM': 'Micronesia', 'MD': 'Moldova', 'MC': 'Monaco',
      'MN': 'Mongolia', 'ME': 'Montenegro', 'MS': 'Montserrat', 'MA': 'Morocco',
      'MZ': 'Mozambique', 'MM': 'Myanmar', 'NA': 'Namibia', 'NR': 'Nauru',
      'NP': 'Nepal', 'NL': 'Netherlands', 'NC': 'New Caledonia', 'NZ': 'New Zealand',
      'NI': 'Nicaragua', 'NE': 'Niger', 'NG': 'Nigeria', 'NU': 'Niue',
      'NF': 'Norfolk Island', 'MK': 'North Macedonia', 'MP': 'Northern Mariana Islands',
      'NO': 'Norway', 'OM': 'Oman', 'PK': 'Pakistan', 'PW': 'Palau',
      'PS': 'Israel', 'PA': 'Panama', 'PG': 'Papua New Guinea', 'PY': 'Paraguay',
      'PE': 'Peru', 'PH': 'Philippines', 'PN': 'Pitcairn', 'PL': 'Poland',
      'PT': 'Portugal', 'PR': 'Puerto Rico', 'QA': 'Qatar', 'RE': 'Réunion',
      'RO': 'Romania', 'RU': 'Russia', 'RW': 'Rwanda', 'BL': 'Saint Barthélemy',
      'SH': 'Saint Helena', 'KN': 'Saint Kitts and Nevis', 'LC': 'Saint Lucia',
      'MF': 'Saint Martin', 'PM': 'Saint Pierre and Miquelon', 'VC': 'Saint Vincent and the Grenadines',
      'WS': 'Samoa', 'SM': 'San Marino', 'ST': 'Sao Tome and Principe', 'SA': 'Saudi Arabia',
      'SN': 'Senegal', 'RS': 'Serbia', 'SC': 'Seychelles', 'SL': 'Sierra Leone',
      'SG': 'Singapore', 'SX': 'Sint Maarten', 'SK': 'Slovakia', 'SI': 'Slovenia',
      'SB': 'Solomon Islands', 'SO': 'Somalia', 'ZA': 'South Africa',
      'GS': 'South Georgia and the South Sandwich Islands', 'SS': 'South Sudan',
      'ES': 'Spain', 'LK': 'Sri Lanka', 'SD': 'Sudan', 'SR': 'Suriname',
      'SJ': 'Svalbard and Jan Mayen', 'SE': 'Sweden', 'CH': 'Switzerland', 'SY': 'Syria',
      'TW': 'Taiwan', 'TJ': 'Tajikistan', 'TZ': 'Tanzania', 'TH': 'Thailand',
      'TL': 'Timor-Leste', 'TG': 'Togo', 'TK': 'Tokelau', 'TO': 'Tonga',
      'TT': 'Trinidad and Tobago', 'TN': 'Tunisia', 'TR': 'Turkey', 'TM': 'Turkmenistan',
      'TC': 'Turks and Caicos Islands', 'TV': 'Tuvalu', 'UG': 'Uganda', 'UA': 'Ukraine',
      'AE': 'United Arab Emirates', 'GB': 'United Kingdom', 'US': 'United States',
      'UM': 'United States Minor Outlying Islands', 'UY': 'Uruguay', 'UZ': 'Uzbekistan',
      'VU': 'Vanuatu', 'VE': 'Venezuela', 'VN': 'Vietnam', 'VG': 'Virgin Islands (British)',
      'VI': 'Virgin Islands (U.S.)', 'WF': 'Wallis and Futuna', 'EH': 'Western Sahara',
      'YE': 'Yemen', 'ZM': 'Zambia', 'ZW': 'Zimbabwe'
    };
    
    // Check if we have a direct mapping
    if (countryMapping[upperCode]) {
      return countryMapping[upperCode];
    }
    
    // Fallback: Try Intl.DisplayNames for any codes we might have missed
    try {
      const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
      if (upperCode.length === 2) {
        return regionNames.of(upperCode) || code;
      }
    } catch {
      // If all fails, return the code itself
      return code;
    }
    
    return code;
  };

  const selectedDomainData = domains.find(d => d.id === selectedDomain);

  // Show loading state while checking for domains
  if (loadingDomains) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading domains...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state only after loading is complete
  if (domains.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Verified Domains</h2>
            <p className="text-gray-600 mb-4">
              You need to add and verify a domain on google search console before viewing analytics.
            </p>
            <a
              href="/dashboard/google-search-console"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add Domain
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Console Analytics</h1>
            <p className="text-gray-600">Track your website's search performance and insights</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label className="font-medium text-gray-700 text-sm">Domain:</label>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.domain_url}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-medium text-gray-700 text-sm">Period:</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>

            <button
              onClick={syncData}
              disabled={syncing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium text-sm flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {syncing ? 'Syncing...' : 'Sync Data'}
            </button>
          </div>

          {selectedDomainData?.last_synced_at && (
            <p className="text-xs text-gray-500 mt-2">
              Last synced: {new Date(selectedDomainData.last_synced_at).toLocaleString()}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Total Clicks</h3>
                    <MousePointerClick className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{formatNumber(summary.totalClicks)}</p>
                  <div className={`flex items-center gap-1 text-sm ${getTrendColor(summary.trends.clicks)}`}>
                    {getTrendIcon(summary.trends.clicks)}
                    <span>{Math.abs(summary.trends.clicks).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Total Impressions</h3>
                    <Eye className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{formatNumber(summary.totalImpressions)}</p>
                  <div className={`flex items-center gap-1 text-sm ${getTrendColor(summary.trends.impressions)}`}>
                    {getTrendIcon(summary.trends.impressions)}
                    <span>{Math.abs(summary.trends.impressions).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Average CTR</h3>
                    <MousePointerClick className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{summary.avgCTR.toFixed(2)}%</p>
                  <p className="text-sm text-gray-500">Click-through rate</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Average Position</h3>
                    <Search className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{summary.avgPosition.toFixed(1)}</p>
                  <p className="text-sm text-gray-500">Search ranking</p>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="border-b border-gray-200">
                <div className="flex overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'overview'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('queries')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'queries'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Top Queries
                  </button>
                  <button
                    onClick={() => setActiveTab('pages')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'pages'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Top Pages
                  </button>
                  <button
                    onClick={() => setActiveTab('countries')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'countries'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Globe className="w-4 h-4 inline mr-2" />
                    Countries
                  </button>
                  <button
                    onClick={() => setActiveTab('appearances')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'appearances'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Search Appearances
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    {/* Combined Metrics Chart */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics Over Time</h3>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={analytics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                          
                          {/* Left Y-axis for Clicks & Impressions */}
                          <YAxis 
                            yAxisId="left" 
                            stroke="#6b7280" 
                            style={{ fontSize: '12px' }}
                            label={{ value: 'Clicks & Impressions', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                          />
                          
                          {/* Right Y-axis for CTR & Position */}
                          <YAxis 
                            yAxisId="right" 
                            orientation="right" 
                            stroke="#6b7280" 
                            style={{ fontSize: '12px' }}
                            label={{ value: 'CTR (%) & Position', angle: 90, position: 'insideRight', style: { fontSize: '12px' } }}
                          />
                          
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                            formatter={(value: number, name: string) => {
                              if (name === 'CTR') return `${(value * 100).toFixed(2)}%`;
                              if (name === 'Position') return value.toFixed(1);
                              return formatNumber(value);
                            }}
                          />
                          <Legend />
                          
                          {/* Lines with different Y-axes */}
                          <Line 
                            yAxisId="left" 
                            type="linear" 
                            dataKey="clicks" 
                            stroke="#3b82f6" 
                            name="Clicks" 
                            strokeWidth={2} 
                            dot={false}
                          />
                          <Line 
                            yAxisId="left" 
                            type="linear" 
                            dataKey="impressions" 
                            stroke="#10b981" 
                            name="Impressions" 
                            strokeWidth={2} 
                            dot={false}
                          />
                          <Line 
                            yAxisId="right" 
                            type="linear" 
                            dataKey="ctr" 
                            stroke="#8b5cf6" 
                            name="CTR" 
                            strokeWidth={2} 
                            dot={false}
                          />
                          <Line 
                            yAxisId="right" 
                            type="linear" 
                            dataKey="position" 
                            stroke="#f97316" 
                            name="Position" 
                            strokeWidth={2} 
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      <p className="text-xs text-gray-500 mt-2">
                        Note: Lower position values indicate better rankings. CTR is shown as a decimal (multiply by 100 for percentage).
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'queries' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Top Performing Queries
                      {topQueries.length > 0 && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          ({topQueries.length} {topQueries.length === 1 ? 'query' : 'queries'})
                        </span>
                      )}
                    </h3>
                    {topQueries.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No query data available. Click "Sync Data" to fetch latest data.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Query</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Clicks</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Impressions</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">CTR</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Position</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {topQueries.map((query, index) => (
                              <tr key={query.id || index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">{query.query}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(query.clicks)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(query.impressions)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{(query.ctr * 100).toFixed(2)}%</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{query.position.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'pages' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Top Performing Pages
                      {topPages.length > 0 && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          ({topPages.length} {topPages.length === 1 ? 'page' : 'pages'})
                        </span>
                      )}
                    </h3>
                    {topPages.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No page data available. Click "Sync Data" to fetch latest data.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Page</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Clicks</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Impressions</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">CTR</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Position</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {topPages.map((page, index) => (
                              <tr key={page.id || index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate" title={page.page}>
                                  {page.page}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(page.clicks)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(page.impressions)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{(page.ctr * 100).toFixed(2)}%</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{page.position.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'countries' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Performance by Country
                      {countries.length > 0 && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          ({countries.length} {countries.length === 1 ? 'country' : 'countries'})
                        </span>
                      )}
                    </h3>
                    {countries.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No country data available. Click "Sync Data" to fetch latest data.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Country</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Clicks</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Impressions</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">CTR</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Position</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {countries.map((country, index) => (
                              <tr key={country.id || index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  <span className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-gray-400" />
                                    {getCountryName(country.country)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(country.clicks)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(country.impressions)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{(country.ctr * 100).toFixed(2)}%</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{country.position.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'appearances' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Search Appearance</h3>
                    {searchAppearances.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No search appearance data available. Click "Sync Data" to fetch latest data.</p>
                    ) : (
                      <div className="space-y-6">
                        {/* Bar Chart */}
                        <div>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={searchAppearances}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis 
                                dataKey="search_appearance" 
                                angle={-45} 
                                textAnchor="end" 
                                height={100} 
                                style={{ fontSize: '11px' }}
                              />
                              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                              />
                              <Legend />
                              <Bar dataKey="clicks" fill="#3b82f6" name="Clicks" />
                              <Bar dataKey="impressions" fill="#10b981" name="Impressions" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Clicks</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Impressions</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">CTR</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {searchAppearances.map((appearance, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm text-gray-900">{appearance.search_appearance}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(appearance.clicks)}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(appearance.impressions)}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{(appearance.ctr * 100).toFixed(2)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

