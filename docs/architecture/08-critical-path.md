# 08 — Critical Path & Next Priorities

> What to build next, in what order, to close gaps fast  
> Last updated: March 7, 2026

---

## The Big Picture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WHERE WE ARE TODAY                                    │
│                                                                         │
│  Core Platform ████████████████████████████  ~80%                       │
│                                                                         │
│  ✓ AI Engine, Content, Publishing, Reports, Integrations = SOLID        │
│  ✗ Role Dashboards, French Language = GAPS          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Priority Tiers

### Tier 1 — CLOSE THE PRODUCT GAPS (Next 1-2 Weeks)

These are the features that users will actually notice as "missing" when they use the product.

| # | Task | Effort | What to Do |
|---|------|--------|------------|
| 1.1 | **Wire Video Reports Page** | 1-2 days | The video generation APIs work perfectly. The dashboard page (`app/dashboard/video-reports/page.tsx`) is mock data. Wire it: fetch from `report_videos` table, add play (video URL), download (direct link), share (copy URL) buttons. Remove hardcoded data. |
| 1.2 | **Wire Role-Specific Dashboards** | 2-3 days | `AdminDashboard.tsx`, `AgencyDashboard.tsx`, `ClientDashboard.tsx` all show mock data. Create 3 new API endpoints that aggregate real data: `/api/dashboard/admin-summary`, `/api/dashboard/agency-summary`, `/api/dashboard/client-summary`. Query actual tables for real metrics. |
| 1.3 | **Wire Reputation Page** | 2 days | `app/dashboard/reputation/page.tsx` is mock. Wire to existing `google_maps_reviews` data. Add real "Scan Now" that calls Google Maps API. Remove hardcoded reviews and screenshots. (Skip Yelp/Facebook/TripAdvisor for now — label them "Coming Soon".) |
| 1.4 | **French Language Support** | 3-4 days | Add French locale to `LanguageProvider`, add translated strings for all UI keys, add French prompt templates to `geoCore.generateStrategicContent`, add French option to language toggle. Note: `make-it-human` already handles French — only the UI and content generation prompts remain. |

---
