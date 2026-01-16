-- Update brand analysis RLS policies to support organization data sharing
-- Team members should be able to access brand analysis data from their organization

-- Update RLS policies for brand_analysis_projects table
DROP POLICY IF EXISTS "Users can view their own brand analysis projects" ON public.brand_analysis_projects;
CREATE POLICY "Users and team members can view organization brand analysis projects" 
ON public.brand_analysis_projects 
FOR SELECT 
USING (user_id = get_effective_user_id());

DROP POLICY IF EXISTS "Users can create their own brand analysis projects" ON public.brand_analysis_projects;
CREATE POLICY "Users and team members can create organization brand analysis projects" 
ON public.brand_analysis_projects 
FOR INSERT 
WITH CHECK (user_id = get_effective_user_id());

DROP POLICY IF EXISTS "Users can update their own brand analysis projects" ON public.brand_analysis_projects;
CREATE POLICY "Users and team members can update organization brand analysis projects" 
ON public.brand_analysis_projects 
FOR UPDATE 
USING (user_id = get_effective_user_id())
WITH CHECK (user_id = get_effective_user_id());

DROP POLICY IF EXISTS "Users can delete their own brand analysis projects" ON public.brand_analysis_projects;
CREATE POLICY "Users and team members can delete organization brand analysis projects" 
ON public.brand_analysis_projects 
FOR DELETE 
USING (user_id = get_effective_user_id());

-- Update RLS policies for brand_mention_analysis table
DROP POLICY IF EXISTS "Users can view their own brand mention analysis" ON public.brand_mention_analysis;
CREATE POLICY "Users and team members can view organization brand mention analysis" 
ON public.brand_mention_analysis 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_mention_analysis.project_id AND user_id = get_effective_user_id()
));

DROP POLICY IF EXISTS "Users can create brand mention analysis for their projects" ON public.brand_mention_analysis;
CREATE POLICY "Users and team members can create organization brand mention analysis" 
ON public.brand_mention_analysis 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_mention_analysis.project_id AND user_id = get_effective_user_id()
));

DROP POLICY IF EXISTS "Users can update their own brand mention analysis" ON public.brand_mention_analysis;
CREATE POLICY "Users and team members can update organization brand mention analysis" 
ON public.brand_mention_analysis 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_mention_analysis.project_id AND user_id = get_effective_user_id()
));

DROP POLICY IF EXISTS "Users can delete their own brand mention analysis" ON public.brand_mention_analysis;
CREATE POLICY "Users and team members can delete organization brand mention analysis" 
ON public.brand_mention_analysis 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_mention_analysis.project_id AND user_id = get_effective_user_id()
));

-- Update RLS policies for brand_analysis_prompts table
DROP POLICY IF EXISTS "Users can view their own brand analysis prompts" ON public.brand_analysis_prompts;
CREATE POLICY "Users and team members can view organization brand analysis prompts" 
ON public.brand_analysis_prompts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_prompts.project_id AND user_id = get_effective_user_id()
));

DROP POLICY IF EXISTS "Users can create brand analysis prompts for their projects" ON public.brand_analysis_prompts;
CREATE POLICY "Users and team members can create organization brand analysis prompts" 
ON public.brand_analysis_prompts 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_prompts.project_id AND user_id = get_effective_user_id()
));

DROP POLICY IF EXISTS "Users can update their own brand analysis prompts" ON public.brand_analysis_prompts;
CREATE POLICY "Users and team members can update organization brand analysis prompts" 
ON public.brand_analysis_prompts 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_prompts.project_id AND user_id = get_effective_user_id()
));

DROP POLICY IF EXISTS "Users can delete their own brand analysis prompts" ON public.brand_analysis_prompts;
CREATE POLICY "Users and team members can delete organization brand analysis prompts" 
ON public.brand_analysis_prompts 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_prompts.project_id AND user_id = get_effective_user_id()
));

-- Update RLS policies for brand_analysis_sessions table
DROP POLICY IF EXISTS "Users can view their own brand analysis sessions" ON public.brand_analysis_sessions;
CREATE POLICY "Users and team members can view organization brand analysis sessions" 
ON public.brand_analysis_sessions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_sessions.project_id AND user_id = get_effective_user_id()
));

DROP POLICY IF EXISTS "Users can create brand analysis sessions for their projects" ON public.brand_analysis_sessions;
CREATE POLICY "Users and team members can create organization brand analysis sessions" 
ON public.brand_analysis_sessions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_sessions.project_id AND user_id = get_effective_user_id()
));

