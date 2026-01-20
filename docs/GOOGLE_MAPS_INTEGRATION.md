# Google Maps Reviews Integration - Complete Implementation Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [User Guide](#user-guide)
8. [Setup Instructions](#setup-instructions)
9. [Technical Details](#technical-details)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The Google Maps Reviews Integration allows users to fetch, store, and manage reviews from their Google Maps business profiles. The system supports multiple URL formats including share links, full URLs, and place IDs.

**Page URL:** `http://localhost:3000/dashboard/google-maps`

---

## ✨ Features

### Core Features
- ✅ **Business Management Dropdown**
  - Auto-fetch user businesses on page load
  - Display all saved businesses with ratings and review counts
  - Select to view detailed reviews and ratings

- ✅ **Add New Business**
  - Modal dialog with "+ Add Business" button
  - Support for multiple Google Maps URL formats
  - Visual step-by-step guide with image
  - Click-to-zoom image feature

- ✅ **Smart Business Detection**
  - Check if business already exists in database
  - Update existing business data automatically
  - Show appropriate message (added vs updated)

- ✅ **Review Display**
  - Full business details (name, address, rating)
  - Individual reviews with author info
  - Star ratings visualization
  - Review timestamps and language tags
  - Statistics cards (reviews fetched, average rating, total reviews)

### UI/UX Features
- Modern gradient design with smooth animations
- SVG icons for better performance (no external icon library)
- Hover effects and transitions
- Loading states with spinners
- Error handling with user-friendly messages
- Toast notifications for actions
- Responsive design for all screen sizes
- Image zoom modal for instruction guide

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
│  /dashboard/google-maps/page.tsx                            │
│                                                              │
│  - Business Dropdown                                         │
│  - Add Business Modal                                        │
│  - Reviews Display                                           │
│  - Image Zoom Modal                                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ├─── GET /api/integrations/google-maps/businesses
                      │    (Fetch user's businesses)
                      │
                      ├─── GET /api/integrations/google-maps/reviews?place_id=xxx
                      │    (Fetch specific business reviews)
                      │
                      └─── POST /api/integrations/google-maps/reviews
                           (Add/Update business)
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                    Backend (API Routes)                      │
│                                                              │
│  /api/integrations/google-maps/businesses/route.ts          │
│  /api/integrations/google-maps/reviews/route.ts             │
│                                                              │
│  - URL validation and parsing                                │
│  - Share URL resolution                                      │
│  - Place ID extraction                                       │
│  - Coordinate extraction                                     │
│  - Google Places API integration                             │
│  - Database operations                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ├─── Google Places API
                      │    - Place Details
                      │    - Text Search
                      │    - Nearby Search
                      │
                      └─── Supabase Database
                           - google_maps_reviews table
```

---

## 💾 Database Schema

### Table: `google_maps_reviews`

```sql
CREATE TABLE google_maps_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  place_name TEXT NOT NULL,
  place_address TEXT,
  place_rating DECIMAL(2,1),
  place_reviews_total INTEGER,
  reviews_data JSONB DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_google_maps_reviews_user_id ON google_maps_reviews(user_id);
CREATE INDEX idx_google_maps_reviews_place_id ON google_maps_reviews(place_id);
CREATE INDEX idx_google_maps_reviews_organization_id ON google_maps_reviews(organization_id);
CREATE INDEX idx_google_maps_reviews_fetched_at ON google_maps_reviews(fetched_at DESC);

-- Row Level Security
ALTER TABLE google_maps_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own google_maps_reviews"
  ON google_maps_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own google_maps_reviews"
  ON google_maps_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own google_maps_reviews"
  ON google_maps_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own google_maps_reviews"
  ON google_maps_reviews FOR DELETE
  USING (auth.uid() = user_id);
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User who owns this business |
| `organization_id` | UUID | Optional organization reference |
| `place_id` | TEXT | Google Maps Place ID |
| `place_name` | TEXT | Business name |
| `place_address` | TEXT | Formatted address |
| `place_rating` | DECIMAL | Average rating (1-5) |
| `place_reviews_total` | INTEGER | Total review count on Google Maps |
| `reviews_data` | JSONB | Array of review objects |
| `fetched_at` | TIMESTAMPTZ | When reviews were fetched |
| `created_at` | TIMESTAMPTZ | Record creation time |
| `updated_at` | TIMESTAMPTZ | Last update time |

---

## 🔌 API Endpoints

### 1. GET `/api/integrations/google-maps/businesses`

**Purpose:** Fetch all unique businesses for the authenticated user.

**Authentication:** Required

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "businesses": [
    {
      "id": "uuid",
      "place_id": "ChIJ...",
      "place_name": "Business Name",
      "place_address": "123 Main St",
      "place_rating": 4.5,
      "place_reviews_total": 100,
      "fetched_at": "2026-01-20T10:30:00Z"
    }
  ]
}
```

### 2. GET `/api/integrations/google-maps/reviews`

**Purpose:** Fetch reviews for a specific business.

**Authentication:** Required

**Query Parameters:**
- `place_id` (string, required): Google Maps Place ID
- `limit` (number, optional): Max number of results (default: 10)

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "id": "uuid",
      "place_id": "ChIJ...",
      "place_name": "Business Name",
      "place_address": "123 Main St",
      "place_rating": 4.5,
      "place_reviews_total": 100,
      "reviews_data": [
        {
          "author_name": "John Doe",
          "author_url": "https://...",
          "language": "en",
          "rating": 5,
          "relative_time_description": "2 weeks ago",
          "text": "Great place!",
          "time": 1706000000
        }
      ],
      "fetched_at": "2026-01-20T10:30:00Z"
    }
  ]
}
```

### 3. POST `/api/integrations/google-maps/reviews`

**Purpose:** Add new business or update existing business.

**Authentication:** Required

**Request Body:**
```json
{
  "mapUrl": "https://maps.app.goo.gl/...",
  "placeId": null  // Optional, extracted from URL if not provided
}
```

**Response:**
```json
{
  "success": true,
  "businessExists": false,  // true if updating existing business
  "placeDetails": {
    "name": "Business Name",
    "formatted_address": "123 Main St",
    "rating": 4.5,
    "user_ratings_total": 100,
    "reviews": [...],
    "place_id": "ChIJ...",
    "url": "https://www.google.com/maps/..."
  }
}
```

### Supported URL Formats

The system supports multiple Google Maps URL formats:

1. **Share Links** (Recommended)
   - `https://maps.app.goo.gl/xyz...`
   - `https://goo.gl/maps/xyz...`
   - `https://g.co/maps/xyz...`

2. **Full URLs**
   - `https://www.google.com/maps/place/Business+Name/@lat,lng,zoom/data=...`
   - `https://www.google.com/maps/place/Business+Name/ChIJ...`

3. **CID Format**
   - `https://maps.google.com/?cid=123456789`

4. **Direct Place ID**
   - `ChIJxxxxxxxxxxxxxxxxxxxxx`

5. **Hex/FID Format**
   - Automatically converted using coordinates and business name

---

## 🎨 Frontend Components

### File: `app/dashboard/google-maps/page.tsx`

#### Component Structure

```typescript
GoogleMapsPage
├── Header
│   ├── Title & Description
│   └── Add Business Button
├── Business Selector
│   ├── Dropdown (if businesses exist)
│   └── Empty State (if no businesses)
├── Error Display (conditional)
├── Loading State (conditional)
├── Business Details (conditional)
│   ├── Business Info Card
│   │   ├── Name & Address
│   │   ├── Rating & Review Count
│   │   ├── View on Maps Link
│   │   └── Statistics Cards
│   └── Reviews List
│       └── Individual Review Cards
├── Empty State (conditional)
├── Add Business Modal (conditional)
│   ├── URL Input
│   ├── Fetch Button
│   └── Instructions with Image
└── Image Zoom Modal (conditional)
    └── Full-Screen Image Viewer
```

#### State Management

```typescript
const [businesses, setBusinesses] = useState<Business[]>([]);
const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
const [mapUrl, setMapUrl] = useState('');
const [loading, setLoading] = useState(false);
const [loadingBusinesses, setLoadingBusinesses] = useState(true);
const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
const [error, setError] = useState<string | null>(null);
const [showAddModal, setShowAddModal] = useState(false);
const [showImageModal, setShowImageModal] = useState(false);
```

#### Key Functions

1. **fetchBusinesses()** - Load all user businesses
2. **handleBusinessSelect()** - Load selected business details
3. **fetchReviews()** - Add/update business from URL
4. **renderStars()** - Display star ratings
5. **formatDate()** - Format timestamps

#### UI Features

**Gradients:**
- Background: `bg-gradient-to-br from-gray-50 to-blue-50/30`
- Buttons: `bg-gradient-to-r from-blue-600 to-blue-700`
- Stats cards: Individual gradients (blue, green, purple)

**Rounded Corners:**
- Main containers: `rounded-2xl` or `rounded-3xl`
- Cards: `rounded-xl` or `rounded-2xl`
- Buttons: `rounded-xl`

**Shadows:**
- Cards: `shadow-md hover:shadow-lg`
- Buttons: `shadow-lg shadow-blue-600/30`
- Modal: `shadow-2xl`

**SVG Icons:**
All icons are inline SVG (no external library):
- Map/Location icon
- Building icon
- Star icon
- User icon
- Calendar/Clock icon
- Search icon
- Plus icon
- Close (X) icon
- External link icon
- Loading spinner
- Zoom in icon
- Book icon

---

## 📖 User Guide

### Getting Started

1. **Navigate to Page**
   - Go to `/dashboard/google-maps`
   - Page automatically loads your saved businesses

2. **View Existing Business**
   - Select business from dropdown
   - View reviews and ratings
   - Click "View on Maps" to open in Google Maps

3. **Add New Business**
   - Click "+ Add Business" button
   - Follow the 3-step guide:
     1. Search business or place in Google Maps
     2. Select the business
     3. Click "📤 Share" button and copy link
   - Paste link and click "Fetch Business"

4. **Update Existing Business**
   - Add business URL that already exists
   - System automatically updates the data
   - Shows message: "Business updated! This business was already in your profile."

### Tips

- **Best URL Format:** Use the Share button in Google Maps for most reliable results
- **Share Button Location:** Look for circular share icon in business details panel
- **Mobile & Desktop:** Works on both mobile app and desktop browser
- **View Image Guide:** Click the instruction image to zoom in and see details
- **Refresh Data:** Re-add business to fetch latest reviews and ratings

---

## 🚀 Setup Instructions

### Prerequisites

1. **Google Maps API Key**
   - Create project in [Google Cloud Console](https://console.cloud.google.com)
   - Enable: Places API, Text Search API, Nearby Search API
   - Create API key

2. **Environment Variables**
   - Add to `.env.local`:
   ```bash
   GOOGLE_MAPS_API_KEY=your_api_key_here
   # OR
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

3. **Database Setup**
   - Run migration: `database/016_google_maps_reviews.sql`
   - Verify table and indexes created
   - Check RLS policies enabled

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure API Key**
   ```bash
   # Add to .env.local
   echo "GOOGLE_MAPS_API_KEY=your_key" >> .env.local
   ```

3. **Run Database Migration**
   ```bash
   # Using Supabase CLI
   supabase db push
   
   # Or manually execute SQL file
   psql -h your-db-host -U postgres -d your-db < database/016_google_maps_reviews.sql
   ```

4. **Add Image Asset**
   - Place guide image at: `public/maps-docs.png`
   - Image should show step-by-step instructions

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Test the Feature**
   - Navigate to `http://localhost:3000/dashboard/google-maps`
   - Try adding a business
   - Verify reviews are fetched and stored

---

## 🔧 Technical Details

### URL Processing Flow

```
User Input URL
    ↓
Is Share URL? (maps.app.goo.gl, goo.gl/maps, etc.)
    ↓ YES
Resolve Share URL → Follow redirects → Get full URL
    ↓
    ↓ NO
Extract Place ID or Coordinates
    ↓
Is CID format? → Convert using Find Place API
Is Hex/FID format? → Convert using Text/Nearby Search
Is ChIJ format? → Use directly
Has coordinates only? → Use Nearby Search
    ↓
Fetch Place Details from Google Places API
    ↓
Store/Update in Database
    ↓
Return to Frontend
```

### Google Places API Limits

- **Reviews per request:** Maximum 5 reviews (Google limitation)
- **Rate limiting:** Profile photos removed to avoid 429 errors
- **API quota:** Monitor usage in Google Cloud Console

### Performance Optimizations

1. **SVG Icons:** No external library, faster load times
2. **Efficient queries:** Indexed database queries
3. **Caching:** User businesses cached in state
4. **Debouncing:** Could be added for search/input
5. **Image optimization:** Consider next/image for production

### Security Features

1. **Authentication:** All endpoints require authenticated user
2. **Row Level Security:** Users can only access their own data
3. **Input validation:** URL and place ID validation
4. **Error handling:** Graceful error messages, no sensitive data exposed
5. **CORS:** API routes protected by Next.js

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "Could not extract place ID or coordinates from URL"

**Cause:** Invalid or incomplete URL format

**Solution:**
- Use the Share button in Google Maps
- Make sure to click on the business name first
- Copy the complete URL including all parameters

#### 2. "Failed to fetch reviews"

**Cause:** API key issues or rate limiting

**Solution:**
- Verify `GOOGLE_MAPS_API_KEY` is set in `.env.local`
- Check API key is enabled for Places API
- Check quota in Google Cloud Console
- Wait a few minutes if rate limited

#### 3. "Business updated" instead of "Business added"

**Cause:** Business already exists in database (by place_id)

**Solution:**
- This is expected behavior
- System updates existing data automatically
- Previous reviews are overwritten with fresh data

#### 4. No reviews showing even though business has reviews

**Cause:** Google Places API returns maximum 5 reviews

**Solution:**
- This is a Google API limitation
- API returns the "most helpful" reviews
- Total review count is still displayed correctly

#### 5. Dropdown shows "No businesses added yet"

**Cause:** No businesses in database or fetch failed

**Solution:**
- Add your first business using "+ Add Business"
- Check browser console for errors
- Verify database table exists and RLS policies are correct

#### 6. Image not showing in modal

**Cause:** Image file missing or incorrect path

**Solution:**
- Verify `maps-docs.png` exists in `public/` folder
- Check file name spelling (case-sensitive)
- Clear Next.js cache: `rm -rf .next`

### Debug Tips

1. **Check Browser Console**
   - Look for API errors
   - Check network requests
   - Verify authentication tokens

2. **Check Server Logs**
   - Watch for API responses
   - Check Google Places API errors
   - Monitor database query results

3. **Verify Database**
   ```sql
   -- Check if table exists
   SELECT * FROM google_maps_reviews LIMIT 1;
   
   -- Check user's businesses
   SELECT place_id, place_name, fetched_at 
   FROM google_maps_reviews 
   WHERE user_id = 'your-user-id';
   ```

4. **Test API Endpoints**
   ```bash
   # Test businesses endpoint
   curl http://localhost:3000/api/integrations/google-maps/businesses
   
   # Test reviews endpoint
   curl "http://localhost:3000/api/integrations/google-maps/reviews?place_id=ChIJ..."
   ```

---

## 📊 File Structure

```
project/
├── app/
│   ├── dashboard/
│   │   └── google-maps/
│   │       └── page.tsx              # Main frontend component
│   └── api/
│       └── integrations/
│           └── google-maps/
│               ├── businesses/
│               │   └── route.ts      # GET businesses endpoint
│               └── reviews/
│                   └── route.ts      # GET/POST reviews endpoint
├── database/
│   └── 016_google_maps_reviews.sql   # Database schema
├── public/
│   └── maps-docs.png                 # Instruction guide image
└── docs/
    └── GOOGLE_MAPS_INTEGRATION.md    # This file
```

---

## 🎯 Future Enhancements

### Potential Features

1. **Bulk Import**
   - Import multiple businesses at once
   - CSV import support

2. **Review Analytics**
   - Sentiment analysis
   - Rating trends over time
   - Response rate tracking

3. **Review Response**
   - Reply to reviews from dashboard
   - Template responses

4. **Automated Refresh**
   - Schedule automatic review updates
   - Email notifications for new reviews

5. **Export Features**
   - Export reviews to PDF
   - CSV/Excel export
   - Share reports

6. **Advanced Filtering**
   - Filter by rating
   - Filter by date range
   - Search review content

7. **Multiple Locations**
   - Business chain support
   - Compare locations
   - Aggregate statistics

---

## 📝 Changelog

### Version 1.0.0 (2026-01-20)
- ✅ Initial implementation
- ✅ Business management dropdown
- ✅ Add/update business functionality
- ✅ Review display with full details
- ✅ Modern UI with SVG icons
- ✅ Image zoom modal
- ✅ Multiple URL format support
- ✅ Database schema with RLS
- ✅ Complete API endpoints
- ✅ Comprehensive documentation

---

## 🤝 Support

For issues, questions, or feature requests:
1. Check this documentation
2. Review troubleshooting section
3. Check browser/server console logs
4. Contact development team

---

## 📄 License

This feature is part of GEORepute.ai platform.

---

**Last Updated:** January 20, 2026
**Version:** 1.0.0
**Maintained by:** Development Team

