-- Return quote and owner's org white_label_config for public proposal view (no auth).
CREATE OR REPLACE FUNCTION public.get_proposal_public(p_token UUID)
RETURNS TABLE (quote_data JSONB, white_label_config JSONB)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_jsonb(q.*),
    COALESCE(o.white_label_config, '{}'::jsonb)
  FROM public.quotes q
  LEFT JOIN public.organization_users ou ON ou.user_id = q.user_id AND ou.status = 'active'
  LEFT JOIN public.organizations o ON o.id = ou.organization_id
  WHERE q.share_token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_proposal_public(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_proposal_public(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_proposal_public(UUID) IS 'Public proposal view: returns quote and org white_label_config by share_token';
