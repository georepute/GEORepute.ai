"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useLanguage } from "@/lib/language-context";
import { 
  Target,
  Eye,
  Pencil,
  Search,
  RefreshCw,
  ChevronDown,
  X,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Lightbulb,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

interface Project {
  id: string;
  brand_name: string;
  industry: string;
  website_url?: string;
  competitors?: string[];
  keywords?: string[];
  created_at: string;
}

interface Session {
  id: string;
  project_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
}

interface MissedPromptAction {
  id: string;
  project_id: string;
  prompt_text: string;
  status: 'content_created' | 'published' | 'dismissed';
  published_url?: string;
  content_id?: string;
  created_at: string;
}

export default function MissedPromptsPage() {
  const { isRtl, t, language } = useLanguage();
  const supabase = createClientComponentClient();
  const router = useRouter();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectSessions, setProjectSessions] = useState<Session[]>([]);
  const [projectResponses, setProjectResponses] = useState<any[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [viewResponseModal, setViewResponseModal] = useState<{ open: boolean; response: any; prompt: string } | null>(null);
  const [promptActions, setPromptActions] = useState<MissedPromptAction[]>([]);
  const [showPublished, setShowPublished] = useState(false);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch responses and prompt actions when project is selected
  useEffect(() => {
    if (selectedProject) {
      const latestCompleted = projectSessions.find(s => s.project_id === selectedProject.id && s.status === 'completed');
      if (latestCompleted?.id) {
        fetchProjectResponses(latestCompleted.id);
      } else {
        const latestSession = projectSessions.find(s => s.project_id === selectedProject.id);
        if (latestSession?.id) {
          fetchProjectResponses(latestSession.id);
        }
      }
      fetchPromptActions();
    }
  }, [selectedProject, projectSessions]);

  const fetchPromptActions = async () => {
    if (!selectedProject) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('missed_prompt_actions')
        .select('*')
        .eq('project_id', selectedProject.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching prompt actions:', error);
        return;
      }
      setPromptActions(data || []);
    } catch (error) {
      console.error('Error fetching prompt actions:', error);
    }
  };

  const getPromptAction = (prompt: string): MissedPromptAction | undefined => {
    const normalized = prompt.trim().toLowerCase();
    return promptActions.find(a => a.prompt_text.trim().toLowerCase() === normalized);
  };

  const markPromptDismissed = async (prompt: string) => {
    if (!selectedProject) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if record already exists
      const { data: existing } = await supabase
        .from('missed_prompt_actions')
        .select('id')
        .eq('project_id', selectedProject.id)
        .eq('prompt_text', prompt)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('missed_prompt_actions')
          .update({ status: 'dismissed', updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) {
          console.error('Error dismissing prompt:', error);
          toast.error('Failed to dismiss prompt');
          return;
        }
      } else {
        const { error } = await supabase
          .from('missed_prompt_actions')
          .insert({
            project_id: selectedProject.id,
            user_id: user.id,
            prompt_text: prompt,
            status: 'dismissed',
          });
        if (error) {
          console.error('Error dismissing prompt:', error);
          toast.error(t.dashboard.missedPromptsPage.failedToDismiss);
          return;
        }
      }

      toast.success(t.dashboard.missedPromptsPage.promptDismissed);
      await fetchPromptActions();
    } catch (error) {
      console.error('Error dismissing prompt:', error);
      toast.error(t.dashboard.missedPromptsPage.failedToDismiss);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('brand_analysis_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);

      // Fetch latest session for each project
      if (data && data.length > 0) {
        const projectIds = data.map(p => p.id);
        const { data: sessions, error: sessionsError } = await supabase
          .from('brand_analysis_sessions')
          .select('*')
          .in('project_id', projectIds)
          .order('started_at', { ascending: false });

        if (sessionsError) {
          console.error('Error fetching sessions:', sessionsError);
        }

        // Group sessions by project and get latest
        const latestSessions = projectIds.map(projectId => {
          const projectSessions = (sessions || []).filter(s => s.project_id === projectId);
          return projectSessions.length > 0 ? projectSessions[0] : null;
        }).filter(Boolean) as Session[];

        setProjectSessions(latestSessions);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error(t.dashboard.missedPromptsPage.failedToLoadProjects);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectResponses = async (sessionId: string) => {
    try {
      setLoadingResponses(true);
      const { data: responses, error } = await supabase
        .from('ai_platform_responses')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter only missed prompts (brand_mentioned = false)
      const missedResponses = (responses || []).filter(r => !r.response_metadata?.brand_mentioned);
      setProjectResponses(missedResponses);
    } catch (error) {
      console.error('Error fetching responses:', error);
      toast.error(t.dashboard.missedPromptsPage.failedToLoadPrompts);
      setProjectResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  };

  // Helper function to get model badge color
  const getModelBadgeColor = (platform: string) => {
    const platformLower = platform?.toLowerCase() || '';
    if (platformLower.includes('claude')) return 'bg-orange-100 text-orange-800';
    if (platformLower.includes('chatgpt') || platformLower.includes('gpt')) return 'bg-green-100 text-green-800';
    if (platformLower.includes('gemini')) return 'bg-blue-100 text-blue-800';
    if (platformLower.includes('perplexity')) return 'bg-purple-100 text-purple-800';
    if (platformLower.includes('groq') || platformLower.includes('grok')) return 'bg-pink-100 text-pink-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Helper function to get model display name
  const getModelDisplayName = (platform: string) => {
    const platformLower = platform?.toLowerCase() || '';
    if (platformLower.includes('claude')) return 'Claude';
    if (platformLower.includes('chatgpt') || platformLower.includes('gpt')) return 'GPT';
    if (platformLower.includes('gemini')) return 'Gemini';
    if (platformLower.includes('perplexity')) return 'Perplexity';
    if (platformLower.includes('groq') || platformLower.includes('grok')) return 'Groq';
    return platform?.charAt(0).toUpperCase() + platform?.slice(1) || 'Unknown';
  };

  // Group responses by prompt
  const groupedByPrompt: Record<string, typeof projectResponses> = {};
  projectResponses.forEach((response) => {
    const promptKey = response.prompt?.trim().toLowerCase() || '';
    if (!groupedByPrompt[promptKey]) {
      groupedByPrompt[promptKey] = [];
    }
    groupedByPrompt[promptKey].push(response);
  });

  const allPromptKeys = Object.keys(groupedByPrompt);
  const activePrompts = allPromptKeys.filter(k => !getPromptAction(groupedByPrompt[k][0]?.prompt));
  const addressedPrompts = allPromptKeys.filter(k => !!getPromptAction(groupedByPrompt[k][0]?.prompt));
  const displayedPrompts = showPublished ? allPromptKeys : activePrompts;

  return (
    <div className="min-h-screen bg-gray-50" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t.dashboard.missedPromptsPage.title}</h1>
        </div>

        {/* Informative Banner */}
        <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 border border-purple-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                {t.dashboard.missedPromptsPage.bannerTitle}
              </h2>
              <p className="text-gray-700 mb-4 leading-relaxed text-base">
                <strong className="text-gray-900">{t.dashboard.missedPromptsPage.bannerDesc}</strong>{' '}
                <strong className="text-gray-900">{t.dashboard.missedPromptsPage.bannerDescBold}</strong>.{' '}
                {t.dashboard.missedPromptsPage.bannerDescFull}
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-5">
                <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Target className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{t.dashboard.missedPromptsPage.findWhatYouMissed}</h3>
                    <p className="text-xs text-gray-600">{t.dashboard.missedPromptsPage.findWhatYouMissedDesc}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{t.dashboard.missedPromptsPage.createWinningContent}</h3>
                    <p className="text-xs text-gray-600">{t.dashboard.missedPromptsPage.createWinningContentDesc}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{t.dashboard.missedPromptsPage.boostVisibility}</h3>
                    <p className="text-xs text-gray-600">{t.dashboard.missedPromptsPage.boostVisibilityDesc}</p>
                  </div>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-purple-200 bg-white/40 rounded-lg p-3">
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <AlertCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-gray-900">{t.dashboard.missedPromptsPage.getStarted}</strong> {t.dashboard.missedPromptsPage.getStartedDesc}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Project Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-purple-600" />
            <label className="block text-sm font-semibold text-gray-900">
              {t.dashboard.missedPromptsPage.selectProject}
            </label>
          </div>
          <div className="max-w-md">
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = projects.find(p => p.id === e.target.value);
                setSelectedProject(project || null);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white text-gray-900"
            >
              <option value="">{t.dashboard.missedPromptsPage.selectProjectPlaceholder}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.brand_name} ({project.industry})
                </option>
              ))}
            </select>
            {selectedProject && (
              <p className="mt-2 text-sm text-gray-600">
                {t.dashboard.missedPromptsPage.viewingFor} <strong>{selectedProject.brand_name}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loadingResponses && (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 text-purple-600 animate-spin" />
            <p className="text-gray-600">{t.dashboard.missedPromptsPage.loadingPrompts}</p>
          </div>
        )}

        {/* Missed Prompts List */}
        {!loadingResponses && selectedProject && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Search className="w-5 h-5 text-purple-600" />
                  {t.dashboard.missedPromptsPage.missedPrompts}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  <strong className="text-purple-600">{activePrompts.length}</strong> {activePrompts.length !== 1 ? t.dashboard.missedPromptsPage.pendingPrompts : t.dashboard.missedPromptsPage.pendingPrompt}
                  {addressedPrompts.length > 0 && (
                    <span className="text-green-600 ml-1">
                      ({addressedPrompts.length} {t.dashboard.missedPromptsPage.addressed})
                    </span>
                  )}
                </p>
              </div>
              {addressedPrompts.length > 0 && (
                <button
                  onClick={() => setShowPublished(!showPublished)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {showPublished ? t.dashboard.missedPromptsPage.hideAddressed : `${t.dashboard.missedPromptsPage.showAddressed} (${addressedPrompts.length})`}
                </button>
              )}
            </div>

            {projectResponses.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>{t.dashboard.missedPromptsPage.noMissedPrompts}</p>
                <p className="text-sm mt-2">{t.dashboard.missedPromptsPage.allMentioned}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedPrompts.map((promptKey) => {
                  const responses = groupedByPrompt[promptKey];
                  const firstResponse = responses[0];
                  const uniquePrompt = firstResponse.prompt;
                  const action = getPromptAction(uniquePrompt);
                  const isAddressed = !!action;

                  return (
                    <div
                      key={promptKey}
                      className={`border rounded-lg p-4 transition-colors bg-white ${
                        isAddressed 
                          ? 'border-green-200 bg-green-50/30 opacity-75' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {/* Query Section */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-sm font-medium text-gray-700">{t.dashboard.missedPromptsPage.query}</div>
                          {isAddressed ? (
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md">
                                <CheckCircle className="w-3.5 h-3.5" />
                                {action.status === 'published' ? t.dashboard.missedPromptsPage.publishedStatus : action.status === 'dismissed' ? t.dashboard.missedPromptsPage.dismissedStatus : t.dashboard.missedPromptsPage.contentCreatedStatus}
                              </span>
                              {action.published_url && (
                                <a
                                  href={action.published_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                  title={t.dashboard.missedPromptsPage.viewPublished}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {t.dashboard.missedPromptsPage.viewBtn}
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const editData = {
                                    prompt: uniquePrompt,
                                    responses: responses.map(r => ({
                                      id: r.id,
                                      platform: r.platform,
                                      response: r.response,
                                      response_metadata: r.response_metadata
                                    })),
                                    projectId: selectedProject?.id,
                                    brandName: selectedProject?.brand_name,
                                    industry: selectedProject?.industry,
                                    keywords: selectedProject?.keywords || [],
                                    competitors: selectedProject?.competitors || []
                                  };
                                  sessionStorage.setItem('editPromptData', JSON.stringify(editData));
                                  router.push('/dashboard/content?source=missed-prompts&step=content-generation');
                                }}
                                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                                title={t.dashboard.missedPromptsPage.generateNewContentTooltip}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                {t.dashboard.missedPromptsPage.generateNewContent}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  markPromptDismissed(uniquePrompt);
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                title={t.dashboard.missedPromptsPage.dismissTooltip}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                          {uniquePrompt}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center justify-end mb-4">
                        {isAddressed ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            {action.status === 'published' ? t.dashboard.missedPromptsPage.contentPublished : action.status === 'dismissed' ? t.dashboard.missedPromptsPage.dismissedStatus : t.dashboard.missedPromptsPage.contentCreatedStatus}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                            {t.dashboard.missedPromptsPage.brandNotMentioned}
                          </span>
                        )}
                      </div>

                      {/* All Responses from Different Models */}
                      <div className="space-y-3">
                        {responses.map((response) => (
                          <div
                            key={response.id}
                            className="border-l-2 border-gray-200 pl-3 py-2 bg-gray-50 rounded-r"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getModelBadgeColor(response.platform)}`}>
                                {getModelDisplayName(response.platform)}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="flex-1 text-sm text-gray-700 line-clamp-3">
                                {response.response}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setViewResponseModal({ open: true, response, prompt: uniquePrompt });
                                }}
                                className="flex-shrink-0 p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                                title={t.dashboard.missedPromptsPage.viewFullResponse}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* View Response Modal */}
        {viewResponseModal && viewResponseModal.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t.dashboard.missedPromptsPage.fullResponse}</h3>
                  <p className="text-sm text-gray-600 mt-1">{viewResponseModal.prompt}</p>
                </div>
                <button
                  onClick={() => setViewResponseModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getModelBadgeColor(viewResponseModal.response.platform)}`}>
                    {getModelDisplayName(viewResponseModal.response.platform)}
                  </span>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {viewResponseModal.response.response}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