DROP POLICY IF EXISTS "Users can update their own brand analysis sessions" ON public.brand_analysis_sessions;
CREATE POLICY "Users and team members can update organization brand analysis sessions" 
ON public.brand_analysis_sessions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_sessions.project_id AND user_id = get_effective_user_id()
));

DROP POLICY IF EXISTS "Users can delete their own brand analysis sessions" ON public.brand_analysis_sessions;
CREATE POLICY "Users and team members can delete organization brand analysis sessions" 
ON public.brand_analysis_sessions 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_sessions.project_id AND user_id = get_effective_user_id()
));

-- Update RLS policies for brand_analysis_sources table (if it exists)
DROP POLICY IF EXISTS "Users can view sources for their projects" ON public.brand_analysis_sources;
CREATE POLICY "Users and team members can view organization brand analysis sources" 
ON public.brand_analysis_sources 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_sources.project_id AND user_id = get_effective_user_id()
));

DROP POLICY IF EXISTS "Users can insert sources for their projects" ON public.brand_analysis_sources;
CREATE POLICY "Users and team members can insert organization brand analysis sources" 
ON public.brand_analysis_sources 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_sources.project_id AND user_id = get_effective_user_id()
));

DROP POLICY IF EXISTS "Users can update sources for their projects" ON public.brand_analysis_sources;
CREATE POLICY "Users and team members can update organization brand analysis sources" 
ON public.brand_analysis_sources 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_sources.project_id AND user_id = get_effective_user_id()
));

DROP POLICY IF EXISTS "Users can delete sources for their projects" ON public.brand_analysis_sources;
CREATE POLICY "Users and team members can delete organization brand analysis sources" 
ON public.brand_analysis_sources 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_sources.project_id AND user_id = get_effective_user_id()
));

-- Update RLS policies for Reddit tables used by Answer Discovery
-- reddit_searches table
DROP POLICY IF EXISTS "Users can manage their own Reddit searches" ON public.reddit_searches;
DROP POLICY IF EXISTS "Users can insert their own searches" ON public.reddit_searches;
DROP POLICY IF EXISTS "Users can view their own searches" ON public.reddit_searches;

CREATE POLICY "Users and team members can view organization Reddit searches" 
ON public.reddit_searches 
FOR SELECT 
USING (user_id = get_effective_user_id());

CREATE POLICY "Users and team members can create organization Reddit searches" 
ON public.reddit_searches 
FOR INSERT 
WITH CHECK (user_id = get_effective_user_id());

CREATE POLICY "Users and team members can update organization Reddit searches" 
ON public.reddit_searches 
FOR UPDATE 
USING (user_id = get_effective_user_id())
WITH CHECK (user_id = get_effective_user_id());

CREATE POLICY "Users and team members can delete organization Reddit searches" 
ON public.reddit_searches 
FOR DELETE 
USING (user_id = get_effective_user_id());

-- reddit_user_bookmarks table
DROP POLICY IF EXISTS "Users can manage their own Reddit bookmarks" ON public.reddit_user_bookmarks;
DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON public.reddit_user_bookmarks;

CREATE POLICY "Users and team members can view organization Reddit bookmarks" 
ON public.reddit_user_bookmarks 
FOR SELECT 
USING (user_id = get_effective_user_id());

CREATE POLICY "Users and team members can create organization Reddit bookmarks" 
ON public.reddit_user_bookmarks 
FOR INSERT 
WITH CHECK (user_id = get_effective_user_id());

CREATE POLICY "Users and team members can update organization Reddit bookmarks" 
ON public.reddit_user_bookmarks 
FOR UPDATE 
USING (user_id = get_effective_user_id())
WITH CHECK (user_id = get_effective_user_id());

CREATE POLICY "Users and team members can delete organization Reddit bookmarks" 
ON public.reddit_user_bookmarks 
FOR DELETE 
USING (user_id = get_effective_user_id());

