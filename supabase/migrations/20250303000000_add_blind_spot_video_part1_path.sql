-- Video columns for 30-second merged video (2 parts generated in parallel)
ALTER TABLE public.blind_spot_reports
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_request_id TEXT,
  ADD COLUMN IF NOT EXISTS video_request_id_part2 TEXT,
  ADD COLUMN IF NOT EXISTS video_status TEXT,
  ADD COLUMN IF NOT EXISTS video_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS video_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS video_part1_path TEXT;
