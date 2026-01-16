# Important Note: gsc_keywords Table

## ⚠️ Two Different Tables with Same Name

Your database has a table named `gsc_keywords`, but it's **NOT related to the GSC domains migration**.

### The Existing `gsc_keywords` Table

**Purpose**: Brand analysis projects  
**Structure**:
```sql
CREATE TABLE gsc_keywords (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES brand_analysis_projects(id), -- NOT domain_id!
  keyword TEXT,
  position FLOAT,
  clicks INT,
  impressions INT,
  ctr FLOAT,
  date DATE,
  ...
);
```

**This table should NOT be modified by the GSC domains migration.**

---

## Tables Updated by Migration

The migration **only updates these tables**:

1. ✅ `gsc_analytics` - Has `domain_id` column
2. ✅ `gsc_queries` - Has `domain_id` column  
3. ✅ `gsc_pages` - Has `domain_id` column
4. ❌ `gsc_keywords` - Has `project_id` column (different system)

---

## Migration Script Fix

The updated migration script (`015_update_gsc_foreign_keys.sql`) now:

1. **Checks for column existence** before modifying `gsc_keywords`
2. **Only modifies it if it has a `domain_id` column**
3. **Skips it if it has `project_id` instead** (which is your case)

This ensures the brand analysis keywords table is left untouched.

---

## If You Need GSC Keywords for Domains

If you want to store GSC keywords per domain (separate from brand analysis), you would need to create a **new table** with a different name, such as:

- `gsc_domain_keywords`
- `gsc_search_keywords`
- `domain_keywords`

Or add a `domain_id` column to the existing structure (but this would mix two different systems).

---

## Summary

✅ Migration is now **safe to run**  
✅ Will skip the `gsc_keywords` table (brand analysis)  
✅ Will only update tables with `domain_id` columns  
✅ No data will be lost or corrupted  

The error has been resolved! 🎉

