-- Function to extract sources from ai_platform_responses and upsert
CREATE OR REPLACE FUNCTION public.process_ai_response_sources(
  project_id_param uuid,
  session_id_param uuid,
  platform_param text,
  response_text_param text,
  response_metadata_param jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  sources_json jsonb := '[]'::jsonb;
  elem jsonb;
  url_text text;
BEGIN
  -- Collect structured arrays from metadata
  IF response_metadata_param ? 'sources' THEN
    sources_json := sources_json || (
      SELECT jsonb_agg(
        CASE 
          WHEN jsonb_typeof(x) = 'string' THEN jsonb_build_object('url', x, 'is_citation', true)
          WHEN jsonb_typeof(x) = 'object' THEN jsonb_build_object('url', x->>'url', 'title', x->>'title', 'is_citation', true)
          ELSE jsonb_build_object()
        END
      )
      FROM jsonb_array_elements(response_metadata_param->'sources') AS x
    );
  END IF;

  IF response_metadata_param ? 'citations' THEN
    sources_json := sources_json || (
      SELECT jsonb_agg(
        CASE 
          WHEN jsonb_typeof(x) = 'string' THEN jsonb_build_object('url', x, 'is_citation', true)
          WHEN jsonb_typeof(x) = 'object' THEN jsonb_build_object('url', x->>'url', 'title', x->>'title', 'is_citation', true)
          ELSE jsonb_build_object()
        END
      )
      FROM jsonb_array_elements(response_metadata_param->'citations') AS x
    );
  END IF;

  IF response_metadata_param ? 'references' THEN
    sources_json := sources_json || (
      SELECT jsonb_agg(
        CASE 
          WHEN jsonb_typeof(x) = 'string' THEN jsonb_build_object('url', x, 'is_citation', true)
          WHEN jsonb_typeof(x) = 'object' THEN jsonb_build_object('url', x->>'url', 'title', x->>'title', 'is_citation', true)
          ELSE jsonb_build_object()
        END
      )
      FROM jsonb_array_elements(response_metadata_param->'references') AS x
    );
  END IF;

  -- Extract plain URLs from response text
  IF response_text_param IS NOT NULL THEN
    FOR url_text IN
      SELECT DISTINCT m[1]
      FROM regexp_matches(response_text_param, '(https?://[^\s)\]]+)', 'gi') AS m
      LIMIT 500
    LOOP
      sources_json := sources_json || jsonb_build_array(jsonb_build_object('url', url_text, 'is_citation', false));
    END LOOP;
  END IF;

  -- Deduplicate naive by url key
  IF jsonb_typeof(sources_json) = 'array' AND jsonb_array_length(sources_json) > 0 THEN
    -- Filter out empty objects and null urls
    sources_json := (
      SELECT COALESCE(jsonb_agg(s)
        FILTER (WHERE COALESCE(s->>'url','') <> ''), '[]'::jsonb)
      FROM (
        SELECT DISTINCT ON ((s->>'url')) s
        FROM jsonb_array_elements(sources_json) s
      ) d
    );
  END IF;

  -- Upsert
  PERFORM public.upsert_brand_analysis_sources(project_id_param, session_id_param, platform_param, sources_json);
END $$;

-- Trigger to run on ai_platform_responses insert/update
CREATE OR REPLACE FUNCTION public.trg_ai_platform_responses_sources()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  PERFORM public.process_ai_response_sources(NEW.project_id, NEW.session_id, NEW.platform, NEW.response, NEW.response_metadata);
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'after_ai_platform_responses_sources'
  ) THEN
    CREATE TRIGGER after_ai_platform_responses_sources
    AFTER INSERT OR UPDATE ON public.ai_platform_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_ai_platform_responses_sources();
  END IF;
END $$;

-- Backfill existing rows once
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT project_id, session_id, platform, response, response_metadata FROM public.ai_platform_responses LOOP
    PERFORM public.process_ai_response_sources(r.project_id, r.session_id, r.platform, r.response, r.response_metadata);
  END LOOP;
END $$;