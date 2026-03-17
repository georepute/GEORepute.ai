import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export type BillingFeature =
  | 'ai_visibility'
  | 'content_publishing'
  | 'analytics_competitor'
  | 'reputation_monitoring'
  | 'opportunity_sales'
  | 'prompt_monitoring'
  | 'dashboard'
  | 'domain_connection'
  | 'settings'
  | 'seat_management'
  | 'view_reports'
  | 'intelligence_signals';

const BASE_PLAN_FEATURES: BillingFeature[] = [
  'dashboard',
  'domain_connection',
  'settings',
  'seat_management',
  'prompt_monitoring',
  'view_reports',
  'intelligence_signals',
];

const MODULE_FEATURE_MAP: Record<string, BillingFeature> = {
  ai_visibility: 'ai_visibility',
  content_publishing: 'content_publishing',
  analytics_competitor: 'analytics_competitor',
  reputation_monitoring: 'reputation_monitoring',
  opportunity_sales: 'opportunity_sales',
};

export interface OrganizationSubscription {
  plan: {
    id: string;
    name: string;
    display_name: string;
    monthly_price_cents: number;
    domain_limit: number;
    features: string[];
  } | null;
  subscription: {
    id: string;
    status: string;
    stripe_subscription_id: string;
    current_period_end: string;
    commitment_end_date: string | null;
    cancel_at_period_end: boolean;
  } | null;
  activeModules: string[];
}

export async function getOrganizationSubscription(orgId: string): Promise<OrganizationSubscription> {
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('current_plan_id')
    .eq('id', orgId)
    .single();

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('*, plan:subscription_plans(*)')
    .eq('organization_id', orgId)
    .in('status', ['active', 'past_due', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const activeModuleNames: string[] = [];
  if (subscription) {
    const { data: modules } = await supabaseAdmin
      .from('subscription_modules')
      .select('module:modules(name)')
      .eq('subscription_id', subscription.id)
      .eq('status', 'active');

    if (modules) {
      for (const m of modules) {
        const mod = m.module as any;
        if (mod?.name) activeModuleNames.push(mod.name);
      }
    }
  }

  const plan = subscription?.plan || null;

  return {
    plan: plan ? {
      id: plan.id,
      name: plan.name,
      display_name: plan.display_name,
      monthly_price_cents: plan.monthly_price_cents,
      domain_limit: plan.domain_limit,
      features: typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || []),
    } : null,
    subscription: subscription ? {
      id: subscription.id,
      status: subscription.status,
      stripe_subscription_id: subscription.stripe_subscription_id,
      current_period_end: subscription.current_period_end,
      commitment_end_date: subscription.commitment_end_date,
      cancel_at_period_end: subscription.cancel_at_period_end,
    } : null,
    activeModules: activeModuleNames,
  };
}

export function canAccessFeature(
  orgSub: OrganizationSubscription,
  feature: BillingFeature
): boolean {
  // Base plan features are always available when subscribed
  if (BASE_PLAN_FEATURES.includes(feature)) {
    return orgSub.plan !== null && orgSub.subscription?.status !== 'canceled';
  }

  // Module features require the module to be active
  const requiredModule = Object.entries(MODULE_FEATURE_MAP).find(([, f]) => f === feature);
  if (requiredModule) {
    return orgSub.activeModules.includes(requiredModule[0]);
  }

  return false;
}

export function getDomainLimit(orgSub: OrganizationSubscription): number {
  return orgSub.plan?.domain_limit || 0;
}

export function isWithinCommitment(orgSub: OrganizationSubscription): boolean {
  if (!orgSub.subscription?.commitment_end_date) return false;
  return new Date(orgSub.subscription.commitment_end_date) > new Date();
}

export function getLockedFeatures(orgSub: OrganizationSubscription): BillingFeature[] {
  const allModuleFeatures: BillingFeature[] = Object.values(MODULE_FEATURE_MAP);
  return allModuleFeatures.filter((f) => !canAccessFeature(orgSub, f));
}

export const MODULE_DISPLAY_NAMES: Record<string, string> = {
  ai_visibility: 'AI Visibility & AI Search Intelligence',
  content_publishing: 'Content & Publishing',
  analytics_competitor: 'Analytics & Competitor Intelligence',
  reputation_monitoring: 'Reputation Monitoring',
  opportunity_sales: 'Opportunity & Sales Intelligence',
};

export function getModuleForFeature(feature: BillingFeature): string | null {
  const entry = Object.entries(MODULE_FEATURE_MAP).find(([, f]) => f === feature);
  return entry ? MODULE_DISPLAY_NAMES[entry[0]] || entry[0] : null;
}
