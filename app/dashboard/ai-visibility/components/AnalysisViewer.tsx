"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Play,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Eye,
  RefreshCw
} from "lucide-react";

interface AnalysisSession {
  id: string;
  project_id: string;
  session_name: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  completed_queries?: number;
  total_queries?: number;
  results_summary?: any;
}

interface AnalysisViewerProps {
  sessionId?: string;
  projectId?: string;
  onBack?: () => void;
}

export default function AnalysisViewer({ sessionId, projectId, onBack }: AnalysisViewerProps) {
  const supabase = createClientComponentClient();
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AnalysisSession | null>(null);
  const [detailedResults, setDetailedResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Fetch all sessions for the project
  useEffect(() => {
    if (projectId) {
      fetchSessions();
    }
  }, [projectId]);

  // If a specific sessionId is provided, select it
  useEffect(() => {
    if (sessionId && sessions.length > 0) {
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        setSelectedSession(session);
        if (session.status === 'completed') {
          fetchDetailedResults(session.id);
        }
      }
    }
  }, [sessionId, sessions]);

  // Poll for updates on running sessions
  useEffect(() => {
    const runningSessions = sessions.filter(s => s.status === 'running');
    if (runningSessions.length > 0) {
      const interval = setInterval(() => {
        fetchSessions();
      }, 5000); // Poll every 5 seconds
      setPollingInterval(interval);
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [sessions]);

  const fetchSessions = async () => {
    if (!projectId) return;
    
    try {
      const { data, error } = await supabase
        .from('brand_analysis_sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      setSessions(data || []);
      
      // If we have a selected session, update it
      if (selectedSession) {
        const updated = data?.find(s => s.id === selectedSession.id);
        if (updated) {
          setSelectedSession(updated);
          if (updated.status === 'completed' && selectedSession.status !== 'completed') {
            fetchDetailedResults(updated.id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedResults = async (sessionId: string) => {
    try {
      // Fetch session details
      const { data: session, error: sessionError } = await supabase
        .from('brand_analysis_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Fetch platform responses
      const { data: responses, error: responsesError } = await supabase
        .from('ai_platform_responses')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (responsesError) throw responsesError;

      setDetailedResults({
        session,
        responses: responses || [],
        summary: session.results_summary || {}
      });
    } catch (error) {
      console.error('Error fetching detailed results:', error);
    }
  };

  const handleSessionClick = (session: AnalysisSession) => {
    setSelectedSession(session);
    if (session.status === 'completed') {
      fetchDetailedResults(session.id);
    } else {
      setDetailedResults(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const calculateProgress = (session: AnalysisSession) => {
    if (!session.total_queries || session.total_queries === 0) return 0;
    return Math.round((session.completed_queries || 0) / session.total_queries * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Brand Analysis</h1>
            <p className="text-gray-600 mt-1">View and monitor your AI visibility analyses</p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              New Analysis
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sessions List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Analysis Sessions</h2>
              
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No analysis sessions yet</p>
                  <p className="text-sm mt-2">Start a new analysis to see results here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const progress = calculateProgress(session);
                    const isSelected = selectedSession?.id === session.id;
                    
                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSessionClick(session)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50'
                            : getStatusColor(session.status)
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(session.status)}
                            <span className="font-semibold text-gray-900 text-sm">
                              {session.session_name || 'Analysis Session'}
                            </span>
                          </div>
                          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                            isSelected ? 'rotate-90' : ''
                          }`} />
                        </div>
                        
                        <div className="text-xs text-gray-600 mb-2">
                          {new Date(session.started_at).toLocaleDateString()} {new Date(session.started_at).toLocaleTimeString()}
                        </div>
                        
                        {session.status === 'running' && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {session.completed_queries || 0} / {session.total_queries || 0} queries
                            </div>
                          </div>
                        )}
                        
                        {session.status === 'completed' && session.results_summary && (
                          <div className="mt-2 text-xs text-gray-600">
                            <div className="flex items-center gap-4">
                              <span>Mentions: {session.results_summary.total_mentions || 0}</span>
                              <span>Rate: {((session.results_summary.mention_rate || 0) * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-2">
            {selectedSession ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {selectedSession.status === 'running' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-6 h-6 text-blue-500 animate-pulse" />
                      <h2 className="text-xl font-semibold text-gray-900">Analysis in Progress</h2>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">Progress</span>
                        <span className="text-sm font-semibold text-blue-600">
                          {calculateProgress(selectedSession)}%
                        </span>
                      </div>
                      <div className="w-full h-3 bg-blue-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${calculateProgress(selectedSession)}%` }}
                        />
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        Processing {selectedSession.completed_queries || 0} of {selectedSession.total_queries || 0} queries
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      Started: {new Date(selectedSession.started_at).toLocaleString()}
                    </div>
                  </div>
                ) : selectedSession.status === 'completed' ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        <h2 className="text-xl font-semibold text-gray-900">Analysis Complete</h2>
                      </div>
                      <button
                        onClick={() => fetchDetailedResults(selectedSession.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </div>

                    {detailedResults ? (
                      <div className="space-y-6">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <div className="text-sm text-gray-600 mb-1">Total Queries</div>
                            <div className="text-2xl font-bold text-purple-600">
                              {detailedResults.summary.total_queries || 0}
                            </div>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="text-sm text-gray-600 mb-1">Brand Mentions</div>
                            <div className="text-2xl font-bold text-green-600">
                              {detailedResults.summary.total_mentions || 0}
                            </div>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="text-sm text-gray-600 mb-1">Mention Rate</div>
                            <div className="text-2xl font-bold text-blue-600">
                              {((detailedResults.summary.mention_rate || 0) * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="text-sm text-gray-600 mb-1">Platforms</div>
                            <div className="text-2xl font-bold text-orange-600">
                              {detailedResults.summary.platforms_analyzed?.length || 0}
                            </div>
                          </div>
                        </div>

                        {/* Platform Breakdown */}
                        {detailedResults.summary.platforms_analyzed && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Platforms Analyzed</h3>
                            <div className="flex flex-wrap gap-2">
                              {detailedResults.summary.platforms_analyzed.map((platform: string) => (
                                <span
                                  key={platform}
                                  className="px-3 py-1 bg-gray-100 text-gray-900 rounded-lg text-sm capitalize"
                                >
                                  {platform}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Responses List */}
                        {detailedResults.responses && detailedResults.responses.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Query Responses</h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {detailedResults.responses.slice(0, 20).map((response: any) => (
                                <div
                                  key={response.id}
                                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-900 capitalize">
                                      {response.platform}
                                    </span>
                                    {response.response_metadata?.brand_mentioned && (
                                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                        Brand Mentioned
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-600 mb-2">
                                    <strong>Query:</strong> {response.prompt}
                                  </div>
                                  <div className="text-sm text-gray-700 line-clamp-2">
                                    {response.response}
                                  </div>
                                  {response.response_metadata?.sentiment_score !== null && (
                                    <div className="mt-2 text-xs text-gray-500">
                                      Sentiment: {response.response_metadata.sentiment_score?.toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            {detailedResults.responses.length > 20 && (
                              <div className="text-center mt-4 text-sm text-gray-600">
                                Showing 20 of {detailedResults.responses.length} responses
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>Click "View Details" to see full results</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-6 h-6 text-red-500" />
                      <h2 className="text-xl font-semibold text-gray-900">Analysis Failed</h2>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-gray-900">
                        {selectedSession.results_summary?.error || 'Analysis failed. Please try again.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select an Analysis</h3>
                <p className="text-gray-600">
                  Choose an analysis session from the list to view details and results
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

