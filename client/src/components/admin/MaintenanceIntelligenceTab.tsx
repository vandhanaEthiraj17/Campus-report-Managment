import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type {
  IIntelligenceOverview,
  IAssetHealth,
  IRecommendation,
  IRecurringIntelligence,
  IUser
} from '../../types/index';
import {
  Brain, ShieldCheck, AlertTriangle, Wrench, RefreshCw,
  Check, X, Eye, Zap, Wifi, Layers, Info, Plus
} from 'lucide-react';
import canvasConfetti from 'canvas-confetti';

export const MaintenanceIntelligenceTab: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'recommendations' | 'health' | 'hotspots'>('recommendations');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data states
  const [metrics, setMetrics] = useState<IIntelligenceOverview | null>(null);
  const [healthAssessments, setHealthAssessments] = useState<IAssetHealth[]>([]);
  const [recommendations, setRecommendations] = useState<IRecommendation[]>([]);
  const [recurringData, setRecurringData] = useState<IRecurringIntelligence | null>(null);
  const [staffUsers, setStaffUsers] = useState<IUser[]>([]);

  // Filter states
  const [analysisDays, setAnalysisDays] = useState(60);
  const [recStatusFilter, setRecStatusFilter] = useState('');
  const [recPriorityFilter, setRecPriorityFilter] = useState('');
  const [healthCategoryFilter, setHealthCategoryFilter] = useState('');
  const [searchHealth, setSearchHealth] = useState('');

  // Modals state
  const [selectedHealthDetail, setSelectedHealthDetail] = useState<IAssetHealth | null>(null);
  const [showHealthModal, setShowHealthModal] = useState(false);

  const [dismissTargetRec, setDismissTargetRec] = useState<IRecommendation | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  const [showDismissModal, setShowDismissModal] = useState(false);

  const [scheduleTargetRec, setScheduleTargetRec] = useState<IRecommendation | null>(null);
  const [schedDate, setSchedDate] = useState('');
  const [schedStaffId, setSchedStaffId] = useState('');
  const [schedDesc, setSchedDesc] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [metricsRes, healthRes, recsRes, recurringRes, staffRes] = await Promise.all([
        api.get('/intelligence/overview'),
        api.get('/intelligence/health', {
          params: {
            category: healthCategoryFilter || undefined,
            search: searchHealth || undefined,
          },
        }),
        api.get('/intelligence/recommendations', {
          params: {
            status: recStatusFilter || undefined,
            priority: recPriorityFilter || undefined,
          },
        }),
        api.get('/intelligence/recurring-issues', {
          params: { days: analysisDays },
        }),
        api.get('/admin/users', { params: { role: 'STAFF' } }),
      ]);

      setMetrics(metricsRes.data);
      setHealthAssessments(healthRes.data.assessments || []);
      setRecommendations(recsRes.data.recommendations || []);
      setRecurringData(recurringRes.data);
      setStaffUsers(staffRes.data.users || []);
    } catch (err) {
      console.error('Failed to load maintenance intelligence data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [analysisDays, recStatusFilter, recPriorityFilter, healthCategoryFilter, searchHealth]);

  const handleRefreshEvaluation = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.post('/intelligence/refresh');
      canvasConfetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      alert(res.data.message || 'Intelligence assessment updated successfully.');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to refresh intelligence assessment.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReviewRecommendation = async (recId: string) => {
    try {
      await api.patch(`/intelligence/recommendations/${recId}/review`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to review recommendation.');
    }
  };

  const handleAddressRecommendation = async (recId: string) => {
    try {
      await api.patch(`/intelligence/recommendations/${recId}/address`);
      alert('Recommendation marked as addressed.');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to address recommendation.');
    }
  };

  const openDismissModal = (rec: IRecommendation) => {
    setDismissTargetRec(rec);
    setDismissReason('');
    setShowDismissModal(true);
  };

  const submitDismissal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dismissTargetRec || !dismissReason.trim()) {
      alert('A valid dismissal reason is required.');
      return;
    }

    try {
      await api.post(`/intelligence/recommendations/${dismissTargetRec._id}/dismiss`, {
        dismissalReason: dismissReason.trim(),
      });
      setShowDismissModal(false);
      alert('Recommendation dismissed.');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dismiss recommendation.');
    }
  };

  const openScheduleFromRec = (rec: IRecommendation) => {
    setScheduleTargetRec(rec);
    setSchedDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10)); // Tomorrow
    setSchedStaffId(typeof rec.assignedStaff === 'object' && rec.assignedStaff ? (rec.assignedStaff as any)._id : '');
    setSchedDesc(`Actioning Recommendation [${rec.recommendationCode}]: ${rec.suggestedAction}`);
    setShowScheduleModal(true);
  };

  const submitScheduleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTargetRec) return;

    try {
      // 1. Create Maintenance Task
      const targetAssetId = typeof scheduleTargetRec.asset === 'object' ? (scheduleTargetRec.asset as any)._id : scheduleTargetRec.asset;
      const taskRes = await api.post('/maintenance/schedule', {
        assetId: targetAssetId,
        maintenanceType: 'PREVENTIVE',
        scheduledDate: schedDate,
        assignedStaffId: schedStaffId || undefined,
        workDescription: schedDesc,
        notes: `Spawned from Maintenance Intelligence Recommendation: ${scheduleTargetRec.recommendationCode}`,
      });

      const createdTask = taskRes.data.record;

      // 2. Link task to recommendation
      if (createdTask?._id) {
        await api.post(`/intelligence/recommendations/${scheduleTargetRec._id}/link-task`, {
          maintenanceRecordId: createdTask._id,
        });
      }

      alert(`Maintenance task ${createdTask?.recordId || ''} created and linked to recommendation.`);
      setShowScheduleModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create and link maintenance task.');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200 font-black animate-pulse';
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'LOW':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRecStatusBadge = (st: string) => {
    switch (st) {
      case 'OPEN':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'REVIEWED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'TASK_CREATED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold';
      case 'ADDRESSED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DISMISSED':
        return 'bg-slate-100 text-slate-500 border-slate-200 line-through';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Action Bar */}
      <div className="glass-card rounded-2xl p-5 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 font-outfit flex items-center gap-2">
              Maintenance Intelligence & Asset Health Engine
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-bold uppercase">
                Deterministic Rules
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Explainable asset health indicators, recurring failure pattern analytics, and data-driven maintenance actions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
            <span className="text-[11px] text-slate-500 font-bold px-1.5">Window:</span>
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setAnalysisDays(d)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  analysisDays === d
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          <button
            onClick={handleRefreshEvaluation}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Evaluating...' : 'Refresh Assessments'}
          </button>
        </div>
      </div>

      {/* 2. Key Intelligence Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="glass-card rounded-2xl p-3.5 border border-slate-200 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Evaluated</span>
          <div className="mt-1">
            <span className="text-2xl font-black text-slate-800 font-outfit">
              {metrics?.totalAssets ?? 0}
            </span>
            <span className="block text-[10px] text-slate-400 font-medium">100% evaluated</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-3.5 border border-slate-200 flex flex-col justify-between bg-emerald-50/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Healthy (80-100)</span>
          <div className="mt-1">
            <span className="text-2xl font-black text-emerald-700 font-outfit">
              {metrics?.healthDistribution.healthy ?? 0}
            </span>
            <span className="block text-[10px] text-emerald-800 font-medium">Optimal operation</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-3.5 border border-slate-200 flex flex-col justify-between bg-blue-50/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Needs Attention</span>
          <div className="mt-1">
            <span className="text-2xl font-black text-blue-700 font-outfit">
              {metrics?.healthDistribution.needsAttention ?? 0}
            </span>
            <span className="block text-[10px] text-blue-800 font-medium">Score 60-79</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-3.5 border border-slate-200 flex flex-col justify-between bg-amber-50/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">At Risk</span>
          <div className="mt-1">
            <span className="text-2xl font-black text-amber-700 font-outfit">
              {metrics?.healthDistribution.atRisk ?? 0}
            </span>
            <span className="block text-[10px] text-amber-800 font-medium">Score 40-59</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-3.5 border border-slate-200 flex flex-col justify-between bg-rose-50/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Critical (0-39)</span>
          <div className="mt-1">
            <span className="text-2xl font-black text-rose-700 font-outfit">
              {metrics?.healthDistribution.critical ?? 0}
            </span>
            <span className="block text-[10px] text-rose-800 font-medium">Immediate action</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-3.5 border border-slate-200 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Recurring Issues</span>
          <div className="mt-1">
            <span className="text-2xl font-black text-purple-700 font-outfit">
              {metrics?.recurringComplaintAssets ?? 0}
            </span>
            <span className="block text-[10px] text-slate-400 font-medium">≥ 2 complaints</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-3.5 border border-slate-200 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Overdue Tasks</span>
          <div className="mt-1">
            <span className="text-2xl font-black text-orange-700 font-outfit">
              {metrics?.overdueTasks ?? 0}
            </span>
            <span className="block text-[10px] text-slate-400 font-medium">Breached schedule</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-3.5 border border-slate-200 flex flex-col justify-between bg-indigo-50/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Open Recs</span>
          <div className="mt-1">
            <span className="text-2xl font-black text-indigo-700 font-outfit">
              {metrics?.recommendationsSummary.open ?? 0}
            </span>
            <span className="block text-[10px] text-indigo-800 font-medium">
              Total: {metrics?.recommendationsSummary.total ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Section Switcher: Recommendations vs Asset Health Scoreboard vs Recurring Hotspots */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3 flex-wrap">
        <button
          onClick={() => setActiveSection('recommendations')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSection === 'recommendations'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Wrench className="h-3.5 w-3.5" />
          Maintenance Recommendations ({recommendations.length})
        </button>

        <button
          onClick={() => setActiveSection('health')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSection === 'health'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Asset Health Indicators ({healthAssessments.length})
        </button>

        <button
          onClick={() => setActiveSection('hotspots')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSection === 'hotspots'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Recurring Failure Hotspots
        </button>
      </div>

      {/* SECTION 1: RECOMMENDATIONS QUEUE */}
      {activeSection === 'recommendations' && (
        <div className="space-y-4">
          {/* Recommendation Filter Bar */}
          <div className="glass-card rounded-2xl p-4 border border-slate-200 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filters:</span>
              <select
                value={recStatusFilter}
                onChange={(e) => setRecStatusFilter(e.target.value)}
                className="glass-input rounded-xl px-3 py-1.5 text-xs"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="REVIEWED">REVIEWED</option>
                <option value="TASK_CREATED">TASK_CREATED</option>
                <option value="ADDRESSED">ADDRESSED</option>
                <option value="DISMISSED">DISMISSED</option>
              </select>

              <select
                value={recPriorityFilter}
                onChange={(e) => setRecPriorityFilter(e.target.value)}
                className="glass-input rounded-xl px-3 py-1.5 text-xs"
              >
                <option value="">All Priorities</option>
                <option value="URGENT">URGENT</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <span className="text-xs text-slate-400 font-semibold">
              Showing {recommendations.length} action item(s)
            </span>
          </div>

          {isLoading ? (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Evaluating recommendation queue...</span>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-400 space-y-2">
              <ShieldCheck className="h-8 w-8 mx-auto text-emerald-500" />
              <h3 className="font-bold text-slate-700 text-sm">No active recommendations in this filter</h3>
              <p className="text-xs text-slate-500">
                All campus assets are within expected maintenance parameters or open items have been addressed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div
                  key={rec._id}
                  className="glass-card rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        {rec.recommendationCode}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getPriorityBadge(rec.priority)}`}>
                        {rec.priority}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                        {rec.recommendationType.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRecStatusBadge(rec.status)}`}>
                        {rec.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Asset Health: <strong className="text-slate-800">{rec.healthScoreAtCreation}/100</strong>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 text-sm font-outfit">
                      {rec.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {rec.explanation}
                    </p>
                  </div>

                  {/* Supporting Facts Pill List */}
                  {rec.evidence && rec.evidence.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Supporting Telemetry & Database Facts
                      </span>
                      <div className="space-y-0.5">
                        {rec.evidence.map((ev, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-slate-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                            <span className="text-[11px]">{ev}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Action Box */}
                  <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-2">
                    <Info className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-indigo-900 block text-[11px] uppercase tracking-wider">Suggested Maintenance Action:</strong>
                      <span className="text-xs font-medium">{rec.suggestedAction}</span>
                    </div>
                  </div>

                  {/* Dismissal Reason display if dismissed */}
                  {rec.status === 'DISMISSED' && rec.dismissalReason && (
                    <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600 text-xs">
                      <strong>Dismissal Reason:</strong> {rec.dismissalReason} (by {rec.dismissedByName || 'Admin'})
                    </div>
                  )}

                  {/* Footer & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2 text-xs">
                    <div className="text-slate-400 text-[11px]">
                      <span>Target: <strong className="text-slate-700">{rec.assetName}</strong> ({rec.assetCode})</span>
                      <span className="mx-2">•</span>
                      <span>Dept: <strong className="text-slate-700">{rec.assignedDepartment || 'General'}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      {rec.status === 'OPEN' && (
                        <button
                          type="button"
                          onClick={() => handleReviewRecommendation(rec._id)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs cursor-pointer"
                        >
                          Mark Reviewed
                        </button>
                      )}

                      {(rec.status === 'OPEN' || rec.status === 'REVIEWED') && (
                        <button
                          type="button"
                          onClick={() => openScheduleFromRec(rec)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          Create Task
                        </button>
                      )}

                      {rec.status === 'TASK_CREATED' && (
                        <button
                          type="button"
                          onClick={() => handleAddressRecommendation(rec._id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Check className="h-3 w-3" />
                          Mark Addressed
                        </button>
                      )}

                      {rec.status !== 'DISMISSED' && rec.status !== 'ADDRESSED' && (
                        <button
                          type="button"
                          onClick={() => openDismissModal(rec)}
                          className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                        >
                          Dismiss...
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: ASSET HEALTH SCOREBOARD */}
      {activeSection === 'health' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-4 border border-slate-200 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Search code, name, room..."
                value={searchHealth}
                onChange={(e) => setSearchHealth(e.target.value)}
                className="glass-input rounded-xl px-3 py-1.5 text-xs w-56"
              />

              <select
                value={healthCategoryFilter}
                onChange={(e) => setHealthCategoryFilter(e.target.value)}
                className="glass-input rounded-xl px-3 py-1.5 text-xs"
              >
                <option value="">All Health Categories</option>
                <option value="Healthy">Healthy (80-100)</option>
                <option value="Needs Attention">Needs Attention (60-79)</option>
                <option value="At Risk">At Risk (40-59)</option>
                <option value="Critical">Critical (0-39)</option>
              </select>
            </div>

            <span className="text-xs text-slate-400 font-semibold">
              Sorted by highest risk (lowest score first)
            </span>
          </div>

          <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Asset Code / Equipment</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Condition & Status</th>
                    <th className="py-3 px-4">Health Score</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4 text-right">Factor Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {healthAssessments.map((h) => (
                    <tr key={h.assetId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-200">
                          {h.assetCode}
                        </span>
                        <h4 className="font-bold text-slate-800 text-xs mt-0.5">{h.assetName}</h4>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">{h.building}</span>
                        <span className="text-[11px] text-slate-400">{h.room}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700 block text-[11px]">{h.condition}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{h.status}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getScoreColor(h.score)}`}>
                            {h.score} / 100
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600">
                            {h.category}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          h.confidence === 'HIGH'
                            ? 'bg-emerald-50 text-emerald-700'
                            : h.confidence === 'MEDIUM'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {h.confidence}
                        </span>
                        {h.hasLimitedData && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">Limited Telemetry</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedHealthDetail(h);
                            setShowHealthModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Explain Score
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: RECURRING FAILURE HOTSPOTS */}
      {activeSection === 'hotspots' && recurringData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Electrical Hotspots */}
            <div className="glass-card rounded-2xl p-5 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-700">
                <Zap className="h-4 w-4" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  Recurring Electrical Failure Hotspots ({recurringData.electricalHotspots.length})
                </h3>
              </div>

              {recurringData.electricalHotspots.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No recurring electrical incidents detected in the last {analysisDays} days.
                </p>
              ) : (
                <div className="space-y-2">
                  {recurringData.electricalHotspots.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {item.building} • {item.room}
                        </span>
                        <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                          {item.incidentCount} incident(s)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Active: <strong className="text-rose-600">{item.activeCount}</strong> • Resolved: {item.resolvedCount}
                      </div>
                      {item.sampleTitles.length > 0 && (
                        <div className="text-[10px] text-slate-400 italic">
                          Recent: "{item.sampleTitles.join('", "')}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Network Hotspots */}
            <div className="glass-card rounded-2xl p-5 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <Wifi className="h-4 w-4" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  Recurring Network Disruption Hotspots ({recurringData.networkHotspots.length})
                </h3>
              </div>

              {recurringData.networkHotspots.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No recurring network issues detected in the last {analysisDays} days.
                </p>
              ) : (
                <div className="space-y-2">
                  {recurringData.networkHotspots.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {item.building} • {item.room}
                        </span>
                        <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-[10px]">
                          {item.incidentCount} outage(s)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Active: <strong className="text-rose-600">{item.activeCount}</strong> • Resolved: {item.resolvedCount}
                      </div>
                      {item.sampleTitles.length > 0 && (
                        <div className="text-[10px] text-slate-400 italic">
                          Recent: "{item.sampleTitles.join('", "')}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Highest Complaint Assets Table */}
          <div className="glass-card rounded-2xl p-5 border border-slate-200 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Assets With Highest Complaint Frequency in Analysis Window
            </h3>

            {recurringData.highestComplaintAssets.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No asset complaints recorded in the past {analysisDays} days.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Asset Code</th>
                      <th className="py-2.5 px-3">Equipment Name</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Complaints in Window</th>
                      <th className="py-2.5 px-3">Active Complaints</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recurringData.highestComplaintAssets.map((ast) => (
                      <tr key={ast.assetId}>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{ast.assetCode}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{ast.assetName}</td>
                        <td className="py-2.5 px-3 text-slate-500">{ast.building} • {ast.room}</td>
                        <td className="py-2.5 px-3">
                          <span className="bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded text-[11px] border border-rose-200">
                            {ast.complaintCountInWindow} tickets
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{ast.activeCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: EXPLAIN HEALTH SCORE BREAKDOWN */}
      {showHealthModal && selectedHealthDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card rounded-2xl border border-slate-200 w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
              <div>
                <h3 className="font-bold text-base text-slate-800 font-outfit">
                  Asset Health Formula Breakdown
                </h3>
                <span className="font-mono text-xs text-blue-600 font-bold">
                  {selectedHealthDetail.assetCode} • {selectedHealthDetail.assetName}
                </span>
              </div>
              <button
                onClick={() => setShowHealthModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Final Computed Score</span>
                  <span className="text-xl font-black text-slate-800 font-outfit">
                    {selectedHealthDetail.score} / 100
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(selectedHealthDetail.score)}`}>
                  {selectedHealthDetail.category}
                </span>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block">
                  Formula Factors & Point Deductions (Base = 100)
                </span>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {selectedHealthDetail.factors.map((f, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-slate-800 block text-xs">{f.factor}</strong>
                        <span className="text-[11px] text-slate-500 leading-snug">{f.description}</span>
                      </div>
                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        f.impact < 0 ? 'bg-rose-50 text-rose-700' : f.impact > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {f.impact > 0 ? `+${f.impact}` : f.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] leading-relaxed">
                <strong>Deterministic Rule-Based Assessment:</strong> Scores are calculated live from real physical condition audits, overdue maintenance tasks, active unresolved tickets, and repair recurrence. Clamped strictly between 0 and 100.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DISMISS RECOMMENDATION MODAL */}
      {showDismissModal && dismissTargetRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
              <h3 className="font-bold text-sm text-slate-800 font-outfit">
                Dismiss Maintenance Recommendation
              </h3>
              <button
                onClick={() => setShowDismissModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitDismissal} className="p-6 space-y-4 text-xs">
              <div>
                <p className="text-slate-600 mb-2 leading-relaxed">
                  Dismissing recommendation <strong>{dismissTargetRec.recommendationCode}</strong> ({dismissTargetRec.title}) requires an authorized justification for compliance and audit logging.
                </p>
                <label className="font-semibold text-slate-700 block mb-1">
                  Reason for Dismissal *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Asset scheduled for full building replacement next month; physical inspection completed by contractor; false alarm verified."
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                  className="w-full glass-input rounded-xl p-3"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDismissModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md cursor-pointer"
                >
                  Confirm Dismissal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SCHEDULE & LINK MAINTENANCE TASK */}
      {showScheduleModal && scheduleTargetRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card rounded-2xl border border-slate-200 w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 font-outfit">Create & Link Maintenance Task</h3>
                  <span className="text-[11px] font-mono text-indigo-600 font-bold">
                    For Recommendation: {scheduleTargetRec.recommendationCode}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitScheduleTask} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Scheduled Date *</label>
                <input
                  type="date"
                  required
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assign Technician / Staff</label>
                <select
                  value={schedStaffId}
                  onChange={(e) => setSchedStaffId(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2"
                >
                  <option value="">Unassigned</option>
                  {staffUsers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.department || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Work Description / Scope *</label>
                <textarea
                  rows={3}
                  required
                  value={schedDesc}
                  onChange={(e) => setSchedDesc(e.target.value)}
                  className="w-full glass-input rounded-xl p-3"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md cursor-pointer"
                >
                  Create & Link Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
