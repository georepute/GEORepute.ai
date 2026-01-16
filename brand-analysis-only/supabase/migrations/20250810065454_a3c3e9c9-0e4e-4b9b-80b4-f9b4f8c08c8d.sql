-- 1) Create aggregated sources table
CREATE TABLE IF NOT EXISTS public.brand_analysis_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  session_id uuid NULL,
  platforms text[] NOT NULL DEFAULT '{}'::text[],
  url text NOT NULL,
  domain text NOT NULL,
  title text NULL,
  occurrence_count integer NOT NULL DEFAULT 1,
  citation_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brand_analysis_sources_project_url_uniq UNIQUE (project_id, url)
);

-- 2) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_brand_analysis_sources_project
  ON public.brand_analysis_sources (project_id);
CREATE INDEX IF NOT EXISTS idx_brand_analysis_sources_domain
  ON public.brand_analysis_sources (domain);
CREATE INDEX IF NOT EXISTS idx_brand_analysis_sources_last_seen
  ON public.brand_analysis_sources (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_analysis_sources_occurrence
  ON public.brand_analysis_sources (occurrence_count DESC);
CREATE INDEX IF NOT EXISTS idx_brand_analysis_sources_platforms_gin
  ON public.brand_analysis_sources USING GIN (platforms);

-- 3) Enable RLS and add policies tied to project ownership
ALTER TABLE public.brand_analysis_sources ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'brand_analysis_sources'
      AND policyname = 'Users can view sources for their projects'
  ) THEN
    CREATE POLICY "Users can view sources for their projects"
    ON public.brand_analysis_sources
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.brand_analysis_projects p
        WHERE p.id = brand_analysis_sources.project_id
          AND p.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'brand_analysis_sources'
      AND policyname = 'Users can insert sources for their projects'
  ) THEN
    CREATE POLICY "Users can insert sources for their projects"
    ON public.brand_analysis_sources
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.brand_analysis_projects p
        WHERE p.id = brand_analysis_sources.project_id
          AND p.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'brand_analysis_sources'
      AND policyname = 'Users can update sources for their projects'
  ) THEN
    CREATE POLICY "Users can update sources for their projects"
    ON public.brand_analysis_sources
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.brand_analysis_projects p
        WHERE p.id = brand_analysis_sources.project_id
          AND p.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'brand_analysis_sources'
      AND policyname = 'Users can delete sources for their projects'
  ) THEN
    CREATE POLICY "Users can delete sources for their projects"
    ON public.brand_analysis_sources
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.brand_analysis_projects p
        WHERE p.id = brand_analysis_sources.project_id
          AND p.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- 4) Reuse global timestamp trigger for updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_brand_analysis_sources_updated_at'
  ) THEN
    CREATE TRIGGER trg_brand_analysis_sources_updated_at
    BEFORE UPDATE ON public.brand_analysis_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 5) Helper function: upsert sources from JSON
CREATE OR REPLACE FUNCTION public.upsert_brand_analysis_sources(
  project_id_param uuid,
  session_id_param uuid,
  platform_param text,
  sources_param jsonb
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  src jsonb;
  raw_url text;
  clean_url text;
  src_title text;
  is_citation boolean;
  host_match text[];
  domain_val text;
BEGIN
  IF sources_param IS NULL OR jsonb_typeof(sources_param) <> 'array' THEN
    RETURN;
  END IF;

  FOR src IN SELECT * FROM jsonb_array_elements(sources_param) LOOP
    -- Support either objects {url, title, is_citation} or string URLs
    IF jsonb_typeof(src) = 'object' THEN
      raw_url := NULLIF(trim(src->>'url'), '');
      src_title := NULLIF(trim(src->>'title'), '');
      is_citation := COALESCE((src->>'is_citation')::boolean, true);
    ELSE
      raw_url := NULLIF(trim(src#>>'{}'), '');
      src_title := NULL;
      is_citation := true;
    END IF;

    IF raw_url IS NULL THEN
      CONTINUE;
    END IF;

    -- Normalize URL: remove trailing punctuation/brackets and fragments
    clean_url := lower(regexp_replace(raw_url, '[\)\]\>\.,;:]+$',''));
    clean_url := regexp_replace(clean_url, '#.*$', '');

    -- Ensure it has a scheme for consistent matching
    IF clean_url !~* '^https?://' THEN
      clean_url := 'https://' || clean_url;
    END IF;

    -- Extract domain (very tolerant)
    SELECT regexp_matches(clean_url, '^(?:https?://)?(?:www\.)?([^/]+)') INTO host_match;
    domain_val := lower(COALESCE(host_match[1], clean_url));

    -- Upsert
    INSERT INTO public.brand_analysis_sources (
      project_id, session_id, platforms, url, domain, title, occurrence_count, citation_count, metadata
    ) VALUES (
      project_id_param,
      session_id_param,
      ARRAY[lower(platform_param)],
      clean_url,
      domain_val,
      src_title,
      1,
      CASE WHEN is_citation THEN 1 ELSE 0 END,
      '{}'::jsonb
    )
    ON CONFLICT (project_id, url)
    DO UPDATE SET
      platforms = (SELECT ARRAY(SELECT DISTINCT lower(p) FROM unnest(public.brand_analysis_sources.platforms || EXCLUDED.platforms) AS p)),
      title = COALESCE(public.brand_analysis_sources.title, EXCLUDED.title),
      occurrence_count = public.brand_analysis_sources.occurrence_count + 1,
      citation_count = public.brand_analysis_sources.citation_count + CASE WHEN is_citation THEN 1 ELSE 0 END,
      last_seen_at = now();
  END LOOP;
END $$;