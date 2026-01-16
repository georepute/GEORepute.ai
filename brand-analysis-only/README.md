# Brand Analysis Feature - Complete Copy

This folder contains a complete copy of all Brand Visibility/Brand Analysis feature code from the main project.

## Structure

### Frontend Components
- **Components**: `src/components/brand-analysis/` - All brand analysis UI components
- **Pages**: `src/pages/dashboard/brand-analysis/` - Brand analysis pages
- **Hooks**: `src/hooks/useBrandAnalysis*.ts` - All brand analysis React hooks
- **Lib**: `src/lib/brand-analysis/` - Brand analysis utility functions

### Backend/Edge Functions
- **brand-analysis-api**: API endpoint for brand analysis operations
- **brand-analysis-processor**: Main processing engine for brand analysis
- **generate-brand-summary**: Generates brand summaries
- **competitor-analysis-engine**: Competitive analysis engine
- **test-brand-analysis**: Test functions for brand analysis
- **test-brand-analysis-full**: Full test suite

### Database
- **Migrations**: `supabase/migrations/` - All brand analysis related database migrations

### Admin Settings
- **API Keys**: `src/pages/admin/settings/brand-analysis-api-keys.tsx` - Admin settings for brand analysis API keys

## Features Included

1. **Brand Visibility Tab** - Main tab in AI Visibility page
2. **Project Management** - Create, configure, and manage brand analysis projects
3. **Analysis Execution** - Run brand analysis across multiple AI platforms
4. **Results Display** - View analysis results, mentions, sentiment, and competitive data
5. **Settings** - Configure analysis frequency, platforms, keywords, competitors
6. **Dashboard** - Project dashboard with detailed analytics
7. **Reports** - Full analysis reports and competitive analysis
8. **Ask Freddie Integration** - AI assistant integration for brand analysis

## Files Copied

### Components (38 files)
All components from `src/components/brand-analysis/` including:
- BrandAnalysisTabContent.tsx
- BrandAnalysisProjectCard.tsx
- BrandAnalysisProjectDetails.tsx
- BrandAnalysisWizard.tsx
- FullAnalysisReport.tsx
- And 33 more component files

### Pages
- BrandAnalysisPage.tsx
- BrandAnalysis.tsx
- AIVisibility.tsx (contains brand analysis tab)
- All pages in `src/pages/dashboard/brand-analysis/`

### Hooks (5 files)
- useBrandAnalysisContext.ts
- useBrandAnalysisConversationStarters.ts
- useBrandAnalysisProjects.ts
- useBrandAnalysisResults.ts
- useBrandAnalysisSources.ts

### Edge Functions (6 functions)
- brand-analysis-api
- brand-analysis-processor
- generate-brand-summary
- competitor-analysis-engine
- test-brand-analysis
- test-brand-analysis-full

### Database Migrations
All migrations related to brand_analysis tables (27 migration files)

### Additional Components
- **BrandVisibilityWidget**: Dashboard widget for brand visibility summary

## Note

This is a complete copy of the brand analysis feature. All code has been copied as-is without any modifications.
