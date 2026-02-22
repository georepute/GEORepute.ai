'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Globe, TrendingUp, TrendingDown, MousePointerClick, Eye, Target, RefreshCw, Download, AlertCircle, CheckCircle, ArrowUpRight, ArrowDownRight, Check, X, Brain, Sparkles, Bot, Zap, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

interface Domain {
  id: string;
  domain: string;
  gsc_integration?: {
    domain_url?: string;
    verification_status?: 'pending' | 'verified' | 'failed';
    last_synced_at?: string;
  } | null;
}

interface MatrixCountry {
  id: string;
  country_code: string;
  gsc_clicks: number;
  gsc_impressions: number;
  gsc_ctr: number;
  gsc_avg_position: number;
  organic_score: number;
  ai_visibility_score: number;
  demand_score: number;
  overall_visibility_score: number;
  quadrant: 'strong' | 'emerging' | 'declining' | 'absent';
  opportunity_score: number;
  // New source-based fields
  ai_domain_found?: boolean;
  ai_best_position?: number | null;
  ai_mentioned_competitors?: string[];
  ai_platforms_present?: string[];
}

export default function GlobalVisibilityMatrixPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [countries, setCountries] = useState<MatrixCountry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof MatrixCountry>('opportunity_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [aiCheckEnabled] = useState(true); // Always enabled
  const [aiResults, setAiResults] = useState<any>(null);
  const [detectedIndustry, setDetectedIndustry] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ai' | 'google'>('ai');

  useEffect(() => {
    loadDomains();
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      loadMatrixData();
    }
  }, [selectedDomain]);

  const loadDomains = async () => {
    try {
      setLoadingDomains(true);
      const response = await fetch('/api/integrations/google-search-console/domains');
      const data = await response.json();
      
      const verifiedDomains = (data.domains || []).filter((d: Domain) => 
        d.gsc_integration?.verification_status === 'verified'
      );
      
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

  const loadMatrixData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/global-visibility-matrix?domainId=${selectedDomain}`
      );
      const data = await response.json();
      
      if (data.success) {
        setCountries(data.data || []);
        
        if (data.data.length === 0) {
          toast(data.message || 'No data available. Calculate the matrix to get started.', {
            icon: '📊',
          });
        }
      } else {
        toast.error(data.error || 'Failed to load matrix data');
      }
    } catch (error) {
      console.error('Load matrix error:', error);
      toast.error('Failed to load matrix data');
    } finally {
      setLoading(false);
    }
  };

  const calculateMatrix = async () => {
    if (!selectedDomain) {
      toast.error('Please select a domain');
      return;
    }

    // Get domain URL for brand name
    const selectedDomainData = domains.find(d => d.id === selectedDomain);
    if (!selectedDomainData) {
      toast.error('Domain not found');
      return;
    }

    try {
      setCalculating(true);
      toast.loading('Analyzing domain and checking AI presence across countries (this may take 2-3 minutes)...', { id: 'calculate' });
      
      const domainUrl = selectedDomainData.gsc_integration?.domain_url || selectedDomainData.domain;
      
      const response = await fetch('/api/global-visibility-matrix/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: selectedDomain,
          domainUrl, // Pass domain URL for brand extraction and industry detection
          aiCheckEnabled: true, // Always enabled
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || 'Matrix calculated successfully!', { id: 'calculate' });
        
        // Store detected industry
        if (data.detectedIndustry) {
          setDetectedIndustry(data.detectedIndustry);
        }
        
        // Store AI results if available
        if (data.aiPresence) {
          setAiResults(data.aiPresence);
          
          // Show summary of AI results with detected info
          const weakCount = data.aiPresence.weakPresence?.length || 0;
          const absentCount = data.aiPresence.absentCountries?.length || 0;
          
          const industryInfo = data.detectedIndustry ? ` (Industry: ${data.detectedIndustry})` : '';
          
          if (absentCount > 0 || weakCount > 0) {
            toast(
              `AI Check${industryInfo}: ${weakCount} weak, ${absentCount} absent`,
              { icon: '🤖', duration: 5000 }
            );
          }
        }
        
        await loadMatrixData();
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

  const getCountryName = (code: string) => {
    if (!code || code === 'UNKNOWN') return 'Unknown';

    const upperCode = code.toUpperCase();

    // Comprehensive mapping for 3-letter ISO (ISO 3166-1 alpha-3) and 2-letter (alpha-2) - from regional strength comparison
    const countryMapping: { [key: string]: string } = {
      'AFG': 'Afghanistan', 'ALA': 'Åland Islands', 'ALB': 'Albania', 'DZA': 'Algeria',
      'ASM': 'American Samoa', 'AND': 'Andorra', 'AGO': 'Angola', 'AIA': 'Anguilla',
      'ATA': 'Antarctica', 'ATG': 'Antigua and Barbuda', 'ARG': 'Argentina', 'ARM': 'Armenia',
      'ABW': 'Aruba', 'AUS': 'Australia', 'AUT': 'Austria', 'AZE': 'Azerbaijan',
      'BHS': 'Bahamas', 'BHR': 'Bahrain', 'BGD': 'Bangladesh', 'BRB': 'Barbados',
      'BLR': 'Belarus', 'BEL': 'Belgium', 'BLZ': 'Belize', 'BEN': 'Benin',
      'BMU': 'Bermuda', 'BTN': 'Bhutan', 'BOL': 'Bolivia', 'BES': 'Bonaire, Sint Eustatius and Saba',
      'BIH': 'Bosnia and Herzegovina', 'BWA': 'Botswana', 'BVT': 'Bouvet Island', 'BRA': 'Brazil',
      'IOT': 'British Indian Ocean Territory', 'BRN': 'Brunei', 'BGR': 'Bulgaria', 'BFA': 'Burkina Faso',
      'BDI': 'Burundi',
      'CPV': 'Cabo Verde', 'KHM': 'Cambodia', 'CMR': 'Cameroon', 'CAN': 'Canada',
      'CYM': 'Cayman Islands', 'CAF': 'Central African Republic', 'TCD': 'Chad', 'CHL': 'Chile',
      'CHN': 'China', 'CXR': 'Christmas Island', 'CCK': 'Cocos (Keeling) Islands', 'COL': 'Colombia',
      'COM': 'Comoros', 'COG': 'Congo', 'COD': 'Congo (Democratic Republic)', 'COK': 'Cook Islands',
      'CRI': 'Costa Rica', 'CIV': 'Côte d\'Ivoire', 'HRV': 'Croatia', 'CUB': 'Cuba',
      'CUW': 'Curaçao', 'CYP': 'Cyprus', 'CZE': 'Czech Republic',
      'DNK': 'Denmark', 'DJI': 'Djibouti', 'DMA': 'Dominica', 'DOM': 'Dominican Republic',
      'ECU': 'Ecuador', 'EGY': 'Egypt', 'SLV': 'El Salvador', 'GNQ': 'Equatorial Guinea',
      'ERI': 'Eritrea', 'EST': 'Estonia', 'SWZ': 'Eswatini', 'ETH': 'Ethiopia',
      'FLK': 'Falkland Islands', 'FRO': 'Faroe Islands', 'FJI': 'Fiji', 'FIN': 'Finland',
      'FRA': 'France', 'GUF': 'French Guiana', 'PYF': 'French Polynesia', 'ATF': 'French Southern Territories',
      'GAB': 'Gabon', 'GMB': 'Gambia', 'GEO': 'Georgia', 'DEU': 'Germany',
      'GHA': 'Ghana', 'GIB': 'Gibraltar', 'GRC': 'Greece', 'GRL': 'Greenland',
      'GRD': 'Grenada', 'GLP': 'Guadeloupe', 'GUM': 'Guam', 'GTM': 'Guatemala',
      'GGY': 'Guernsey', 'GIN': 'Guinea', 'GNB': 'Guinea-Bissau', 'GUY': 'Guyana',
      'HTI': 'Haiti', 'HMD': 'Heard Island and McDonald Islands', 'VAT': 'Holy See', 'HND': 'Honduras',
      'HKG': 'Hong Kong', 'HUN': 'Hungary',
      'ISL': 'Iceland', 'IND': 'India', 'IDN': 'Indonesia', 'IRN': 'Iran',
      'IRQ': 'Iraq', 'IRL': 'Ireland', 'IMN': 'Isle of Man', 'ISR': 'Israel', 'IL': 'Israel', 'ITA': 'Italy',
      'JAM': 'Jamaica', 'JPN': 'Japan', 'JEY': 'Jersey', 'JOR': 'Jordan',
      'KAZ': 'Kazakhstan', 'KEN': 'Kenya', 'KIR': 'Kiribati', 'PRK': 'North Korea',
      'KOR': 'South Korea', 'KWT': 'Kuwait', 'KGZ': 'Kyrgyzstan',
      'LAO': 'Laos', 'LVA': 'Latvia', 'LBN': 'Lebanon', 'LSO': 'Lesotho',
      'LBR': 'Liberia', 'LBY': 'Libya', 'LIE': 'Liechtenstein', 'LTU': 'Lithuania', 'LUX': 'Luxembourg',
      'MAC': 'Macao', 'MDG': 'Madagascar', 'MWI': 'Malawi', 'MYS': 'Malaysia',
      'MDV': 'Maldives', 'MLI': 'Mali', 'MLT': 'Malta', 'MHL': 'Marshall Islands',
      'MTQ': 'Martinique', 'MRT': 'Mauritania', 'MUS': 'Mauritius', 'MYT': 'Mayotte',
      'MEX': 'Mexico', 'FSM': 'Micronesia', 'MDA': 'Moldova', 'MCO': 'Monaco',
      'MNG': 'Mongolia', 'MNE': 'Montenegro', 'MSR': 'Montserrat', 'MAR': 'Morocco',
      'MOZ': 'Mozambique', 'MMR': 'Myanmar',
      'NAM': 'Namibia', 'NRU': 'Nauru', 'NPL': 'Nepal', 'NLD': 'Netherlands',
      'NCL': 'New Caledonia', 'NZL': 'New Zealand', 'NIC': 'Nicaragua', 'NER': 'Niger',
      'NGA': 'Nigeria', 'NIU': 'Niue', 'NFK': 'Norfolk Island', 'MKD': 'North Macedonia',
      'MNP': 'Northern Mariana Islands', 'NOR': 'Norway', 'OMN': 'Oman',
      'PAK': 'Pakistan', 'PLW': 'Palau', 'PSE': 'Israel', 'PAN': 'Panama',
      'PNG': 'Papua New Guinea', 'PRY': 'Paraguay', 'PER': 'Peru', 'PHL': 'Philippines',
      'PCN': 'Pitcairn', 'POL': 'Poland', 'PRT': 'Portugal', 'PRI': 'Puerto Rico',
      'QAT': 'Qatar', 'REU': 'Réunion', 'ROU': 'Romania', 'RUS': 'Russia', 'RWA': 'Rwanda',
      'BLM': 'Saint Barthélemy', 'SHN': 'Saint Helena', 'KNA': 'Saint Kitts and Nevis',
      'LCA': 'Saint Lucia', 'MAF': 'Saint Martin', 'SPM': 'Saint Pierre and Miquelon',
      'VCT': 'Saint Vincent and the Grenadines', 'WSM': 'Samoa', 'SMR': 'San Marino',
      'STP': 'Sao Tome and Principe', 'SAU': 'Saudi Arabia', 'SEN': 'Senegal', 'SRB': 'Serbia',
      'SYC': 'Seychelles', 'SLE': 'Sierra Leone', 'SGP': 'Singapore', 'SXM': 'Sint Maarten',
      'SVK': 'Slovakia', 'SVN': 'Slovenia', 'SLB': 'Solomon Islands', 'SOM': 'Somalia',
      'ZAF': 'South Africa', 'SGS': 'South Georgia and the South Sandwich Islands', 'SSD': 'South Sudan',
      'ESP': 'Spain', 'LKA': 'Sri Lanka', 'SDN': 'Sudan', 'SUR': 'Suriname',
      'SJM': 'Svalbard and Jan Mayen', 'SWE': 'Sweden', 'CHE': 'Switzerland', 'SYR': 'Syria',
      'TWN': 'Taiwan', 'TJK': 'Tajikistan', 'TZA': 'Tanzania', 'THA': 'Thailand',
      'TLS': 'Timor-Leste', 'TGO': 'Togo', 'TKL': 'Tokelau', 'TON': 'Tonga',
      'TTO': 'Trinidad and Tobago', 'TUN': 'Tunisia', 'TUR': 'Turkey', 'TKM': 'Turkmenistan',
      'TCA': 'Turks and Caicos Islands', 'TUV': 'Tuvalu',
      'UGA': 'Uganda', 'UKR': 'Ukraine', 'ARE': 'United Arab Emirates', 'GBR': 'United Kingdom',
      'USA': 'United States', 'UMI': 'United States Minor Outlying Islands', 'URY': 'Uruguay',
      'UZB': 'Uzbekistan',
      'VUT': 'Vanuatu', 'VEN': 'Venezuela', 'VNM': 'Vietnam', 'VGB': 'Virgin Islands (British)',
      'VIR': 'Virgin Islands (U.S.)', 'WLF': 'Wallis and Futuna', 'ESH': 'Western Sahara',
      'YEM': 'Yemen', 'ZMB': 'Zambia', 'ZWE': 'Zimbabwe',
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

    if (countryMapping[upperCode]) return countryMapping[upperCode];
    try {
      const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
      if (upperCode.length === 2) return regionNames.of(upperCode) || code;
    } catch {
      return code;
    }
    return code;
  };

  const getQuadrantColor = (quadrant: string) => {
    switch (quadrant) {
      case 'strong': return 'bg-green-100 text-green-700 border-green-300';
      case 'emerging': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'declining': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'absent': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getQuadrantIcon = (quadrant: string) => {
    switch (quadrant) {
      case 'strong': return <CheckCircle className="w-4 h-4" />;
      case 'emerging': return <ArrowUpRight className="w-4 h-4" />;
      case 'declining': return <ArrowDownRight className="w-4 h-4" />;
      case 'absent': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleSort = (field: keyof MatrixCountry) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedCountries = countries
    .filter(country => {
      if (searchQuery && !getCountryName(country.country_code).toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const aValue = a[sortField] as number;
      const bValue = b[sortField] as number;
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num));
  };

  const formatDecimal = (num: number, decimals: number = 2) => {
    return num.toFixed(decimals);
  };

  const exportToCSV = () => {
    const headers = [
      'Country', 
      'Country Code',
      'Organic Score', 
      'AI Score',
      'Domain Found in AI',
      'AI Best Position',
      'Platform Coverage',
      'ChatGPT',
      'Claude',
      'Gemini',
      'Perplexity',
      'Groq',
      'Top Competitors',
      'Demand Score', 
      'Overall Score', 
      'Quadrant', 
      'Opportunity Score', 
      'Clicks', 
      'Impressions', 
      'CTR', 
      'Avg Position'
    ];
    const rows = filteredAndSortedCountries.map(c => [
      getCountryName(c.country_code),
      c.country_code,
      c.organic_score,
      c.ai_visibility_score,
      c.ai_domain_found ? 'YES' : 'NO',
      c.ai_best_position || 'N/A',
      `${c.ai_platforms_present?.length || 0}/5`,
      c.ai_platforms_present?.includes('chatgpt') ? 'YES' : 'NO',
      c.ai_platforms_present?.includes('claude') ? 'YES' : 'NO',
      c.ai_platforms_present?.includes('gemini') ? 'YES' : 'NO',
      c.ai_platforms_present?.includes('perplexity') ? 'YES' : 'NO',
      c.ai_platforms_present?.includes('groq') ? 'YES' : 'NO',
      c.ai_mentioned_competitors?.slice(0, 5).join(';') || 'none',
      c.demand_score,
      c.overall_visibility_score,
      c.quadrant,
      c.opportunity_score,
      c.gsc_clicks,
      c.gsc_impressions,
      c.gsc_ctr,
      c.gsc_avg_position,
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `global-visibility-matrix-ai-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Exported to CSV with AI data');
  };

  if (loadingDomains) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Global Visibility Matrix</h1>
        </div>
        <p className="text-gray-600">
          Identify where your brand doesn't exist globally and discover gaps in AI platform visibility
        </p>
      </div>


      {/* Controls */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Domain
            </label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.gsc_integration?.domain_url || domain.domain}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={calculateMatrix}
              disabled={calculating || !selectedDomain}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
              {calculating ? 'Calculating...' : 'Calculate All-Time Matrix'}
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={exportToCSV}
              disabled={countries.length === 0}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
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

      {/* AI Results Alert */}
      {aiResults && (aiResults.weakPresence?.length > 0 || aiResults.absentCountries?.length > 0) && (
        <div className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl shadow-sm border border-orange-200 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Presence Alert</h3>
              
              {aiResults.absentCountries?.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-red-700 mb-1">
                    ❌ Brand NOT mentioned in {aiResults.absentCountries.length} countries:
                  </p>
                  <p className="text-sm text-gray-700">
                    {aiResults.absentCountries.slice(0, 10).join(', ')}
                    {aiResults.absentCountries.length > 10 && ` and ${aiResults.absentCountries.length - 10} more`}
                  </p>
                </div>
              )}
              
              {aiResults.weakPresence?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-orange-700 mb-1">
                    ⚠️ Weak AI presence in {aiResults.weakPresence.length} countries:
                  </p>
                  <div className="text-sm text-gray-700">
                    {aiResults.weakPresence.slice(0, 5).map((item: any, idx: number) => (
                      <span key={idx}>
                        {item.country} (score: {item.score})
                        {idx < Math.min(4, aiResults.weakPresence.length - 1) && ', '}
                      </span>
                    ))}
                    {aiResults.weakPresence.length > 5 && ` and ${aiResults.weakPresence.length - 5} more`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'ai' ? (
        // Region VS AI Tab
        <>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : countries.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No AI Data Available</h3>
              <p className="text-gray-600 mb-6">
                Click "Calculate Matrix" to generate your AI visibility report.
              </p>
              <button
                onClick={calculateMatrix}
                disabled={calculating || !selectedDomain}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <RefreshCw className={`w-5 h-5 ${calculating ? 'animate-spin' : ''}`} />
                {calculating ? 'Calculating...' : 'Calculate Matrix'}
              </button>
            </div>
          ) : (
            <>
          {/* Summary Cards - Focus on Brand Absence */}
          {countries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm border border-red-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-700">Brand Absent</span>
                  <X className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-3xl font-bold text-red-900">
                  {countries.filter(c => c.ai_visibility_score === 0).length}
                </div>
                <p className="text-xs text-red-600 mt-1">Zero AI presence</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm border border-orange-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-orange-700">Weak Presence</span>
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-orange-900">
                  {countries.filter(c => c.ai_visibility_score > 0 && c.ai_visibility_score < 30).length}
                </div>
                <p className="text-xs text-orange-600 mt-1">AI score 1-29</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm border border-yellow-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-yellow-700">Limited Coverage</span>
                  <TrendingDown className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="text-3xl font-bold text-yellow-900">
                  {countries.filter(c => (c.ai_platforms_present?.length || 0) <= 1).length}
                </div>
                <p className="text-xs text-yellow-600 mt-1">≤ 1 platform</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">Global Gap</span>
                  <Globe className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-900">
                  {((countries.filter(c => c.ai_visibility_score < 30).length / countries.length) * 100).toFixed(0)}%
                </div>
                <p className="text-xs text-blue-600 mt-1">Regions need help</p>
              </div>
            </div>
          )}

          {/* Charts Section - Focus on Brand Absence */}
          <div className="space-y-6 mb-6">
            {/* Bar Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Countries with Zero/Lowest AI Presence */}
              <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Brand Absent/Weakest - Bottom 10 Countries</h3>
                <p className="text-sm text-gray-600 mb-4">Countries where brand has minimal or no AI presence</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={countries.slice().sort((a, b) => a.ai_visibility_score - b.ai_visibility_score).slice(0, 10).map(c => ({
                    name: getCountryName(c.country_code),
                    fullName: getCountryName(c.country_code),
                    score: c.ai_visibility_score,
                    platforms: c.ai_platforms_present?.length || 0
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100} 
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'AI Score', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Bar dataKey="score" fill="#ef4444" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Countries with No Platform Coverage */}
              <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Bottom 10 - Minimal Platform Coverage</h3>
                <p className="text-sm text-gray-600 mb-4">Countries with fewest AI platforms mentioning the brand</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={countries.slice().sort((a, b) => (a.ai_platforms_present?.length || 0) - (b.ai_platforms_present?.length || 0)).slice(0, 10).map(c => ({
                    name: getCountryName(c.country_code),
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
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} domain={[0, 5]} label={{ value: 'Platforms', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value) => [`${value}/5 platforms`, 'Coverage']}
                    />
                    <Bar dataKey="platforms" fill="#f97316" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Third Row: Zero AI Presence and Biggest Gaps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Countries with Zero AI Presence */}
              <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Countries with Zero AI Presence</h3>
                <p className="text-sm text-gray-600 mb-4">Regions where brand is completely absent from AI</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={countries.filter(c => c.ai_visibility_score === 0).sort((a, b) => b.organic_score - a.organic_score).slice(0, 10).map(c => ({
                    name: getCountryName(c.country_code),
                    fullName: getCountryName(c.country_code),
                    organic: c.organic_score,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100} 
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'Organic Score', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value) => [Number(value).toFixed(1), 'Organic Score']}
                    />
                    <Bar dataKey="organic" fill="#dc2626" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Biggest AI Gaps */}
              <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Bottom 10 - Biggest AI Visibility Gaps</h3>
                <p className="text-sm text-gray-600 mb-4">Countries where organic is strong but AI is weak</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={countries.slice().sort((a, b) => (b.organic_score - b.ai_visibility_score) - (a.organic_score - a.ai_visibility_score)).slice(0, 10).map(c => ({
                    name: getCountryName(c.country_code),
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
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'Gap Score', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value) => [Number(value).toFixed(1), 'Gap']}
                    />
                    <Bar dataKey="gap" fill="#a855f7" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fourth Row: Global Weakness Comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Bottom 15 Regions - Global Weakness Analysis</h3>
              <p className="text-sm text-gray-600 mb-4">Countries with lowest AI visibility showing the visibility gap</p>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={countries.slice().sort((a, b) => a.ai_visibility_score - b.ai_visibility_score).slice(0, 15).map(c => ({
                  name: getCountryName(c.country_code),
                  fullName: getCountryName(c.country_code),
                  organic: c.organic_score,
                  ai: c.ai_visibility_score
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={120} 
                    style={{ fontSize: '11px' }}
                  />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} domain={[0, 100]} label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="organic" fill="#10b981" radius={[4, 4, 0, 0]} name="Organic Score" />
                  <Bar dataKey="ai" fill="#ef4444" radius={[4, 4, 0, 0]} name="AI Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search countries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Countries Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th 
                      onClick={() => handleSort('country_code')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Country {sortField === 'country_code' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('organic_score')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Organic {sortField === 'organic_score' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('ai_visibility_score')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      AI Score {sortField === 'ai_visibility_score' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Quadrant
                    </th>
                    <th 
                      onClick={() => handleSort('gsc_clicks')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Clicks {sortField === 'gsc_clicks' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('gsc_impressions')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Impressions {sortField === 'gsc_impressions' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      AI Platforms (5)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedCountries.map((country) => (
                    <tr key={country.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {getCountryName(country.country_code)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary-600 h-2 rounded-full" 
                              style={{ width: `${country.organic_score}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900">{formatDecimal(country.organic_score)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                country.ai_visibility_score === 0 ? 'bg-red-500' :
                                country.ai_visibility_score < 30 ? 'bg-orange-500' :
                                country.ai_visibility_score < 70 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${country.ai_visibility_score}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900">{formatDecimal(country.ai_visibility_score)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getQuadrantColor(country.quadrant)}`}>
                          {getQuadrantIcon(country.quadrant)}
                          {country.quadrant.charAt(0).toUpperCase() + country.quadrant.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(country.gsc_clicks)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(country.gsc_impressions)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {[
                            { key: 'chatgpt', name: 'ChatGPT' },
                            { key: 'claude', name: 'Claude' },
                            { key: 'gemini', name: 'Gemini' },
                            { key: 'perplexity', name: 'Perplexity' },
                            { key: 'groq', name: 'Groq' }
                          ].map(({ key, name }) => {
                            const isPresent = country.ai_platforms_present?.includes(key);
                            return (
                              <span
                                key={key}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
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
                            {country.ai_platforms_present?.length || 0}/5 platforms
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredAndSortedCountries.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No countries match your filters.
            </div>
          )}
            </>
          )}
        </>
      ) : (
        // Region VS Google Search Tab
        <>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : countries.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600 mb-6">
                Click "Calculate Matrix" to generate your visibility report.
              </p>
              <button
                onClick={calculateMatrix}
                disabled={calculating || !selectedDomain}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <RefreshCw className={`w-5 h-5 ${calculating ? 'animate-spin' : ''}`} />
                {calculating ? 'Calculating...' : 'Calculate Matrix'}
              </button>
            </div>
          ) : (
            <>
              {/* Google Search Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Total Countries</span>
                    <Globe className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{countries.length}</div>
                  <p className="text-xs text-gray-500 mt-1">Regions analyzed</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700">Total Clicks</span>
                    <MousePointerClick className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-900">
                    {formatNumber(countries.reduce((sum, c) => sum + c.gsc_clicks, 0))}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Across all regions</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">Total Impressions</span>
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-900">
                    {formatNumber(countries.reduce((sum, c) => sum + c.gsc_impressions, 0))}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Total visibility</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-700">Avg CTR</span>
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-purple-900">
                    {((countries.reduce((sum, c) => sum + c.gsc_clicks, 0) / countries.reduce((sum, c) => sum + c.gsc_impressions, 0)) * 100).toFixed(2)}%
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Click-through rate</p>
                </div>
              </div>

              {/* Google Search Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Top Countries by Clicks */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Countries by Clicks</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={countries.slice().sort((a, b) => b.gsc_clicks - a.gsc_clicks).slice(0, 10).map(c => ({
                      name: getCountryName(c.country_code),
                      clicks: c.gsc_clicks,
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
                        formatter={(value: any) => [formatNumber(Number(value)), 'Clicks']}
                      />
                      <Legend />
                      <Bar dataKey="clicks" fill="#10b981" radius={[8, 8, 0, 0]} name="Clicks" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Top Countries by Impressions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Countries by Impressions</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={countries.slice().sort((a, b) => b.gsc_impressions - a.gsc_impressions).slice(0, 10).map(c => ({
                      name: getCountryName(c.country_code),
                      impressions: c.gsc_impressions,
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
                        formatter={(value: any) => [formatNumber(Number(value)), 'Impressions']}
                      />
                      <Legend />
                      <Bar dataKey="impressions" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Impressions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Google Search Data Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Globe className="w-6 h-6 text-blue-600" />
                    Google Search Performance by Region
                  </h2>
                  <p className="text-sm text-gray-600 mt-2">
                    Search console data across {countries.length} {countries.length === 1 ? 'region' : 'regions'}
                  </p>
                </div>

                {/* Search */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th 
                          onClick={() => handleSort('country_code')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                          Country {sortField === 'country_code' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          onClick={() => handleSort('gsc_clicks')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                          Clicks {sortField === 'gsc_clicks' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          onClick={() => handleSort('gsc_impressions')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                          Impressions {sortField === 'gsc_impressions' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          CTR
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Avg Position
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAndSortedCountries.map((country) => (
                        <tr key={country.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {getCountryName(country.country_code)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatNumber(country.gsc_clicks)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatNumber(country.gsc_impressions)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(country.gsc_ctr * 100).toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {country.gsc_avg_position.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
