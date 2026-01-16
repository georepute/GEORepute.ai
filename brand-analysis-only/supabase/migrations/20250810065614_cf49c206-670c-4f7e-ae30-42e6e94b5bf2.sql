-- Set stable search_path for our new function to satisfy linter
CREATE OR REPLACE FUNCTION public.upsert_brand_analysis_sources(
  project_id_param uuid,
  session_id_param uuid,
  platform_param text,
  sources_param jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
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

    clean_url := lower(regexp_replace(raw_url, '[\)\]\>\.,;:]+$',''));
    clean_url := regexp_replace(clean_url, '#.*$', '');

    IF clean_url !~* '^https?://' THEN
      clean_url := 'https://' || clean_url;
    END IF;

    SELECT regexp_matches(clean_url, '^(?:https?://)?(?:www\.)?([^/]+)') INTO host_match;
    domain_val := lower(COALESCE(host_match[1], clean_url));

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