-- Update RLS policies for Reddit keyword tracking tables (if they exist)
-- reddit_tracked_keywords table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reddit_tracked_keywords') THEN
    DROP POLICY IF EXISTS "Users can manage their own tracked keywords" ON public.reddit_tracked_keywords;
    
    CREATE POLICY "Users and team members can view organization tracked keywords" 
    ON public.reddit_tracked_keywords 
    FOR SELECT 
    USING (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can create organization tracked keywords" 
    ON public.reddit_tracked_keywords 
    FOR INSERT 
    WITH CHECK (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can update organization tracked keywords" 
    ON public.reddit_tracked_keywords 
    FOR UPDATE 
    USING (user_id = get_effective_user_id())
    WITH CHECK (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can delete organization tracked keywords" 
    ON public.reddit_tracked_keywords 
    FOR DELETE 
    USING (user_id = get_effective_user_id());
  END IF;
END $$;

-- reddit_keyword_mentions table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reddit_keyword_mentions') THEN
    DROP POLICY IF EXISTS "Users can manage their own keyword mentions" ON public.reddit_keyword_mentions;
    
    CREATE POLICY "Users and team members can view organization keyword mentions" 
    ON public.reddit_keyword_mentions 
    FOR SELECT 
    USING (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can create organization keyword mentions" 
    ON public.reddit_keyword_mentions 
    FOR INSERT 
    WITH CHECK (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can update organization keyword mentions" 
    ON public.reddit_keyword_mentions 
    FOR UPDATE 
    USING (user_id = get_effective_user_id())
    WITH CHECK (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can delete organization keyword mentions" 
    ON public.reddit_keyword_mentions 
    FOR DELETE 
    USING (user_id = get_effective_user_id());
  END IF;
END $$;

-- reddit_keyword_stats table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reddit_keyword_stats') THEN
    DROP POLICY IF EXISTS "Users can manage their own keyword stats" ON public.reddit_keyword_stats;
    
    CREATE POLICY "Users and team members can view organization keyword stats" 
    ON public.reddit_keyword_stats 
    FOR SELECT 
    USING (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can create organization keyword stats" 
    ON public.reddit_keyword_stats 
    FOR INSERT 
    WITH CHECK (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can update organization keyword stats" 
    ON public.reddit_keyword_stats 
    FOR UPDATE 
    USING (user_id = get_effective_user_id())
    WITH CHECK (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can delete organization keyword stats" 
    ON public.reddit_keyword_stats 
    FOR DELETE 
    USING (user_id = get_effective_user_id());
  END IF;
END $$;

-- Update RLS policies for user_directories table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_directories') THEN
    DROP POLICY IF EXISTS "user_directories_select_policy" ON public.user_directories;
    DROP POLICY IF EXISTS "user_directories_insert_policy" ON public.user_directories;
    DROP POLICY IF EXISTS "user_directories_update_policy" ON public.user_directories;
    DROP POLICY IF EXISTS "user_directories_delete_policy" ON public.user_directories;
    
    CREATE POLICY "Users and team members can view organization directories" 
    ON public.user_directories 
    FOR SELECT 
    USING (user_id = get_effective_user_id() OR is_shared = true);

    CREATE POLICY "Users and team members can create organization directories" 
    ON public.user_directories 
    FOR INSERT 
    WITH CHECK (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can update organization directories" 
    ON public.user_directories 
    FOR UPDATE 
    USING (user_id = get_effective_user_id())
    WITH CHECK (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can delete organization directories" 
    ON public.user_directories 
    FOR DELETE 
    USING (user_id = get_effective_user_id());
  END IF;
END $$;

-- Update RLS policies for directory_submissions table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'directory_submissions') THEN
    DROP POLICY IF EXISTS "Users can view their own directory submissions" ON public.directory_submissions;
    DROP POLICY IF EXISTS "Users can create their own directory submissions" ON public.directory_submissions;
    DROP POLICY IF EXISTS "Users can update their own directory submissions" ON public.directory_submissions;
    DROP POLICY IF EXISTS "Users can delete their own directory submissions" ON public.directory_submissions;
    
    CREATE POLICY "Users and team members can view organization directory submissions" 
    ON public.directory_submissions 
    FOR SELECT 
    USING (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can create organization directory submissions" 
    ON public.directory_submissions 
    FOR INSERT 
    WITH CHECK (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can update organization directory submissions" 
    ON public.directory_submissions 
    FOR UPDATE 
    USING (user_id = get_effective_user_id())
    WITH CHECK (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can delete organization directory submissions" 
    ON public.directory_submissions 
    FOR DELETE 
    USING (user_id = get_effective_user_id());
  END IF;
END $$;

-- Update RLS policies for llm_bot_visits_robots table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'llm_bot_visits_robots') THEN
    DROP POLICY IF EXISTS "Users can view their own bot visits" ON public.llm_bot_visits_robots;
    DROP POLICY IF EXISTS "Users can create their own bot visits" ON public.llm_bot_visits_robots;
    DROP POLICY IF EXISTS "Users can update their own bot visits" ON public.llm_bot_visits_robots;
    DROP POLICY IF EXISTS "Users can delete their own bot visits" ON public.llm_bot_visits_robots;
    
    CREATE POLICY "Users and team members can view organization bot visits" 
    ON public.llm_bot_visits_robots 
    FOR SELECT 
    USING (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can create organization bot visits" 
    ON public.llm_bot_visits_robots 
    FOR INSERT 
    WITH CHECK (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can update organization bot visits" 
    ON public.llm_bot_visits_robots 
    FOR UPDATE 
    USING (user_id = get_effective_user_id())
    WITH CHECK (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can delete organization bot visits" 
    ON public.llm_bot_visits_robots 
    FOR DELETE 
    USING (user_id = get_effective_user_id());
  END IF;
END $$;

-- Update RLS policies for ghosttrace_sites table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ghosttrace_sites') THEN
    DROP POLICY IF EXISTS "Users can view their own sites" ON public.ghosttrace_sites;
    DROP POLICY IF EXISTS "Users can create their own sites" ON public.ghosttrace_sites;
    DROP POLICY IF EXISTS "Users can update their own sites" ON public.ghosttrace_sites;
    DROP POLICY IF EXISTS "Users can delete their own sites" ON public.ghosttrace_sites;
    
    CREATE POLICY "Users and team members can view organization ghosttrace sites" 
    ON public.ghosttrace_sites 
    FOR SELECT 
    USING (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can create organization ghosttrace sites" 
    ON public.ghosttrace_sites 
    FOR INSERT 
    WITH CHECK (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can update organization ghosttrace sites" 
    ON public.ghosttrace_sites 
    FOR UPDATE 
    USING (user_id = get_effective_user_id())
    WITH CHECK (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can delete organization ghosttrace sites" 
    ON public.ghosttrace_sites 
    FOR DELETE 
    USING (user_id = get_effective_user_id());
  END IF;
END $$;

-- Update RLS policies for user_websites table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_websites') THEN
    DROP POLICY IF EXISTS "Users can manage their own websites" ON public.user_websites;
    DROP POLICY IF EXISTS "Users can view their own websites" ON public.user_websites;
    DROP POLICY IF EXISTS "Users can create their own websites" ON public.user_websites;
    DROP POLICY IF EXISTS "Users can update their own websites" ON public.user_websites;
    DROP POLICY IF EXISTS "Users can delete their own websites" ON public.user_websites;
    
    CREATE POLICY "Users and team members can view organization websites" 
    ON public.user_websites 
    FOR SELECT 
    USING (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can create organization websites" 
    ON public.user_websites 
    FOR INSERT 
    WITH CHECK (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can update organization websites" 
    ON public.user_websites 
    FOR UPDATE 
    USING (user_id = get_effective_user_id())
    WITH CHECK (user_id = get_effective_user_id());

    CREATE POLICY "Users and team members can delete organization websites" 
    ON public.user_websites 
    FOR DELETE 
    USING (user_id = get_effective_user_id());
  END IF;
END $$;

-- Also need to handle ai_platform_responses table that is used by brand analysis
-- Check if ai_platform_responses exists and has project_id column
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_platform_responses') THEN
    -- Update ai_platform_responses policies if they exist
    DROP POLICY IF EXISTS "Users can view responses for their projects" ON public.ai_platform_responses;
    CREATE POLICY "Users and team members can view organization ai platform responses" 
    ON public.ai_platform_responses 
    FOR SELECT 
    USING (EXISTS (
      SELECT 1 FROM public.brand_analysis_projects 
      WHERE id = ai_platform_responses.project_id AND user_id = get_effective_user_id()
    ));

    DROP POLICY IF EXISTS "Users can insert responses for their projects" ON public.ai_platform_responses;
    CREATE POLICY "Users and team members can insert organization ai platform responses" 
    ON public.ai_platform_responses 
    FOR INSERT 
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.brand_analysis_projects 
      WHERE id = ai_platform_responses.project_id AND user_id = get_effective_user_id()
    ));

    DROP POLICY IF EXISTS "Users can update responses for their projects" ON public.ai_platform_responses;
    CREATE POLICY "Users and team members can update organization ai platform responses" 
    ON public.ai_platform_responses 
    FOR UPDATE 
    USING (EXISTS (
      SELECT 1 FROM public.brand_analysis_projects 
      WHERE id = ai_platform_responses.project_id AND user_id = get_effective_user_id()
    ));

    DROP POLICY IF EXISTS "Users can delete responses for their projects" ON public.ai_platform_responses;
    CREATE POLICY "Users and team members can delete organization ai platform responses" 
    ON public.ai_platform_responses 
    FOR DELETE 
    USING (EXISTS (
      SELECT 1 FROM public.brand_analysis_projects 
      WHERE id = ai_platform_responses.project_id AND user_id = get_effective_user_id()
    ));
  END IF;
END $$;
