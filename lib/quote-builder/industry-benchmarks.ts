/**
 * Static industry benchmarks for Quote Builder Revenue Exposure Model.
 * Used when real GSC/conversion data is missing. Keyed by brand_analysis_projects.industry.
 */

export interface IndustryBenchmark {
  avgConversionRate: number; // e.g. 0.02 = 2%
  avgDealValue: number;     // USD
  avgDCS: number;           // 0-100, for comparison
  avgCTR: number;           // e.g. 3.5 = 3.5%
}

const DEFAULT_BENCHMARK: IndustryBenchmark = {
  avgConversionRate: 0.025,
  avgDealValue: 5000,
  avgDCS: 45,
  avgCTR: 3.0,
};

export const INDUSTRY_BENCHMARKS: Record<string, IndustryBenchmark> = {
  Technology: {
    avgConversionRate: 0.03,
    avgDealValue: 8000,
    avgDCS: 52,
    avgCTR: 3.2,
  },
  Healthcare: {
    avgConversionRate: 0.02,
    avgDealValue: 12000,
    avgDCS: 40,
    avgCTR: 2.8,
  },
  Finance: {
    avgConversionRate: 0.015,
    avgDealValue: 15000,
    avgDCS: 48,
    avgCTR: 2.5,
  },
  "E-commerce": {
    avgConversionRate: 0.035,
    avgDealValue: 150,
    avgDCS: 55,
    avgCTR: 4.0,
  },
  "Real Estate": {
    avgConversionRate: 0.01,
    avgDealValue: 25000,
    avgDCS: 42,
    avgCTR: 2.2,
  },
  Legal: {
    avgConversionRate: 0.02,
    avgDealValue: 10000,
    avgDCS: 38,
    avgCTR: 2.6,
  },
  SaaS: {
    avgConversionRate: 0.04,
    avgDealValue: 6000,
    avgDCS: 58,
    avgCTR: 3.8,
  },
  Retail: {
    avgConversionRate: 0.03,
    avgDealValue: 200,
    avgDCS: 50,
    avgCTR: 3.5,
  },
  "Professional Services": {
    avgConversionRate: 0.025,
    avgDealValue: 7000,
    avgDCS: 45,
    avgCTR: 3.0,
  },
  Other: DEFAULT_BENCHMARK,
};

export function getIndustryBenchmark(industry: string | null | undefined): IndustryBenchmark {
  if (!industry || !industry.trim()) return DEFAULT_BENCHMARK;
  const key = industry.trim();
  return INDUSTRY_BENCHMARKS[key] ?? DEFAULT_BENCHMARK;
}
