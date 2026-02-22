'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Globe, TrendingUp, TrendingDown, MousePointerClick, Eye, Target, Map as MapIcon, Brain, RefreshCw, Check, X, AlertCircle, CheckCircle } from 'lucide-react';
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
  domain_url?: string;
  verification_status?: string;
  last_synced_at?: string;
}

interface Country {
  id: string;
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface AIMatrixCountry {
  id: string;
  country_code: string;
  ai_visibility_score: number;
  ai_domain_found?: boolean;
  ai_best_position?: number | null;
  ai_platforms_present?: string[];
  ai_mentioned_competitors?: string[];
  organic_score: number;
  overall_visibility_score: number;
}

export default function RegionalStrengthComparisonPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [dateRange, setDateRange] = useState(30);
  const [aiMatrixData, setAiMatrixData] = useState<AIMatrixCountry[]>([]);
  const [loadingAiMatrix, setLoadingAiMatrix] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'google'>('ai');

  useEffect(() => {
    loadDomains();
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      loadCountries();
      loadAIMatrixData();
    }
  }, [selectedDomain, dateRange]);

  const loadDomains = async () => {
    try {
      setLoadingDomains(true);
      const response = await fetch('/api/integrations/google-search-console/domains');
      const data = await response.json();
      
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

  const loadCountries = async () => {
    try {
      setLoading(true);
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
            existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
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
        
        const aggregatedCountries = Array.from(countryMap.values()).sort((a, b) => b.clicks - a.clicks);
        setCountries(aggregatedCountries);
      }
    } catch (error) {
      console.error('Load countries error:', error);
      toast.error('Failed to load country data');
    } finally {
      setLoading(false);
    }
  };

  const loadAIMatrixData = async () => {
    try {
      setLoadingAiMatrix(true);
      const response = await fetch(`/api/global-visibility-matrix?domainId=${selectedDomain}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setAiMatrixData(data.data);
      } else {
        setAiMatrixData([]);
      }
    } catch (error) {
      console.error('Load AI matrix error:', error);
      setAiMatrixData([]);
    } finally {
      setLoadingAiMatrix(false);
    }
  };

  const calculateMatrix = async () => {
    if (!selectedDomain) {
      toast.error('Please select a domain');
      return;
    }

    const selectedDomainData = domains.find(d => d.id === selectedDomain);
    if (!selectedDomainData) {
      toast.error('Domain not found');
      return;
    }

    try {
      setCalculating(true);
      toast.loading('Calculating matrix with AI insights (this may take 2-3 minutes)...', { id: 'calculate' });
      
      const domainUrl = selectedDomainData.gsc_integration?.domain_url || selectedDomainData.domain;
      
      const response = await fetch('/api/global-visibility-matrix/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: selectedDomain,
          domainUrl,
          aiCheckEnabled: true,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || 'Matrix calculated successfully!', { id: 'calculate' });
        await loadAIMatrixData();
      } else {
        toast.error(data.error || 'Failed to calculate matrix', { id: 'calculate' });
      }
    } catch (error) {
      console.error('Calculate matrix error:', error);
      toast.error('Failed to calculate matrix', { id: 'calculate' });
    } finally {
      setCalculating(false);
    }
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
      'IRQ': 'Iraq', 'IRL': 'Ireland', 'IMN': 'Isle of Man', 'ISR': 'Israel', 'IL': 'Israel',
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
      'IE': 'Ireland', 'IM': 'Isle of Man', 'IL': 'Israel', 'IT': 'Italy',
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

  const getCountryFlag = (code: string) => {
    // Convert country code to flag emoji
    const codePoints = code
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const getPerformanceColor = (clicks: number, maxClicks: number) => {
    const percentage = (clicks / maxClicks) * 100;
    if (percentage >= 80) return 'bg-green-100 text-green-700';
    if (percentage >= 50) return 'bg-yellow-100 text-yellow-700';
    if (percentage >= 20) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  const getPositionBadge = (position: number) => {
    if (position <= 3) return 'bg-green-100 text-green-700';
    if (position <= 10) return 'bg-blue-100 text-blue-700';
    if (position <= 20) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const maxClicks = Math.max(...countries.map(c => c.clicks), 1);
  const selectedDomainData = domains.find(d => d.id === selectedDomain);

  // Prepare chart data
  const topCountries = countries.slice(0, 10);
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

  const pieChartData = topCountries.map((country, index) => ({
    name: getCountryName(country.country),
    value: country.clicks,
    color: COLORS[index % COLORS.length],
  }));

  const impressionsPieChartData = topCountries.map((country, index) => ({
    name: getCountryName(country.country),
    value: country.impressions,
    color: COLORS[index % COLORS.length],
  }));

  const barChartData = topCountries.map(country => ({
    name: getCountryName(country.country).length > 15 
      ? getCountryName(country.country).substring(0, 12) + '...' 
      : getCountryName(country.country),
    fullName: getCountryName(country.country),
    clicks: country.clicks,
    impressions: country.impressions,
    ctr: country.ctr * 100,
    position: country.position,
  }));

  const totalClicks = countries.reduce((sum, c) => sum + c.clicks, 0);
  const totalImpressions = countries.reduce((sum, c) => sum + c.impressions, 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgPosition = countries.length > 0 ? countries.reduce((sum, c) => sum + c.position, 0) / countries.length : 0;

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

  if (domains.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Verified Domains</h2>
            <p className="text-gray-600 mb-4">
              You need to add and verify a domain on Google Search Console before viewing regional strength comparison.
            </p>
            <a
              href="/dashboard/google-search-console"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add Domain
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Regional Strength Comparison</h1>
            <p className="text-gray-600">Identify weak regions and underperforming countries to prioritize improvement efforts</p>
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
          </div>

          {selectedDomainData?.last_synced_at && (
            <p className="text-xs text-gray-500 mt-2">
              Last synced: {new Date(selectedDomainData.last_synced_at).toLocaleString()}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('ai')}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === 'ai'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Brain className="w-5 h-5" />
                Region VS AI
              </button>
              <button
                onClick={() => setActiveTab('google')}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === 'google'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Globe className="w-5 h-5" />
                Region VS Google Search
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'ai' ? (
          // Region VS AI Tab
          <>
            {loadingAiMatrix ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading AI insights...</p>
                </div>
              </div>
            ) : aiMatrixData.length > 0 ? (
              <>
                {/* AI Summary Stats - Focus on Weak Regions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-sm border border-red-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-red-700">Weak AI Regions</h3>
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-3xl font-bold text-red-900">
                      {aiMatrixData.filter(c => c.ai_visibility_score < 60).length}
                    </p>
                    <p className="text-sm text-red-600 mt-1">AI score &lt; 60</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm border border-orange-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-orange-700">Low Performance</h3>
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                    </div>

                    <p className="text-3xl font-bold text-orange-900">
                      {aiMatrixData.filter(c => c.overall_visibility_score < (aiMatrixData.reduce((sum, c) => sum + c.overall_visibility_score, 0) / aiMatrixData.length)).length}
                    </p>
                    <p className="text-sm text-orange-600 mt-1">Below average</p>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-sm border border-yellow-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-yellow-700">Limited Platform</h3>
                      <Target className="w-5 h-5 text-yellow-600" />
                    </div>
                    <p className="text-3xl font-bold text-yellow-900">
                      {aiMatrixData.filter(c => (c.ai_platforms_present?.length || 0) < 3).length}
                    </p>
                    <p className="text-sm text-yellow-600 mt-1">&lt; 3 platforms</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-green-700">Strong Regions</h3>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-green-900">
                      {aiMatrixData.filter(c => c.overall_visibility_score >= 70).length}
                    </p>
                    <p className="text-sm text-green-600 mt-1">Overall score ≥ 70</p>
                  </div>
                </div>

                {/* AI Charts Section */}
                <div className="space-y-6 mb-6">
                  {/* Top row: Weakest Regions */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Weakest Countries by AI Score */}
                    <div className="bg-white rounded-lg shadow-sm border border-red-100 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Bottom 10 Countries by AI Score</h3>
                      <p className="text-sm text-gray-600 mb-4">Regions with weakest AI presence - Priority targets</p>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={aiMatrixData.slice().sort((a, b) => a.ai_visibility_score - b.ai_visibility_score).slice(0, 10).map(c => ({
                          name: getCountryName(c.country_code).length > 15 
                            ? getCountryName(c.country_code).substring(0, 12) + '...' 
                            : getCountryName(c.country_code),
                          fullName: getCountryName(c.country_code),
                          score: c.ai_visibility_score,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={100} 
                            style={{ fontSize: '11px' }}
                          />
                          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                            formatter={(value: any) => [Number(value).toFixed(1), 'AI Score']}
                          />
                          <Legend />
                          <Bar dataKey="score" fill="#ef4444" name="AI Score" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Weakest Countries by Overall Score */}
                    <div className="bg-white rounded-lg shadow-sm border border-orange-100 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Bottom 10 Countries by Overall Performance</h3>
                      <p className="text-sm text-gray-600 mb-4">Regions needing immediate attention</p>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={aiMatrixData.slice().sort((a, b) => a.overall_visibility_score - b.overall_visibility_score).slice(0, 10).map(c => ({
                          name: getCountryName(c.country_code).length > 15 
                            ? getCountryName(c.country_code).substring(0, 12) + '...' 
                            : getCountryName(c.country_code),
                          fullName: getCountryName(c.country_code),
                          score: c.overall_visibility_score,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={100} 
                            style={{ fontSize: '11px' }}
                          />
                          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                            formatter={(value: any) => [Number(value).toFixed(1), 'Overall Score']}
                          />
                          <Legend />
                          <Bar dataKey="score" fill="#f97316" name="Overall Score" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Second row: Weakest Platform Coverage */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Lowest Platform Coverage Chart */}
                    <div className="bg-white rounded-lg shadow-sm border border-yellow-100 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Bottom 10 - Limited Platform Coverage</h3>
                      <p className="text-sm text-gray-600 mb-4">Regions with fewest AI platforms</p>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={aiMatrixData.slice().sort((a, b) => (a.ai_platforms_present?.length || 0) - (b.ai_platforms_present?.length || 0)).slice(0, 10).map(c => ({
                          name: getCountryName(c.country_code).length > 15 
                            ? getCountryName(c.country_code).substring(0, 12) + '...' 
                            : getCountryName(c.country_code),
                          fullName: getCountryName(c.country_code),
                          platforms: c.ai_platforms_present?.length || 0,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={100} 
                            style={{ fontSize: '11px' }}
                          />
                          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} domain={[0, 5]} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                            formatter={(value: any) => [`${value}/5 platforms`, 'Coverage']}
                          />
                          <Legend />
                          <Bar dataKey="platforms" fill="#eab308" name="Platforms" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Performance Gap Chart */}
                    <div className="bg-white rounded-lg shadow-sm border border-purple-100 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Bottom 10 - Biggest Performance Gaps</h3>
                      <p className="text-sm text-gray-600 mb-4">Organic vs AI score gap</p>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={aiMatrixData.slice().sort((a, b) => (b.organic_score - b.ai_visibility_score) - (a.organic_score - a.ai_visibility_score)).slice(0, 10).map(c => ({
                          name: getCountryName(c.country_code).length > 15 
                            ? getCountryName(c.country_code).substring(0, 12) + '...' 
                            : getCountryName(c.country_code),
                          fullName: getCountryName(c.country_code),
                          gap: c.organic_score - c.ai_visibility_score,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={100} 
                            style={{ fontSize: '11px' }}
                          />
                          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                            formatter={(value: any) => [Number(value).toFixed(1), 'Gap']}
                          />
                          <Legend />
                          <Bar dataKey="gap" fill="#a855f7" name="Performance Gap" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Third row: Weakest Regions Comparison */}
                  <div className="bg-white rounded-lg shadow-sm border border-red-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Bottom 15 Regions - AI vs Organic Comparison</h3>
                    <p className="text-sm text-gray-600 mb-4">Weakest performing regions requiring improvement</p>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={aiMatrixData.slice().sort((a, b) => a.overall_visibility_score - b.overall_visibility_score).slice(0, 15).map(c => ({
                        name: getCountryName(c.country_code).length > 15 
                          ? getCountryName(c.country_code).substring(0, 12) + '...' 
                          : getCountryName(c.country_code),
                        fullName: getCountryName(c.country_code),
                        organic: c.organic_score,
                        ai: c.ai_visibility_score,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={120} 
                          style={{ fontSize: '11px' }}
                        />
                        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          formatter={(value: any) => Number(value).toFixed(1)}
                        />
                        <Legend />
                        <Bar dataKey="organic" fill="#10b981" radius={[4, 4, 0, 0]} name="Organic Score" />
                        <Bar dataKey="ai" fill="#3b82f6" radius={[4, 4, 0, 0]} name="AI Score" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Data Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <Brain className="w-6 h-6 text-purple-600" />
                          Region vs AI Insights - Detailed Data
                        </h2>
                        <p className="text-sm text-gray-600 mt-2">
                          AI visibility analysis across {aiMatrixData.length} {aiMatrixData.length === 1 ? 'region' : 'regions'}
                        </p>
                      </div>
                    </div>
                  </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Country / Region
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Organic Score
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                          <div className="flex items-center justify-end gap-1">
                            <Brain className="w-4 h-4" />
                            AI Score
                          </div>
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                          AI Platforms (5)
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Overall Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {aiMatrixData.map((country, index) => (
                        <tr 
                          key={country.id || index} 
                          className="transition-all duration-150 hover:bg-purple-50 hover:shadow-sm"
                        >
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900 text-sm">
                              {getCountryName(country.country_code)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{ width: `${Math.min(100, country.organic_score)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900 w-12 text-right">
                                {country.organic_score.toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    country.ai_visibility_score === 0 ? 'bg-red-500' :
                                    country.ai_visibility_score < 30 ? 'bg-orange-500' :
                                    country.ai_visibility_score < 70 ? 'bg-yellow-500' :
                                    'bg-blue-500'
                                  }`}
                                  style={{ width: `${Math.min(100, country.ai_visibility_score)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900 w-12 text-right">
                                {country.ai_visibility_score.toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              {[
                                { key: 'chatgpt', name: 'GPT' },
                                { key: 'claude', name: 'Claude' },
                                { key: 'gemini', name: 'Gemini' },
                                { key: 'perplexity', name: 'Perplx' },
                                { key: 'groq', name: 'Groq' }
                              ].map(({ key, name }) => {
                                const isPresent = country.ai_platforms_present?.includes(key);
                                return (
                                  <span
                                    key={key}
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${
                                      isPresent
                                        ? 'bg-green-100 text-green-800 border border-green-300'
                                        : 'bg-gray-100 text-gray-500 border border-gray-300'
                                    }`}
                                    title={isPresent ? 'Domain found' : 'Domain not found'}
                                  >
                                    {name}
                                    {isPresent ? (
                                      <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
                                    ) : (
                                      <X className="w-3 h-3 text-gray-400" strokeWidth={3} />
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                            <div className="text-center mt-1">
                              <span className="text-xs font-semibold text-gray-700">
                                {country.ai_platforms_present?.length || 0}/5
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-purple-100 text-purple-700">
                              {country.overall_visibility_score.toFixed(1)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Showing <span className="font-semibold text-gray-900">{aiMatrixData.length}</span> {aiMatrixData.length === 1 ? 'region' : 'regions'}
                    </span>
                    <a href="/dashboard/global-visibility-matrix" className="text-purple-600 hover:text-purple-700 font-medium">
                      View full matrix →
                    </a>
                  </div>
                </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No AI Insights Available</h3>
                <p className="text-gray-600 mb-4">
                  Calculate the Global Visibility Matrix to see AI platform insights for this domain.
                </p>
                <button
                  onClick={calculateMatrix}
                  disabled={calculating || !selectedDomain}
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-5 h-5 ${calculating ? 'animate-spin' : ''}`} />
                  {calculating ? 'Calculating...' : 'Calculate Matrix'}
                </button>
              </div>
            )}
          </>
        ) : (
          // Region VS Google Search Tab
          <>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading regional data...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Summary Stats */}
                {countries.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Total Countries</h3>
                    <MapIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{countries.length}</p>
                  <p className="text-sm text-gray-500 mt-1">Active regions</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Total Clicks</h3>
                    <MousePointerClick className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{formatNumber(totalClicks)}</p>
                  <p className="text-sm text-gray-500 mt-1">Across all regions</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Total Impressions</h3>
                    <Eye className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{formatNumber(totalImpressions)}</p>
                  <p className="text-sm text-gray-500 mt-1">Total visibility</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Avg CTR</h3>
                    <Target className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{avgCTR.toFixed(2)}%</p>
                  <p className="text-sm text-gray-500 mt-1">Click-through rate</p>
                </div>
              </div>
            )}

            {/* Charts Section */}
            {countries.length > 0 && (
              <>
                {/* Performance Bar Charts - Grid of 4 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Clicks Chart */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Countries by Clicks</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100} 
                          style={{ fontSize: '11px' }}
                        />
                        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          formatter={(value: any) => formatNumber(Number(value))}
                        />
                        <Legend />
                        <Bar dataKey="clicks" fill="#3b82f6" name="Clicks" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Impressions Chart */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Countries by Impressions</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100} 
                          style={{ fontSize: '11px' }}
                        />
                        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          formatter={(value: any) => formatNumber(Number(value))}
                        />
                        <Legend />
                        <Bar dataKey="impressions" fill="#10b981" name="Impressions" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* CTR Chart */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Countries by CTR</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100} 
                          style={{ fontSize: '11px' }}
                        />
                        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          formatter={(value: any) => `${Number(value).toFixed(2)}%`}
                        />
                        <Legend />
                        <Bar dataKey="ctr" fill="#8b5cf6" name="CTR (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Position Chart */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Countries by Position</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100} 
                          style={{ fontSize: '11px' }}
                        />
                        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          formatter={(value: any) => Number(value).toFixed(1)}
                        />
                        <Legend />
                        <Bar dataKey="position" fill="#f97316" name="Position" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie Charts - Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Pie Chart - Click Distribution */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Click Distribution (Top 10)</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          outerRadius={110}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}
                          content={({ active, payload }: any) => {
                            if (active && payload && payload.length > 0) {
                              const data = payload[0];
                              const clicks = formatNumber(Number(data.value));
                              const percentage = ((Number(data.value) / totalClicks) * 100).toFixed(1);
                              return (
                                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                                  <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
                                  <p className="text-sm text-gray-700">
                                    <span className="font-medium">Clicks:</span> {clicks} ({percentage}%)
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          align="right"
                          layout="vertical"
                          iconType="circle"
                          wrapperStyle={{ 
                            paddingLeft: '20px',
                            fontSize: '12px',
                            maxHeight: '300px',
                            overflowY: 'auto'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie Chart - Impressions Distribution */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Impressions Distribution (Top 10)</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={impressionsPieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          outerRadius={110}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {impressionsPieChartData.map((entry, index) => (
                            <Cell key={`impressions-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}
                          content={({ active, payload }: any) => {
                            if (active && payload && payload.length > 0) {
                              const data = payload[0];
                              const impressions = formatNumber(Number(data.value));
                              const percentage = ((Number(data.value) / totalImpressions) * 100).toFixed(1);
                              return (
                                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                                  <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
                                  <p className="text-sm text-gray-700">
                                    <span className="font-medium">Impressions:</span> {impressions} ({percentage}%)
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          align="right"
                          layout="vertical"
                          iconType="circle"
                          wrapperStyle={{ 
                            paddingLeft: '20px',
                            fontSize: '12px',
                            maxHeight: '300px',
                            overflowY: 'auto'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* CTR vs Position Correlation */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">CTR vs Position Correlation</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={100} 
                        style={{ fontSize: '11px' }}
                      />
                      <YAxis 
                        yAxisId="left" 
                        stroke="#8b5cf6" 
                        style={{ fontSize: '12px' }}
                        label={{ value: 'CTR (%)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke="#f97316" 
                        style={{ fontSize: '12px' }}
                        reversed
                        label={{ value: 'Position', angle: 90, position: 'insideRight', style: { fontSize: '12px' } }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value: any, name: string) => {
                          if (name === 'CTR (%)') return `${Number(value).toFixed(2)}%`;
                          if (name === 'Position') return Number(value).toFixed(1);
                          return value;
                        }}
                      />
                      <Legend />
                      <Line 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="ctr" 
                        stroke="#8b5cf6" 
                        name="CTR (%)" 
                        strokeWidth={2}
                        dot={{ fill: '#8b5cf6' }}
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="position" 
                        stroke="#f97316" 
                        name="Position" 
                        strokeWidth={2}
                        dot={{ fill: '#f97316' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

             {/* Regional Strength Table */}
             <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
               <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                 <div className="flex items-center justify-between">
                   <div>
                     <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                       <Globe className="w-6 h-6 text-blue-600" />
                       Regional Performance Analysis
                     </h2>
                     <p className="text-sm text-gray-600 mt-2">
                       Comprehensive breakdown of search performance across {countries.length} {countries.length === 1 ? 'region' : 'regions'}
                     </p>
                   </div>
                 </div>
               </div>

               <div className="overflow-x-auto">
                 {countries.length === 0 ? (
                   <div className="text-center py-16 px-6">
                     <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                       <Globe className="w-10 h-10 text-gray-400" />
                     </div>
                     <h3 className="text-lg font-semibold text-gray-900 mb-2">No Regional Data Available</h3>
                     <p className="text-gray-500 mb-1">No data found for the selected period.</p>
                     <p className="text-sm text-gray-400">Try syncing data from the GSC Analytics page or selecting a different time range.</p>
                   </div>
                 ) : (
                   <table className="w-full">
                     <thead>
                       <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                           <div className="flex items-center gap-2">
                             <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">
                               #
                             </span>
                             Rank
                           </div>
                         </th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                           Country / Region
                         </th>
                         <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                           <div className="flex items-center justify-end gap-1">
                             <MousePointerClick className="w-4 h-4" />
                             Clicks
                           </div>
                         </th>
                         <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                           <div className="flex items-center justify-end gap-1">
                             <Eye className="w-4 h-4" />
                             Impressions
                           </div>
                         </th>
                         <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                           <div className="flex items-center justify-end gap-1">
                             <Target className="w-4 h-4" />
                             CTR
                           </div>
                         </th>
                         <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                           <div className="flex items-center justify-end gap-1">
                             <TrendingUp className="w-4 h-4" />
                             Position
                           </div>
                         </th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-100">
                       {countries.map((country, index) => (
                         <tr 
                           key={country.id || index} 
                           className="transition-all duration-150 hover:bg-blue-50 hover:shadow-sm"
                         >
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="w-10 h-10 flex items-center justify-center">
                               <span className="text-gray-600 font-semibold text-sm">#{index + 1}</span>
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <div className="font-semibold text-gray-900 text-sm">
                               {getCountryName(country.country)}
                             </div>
                           </td>
                           <td className="px-6 py-4 text-right">
                             <div className="space-y-1">
                               <div className="font-bold text-gray-900 text-sm">
                                 {formatNumber(country.clicks)}
                               </div>
                               <div className="text-xs text-gray-500">
                                 <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                                   {((country.clicks / totalClicks) * 100).toFixed(1)}%
                                 </span>
                               </div>
                             </div>
                           </td>
                           <td className="px-6 py-4 text-right">
                             <div className="space-y-1">
                               <div className="font-semibold text-gray-900 text-sm">
                                 {formatNumber(country.impressions)}
                               </div>
                               <div className="text-xs text-gray-500">
                                 <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                                   {((country.impressions / totalImpressions) * 100).toFixed(1)}%
                                 </span>
                               </div>
                             </div>
                           </td>
                           <td className="px-6 py-4 text-right">
                             <div className="font-semibold text-gray-900 text-sm">
                               {(country.ctr * 100).toFixed(2)}%
                             </div>
                           </td>
                           <td className="px-6 py-4 text-right">
                             <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${getPositionBadge(country.position)}`}>
                               #{country.position.toFixed(1)}
                             </span>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 )}
               </div>
               
               {countries.length > 0 && (
                 <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                   <div className="flex items-center justify-between text-sm">
                     <span className="text-gray-600">
                       Showing <span className="font-semibold text-gray-900">{countries.length}</span> {countries.length === 1 ? 'region' : 'regions'}
                     </span>
                   </div>
                 </div>
               )}
             </div>
              </>
            )}
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

