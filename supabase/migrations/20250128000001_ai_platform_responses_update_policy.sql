-- Allow users to update ai_platform_responses for their own projects (e.g. gap_suggestion).
CREATE POLICY "Users can update responses for their projects"
  ON ai_platform_responses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM brand_analysis_projects
      WHERE brand_analysis_projects.id = ai_platform_responses.project_id
      AND brand_analysis_projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brand_analysis_projects
      WHERE brand_analysis_projects.id = ai_platform_responses.project_id
      AND brand_analysis_projects.user_id = auth.uid()
    )
  );
