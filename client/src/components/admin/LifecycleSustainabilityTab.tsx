import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type {
  IMaintenanceCostAnalytics,
  ILifecycleAssessmentItem,
  ISustainabilityMetrics
} from '../../types/index';
import {
  DollarSign, TrendingUp, AlertTriangle, ShieldCheck,
  RefreshCw, FileText, Download, Building, Layers,
  Wrench, CheckCircle2,
  ExternalLink, BarChart3, AlertCircle
} from 'lucide-react';

export const LifecycleSustainabilityTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'costs' | 'repair_vs_replace' | 'sustainability' | 'exports'>('costs');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<'30' | '90' | '365' | 'all'>('all');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Data states
  const [costAnalytics, setCostAnalytics] = useState<IMaintenanceCostAnalytics | null>(null);
  const [lifecycleAssessments, setLifecycleAssessments] = useState<{
    flaggedAssets: ILifecycleAssessmentItem[];
    missingDataAssets: { assetId: string; assetCode: string; assetName: string; missingFields: string[] }[];
    summary: {
      totalEvaluated: number;
      highMaintenanceBurdenCount: number;
      endOfLifeExceededCount: number;
      recurringCorrectiveCount: number;
      warrantyOpportunitiesCount: number;
    };
  } | null>(null);
  const [sustainabilityMetrics, setSustainabilityMetrics] = useState<ISustainabilityMetrics | null>(null);

  // Selected asset detail modal
  const [selectedAssessment, setSelectedAssessment] = useState<ILifecycleAssessmentItem | null>(null);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let startDate: string | undefined;
      const now = new Date();
      if (dateFilter === '30') {
        startDate = new Date(now.getTime() - 30 * 86400000).toISOString();
      } else if (dateFilter === '90') {
        startDate = new Date(now.getTime() - 90 * 86400000).toISOString();
      } else if (dateFilter === '365') {
        startDate = new Date(now.getTime() - 365 * 86400000).toISOString();
      }

      const costParams: any = {};
      if (startDate) costParams.startDate = startDate;
      if (buildingFilter) costParams.building = buildingFilter;
      if (categoryFilter) costParams.category = categoryFilter;

      const [costRes, lifeRes, sustRes] = await Promise.all([
        api.get('/sustainability/cost-analytics', { params: costParams }),
        api.get('/sustainability/lifecycle-assessments'),
        api.get('/sustainability/overview'),
      ]);

      setCostAnalytics(costRes.data);
      setLifecycleAssessments(lifeRes.data);
      setSustainabilityMetrics(sustRes.data);
    } catch (err) {
      console.error('Failed to load lifecycle & sustainability data', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFilter, buildingFilter, categoryFilter]);

  const handleDownloadCsv = async (reportType: string, filenameLabel: string) => {
    try {
      setDownloadingReport(reportType);
      const res = await api.get(`/sustainability/export/${reportType}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filenameLabel}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to download CSV report.');
    } finally {
      setDownloadingReport(null);
    }
  };

  const formatCurrency = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '$0.00';
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight font-outfit">
              Lifecycle & Sustainability Analytics
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Database-driven maintenance expenditure analytics, equipment repair vs replacement assessment, and preventive resource efficiency.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchData();
            }}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-50 transition cursor-pointer shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Analytics
          </button>
        </div>
      </div>

      {/* 2. Top-Level Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="glass-card rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Recorded Cost</span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-xl font-black text-slate-800 font-outfit">
              {formatCurrency(costAnalytics?.totalRecordedExpenditure)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Excludes cancelled tasks</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Preventive Cost</span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-xl font-black text-emerald-700 font-outfit">
              {formatCurrency(costAnalytics?.costByMaintenanceType?.PREVENTIVE)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Routine maintenance budget</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Corrective Cost</span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-xl font-black text-amber-700 font-outfit">
              {formatCurrency(
                (costAnalytics?.costByMaintenanceType?.CORRECTIVE || 0) +
                (costAnalytics?.costByMaintenanceType?.EMERGENCY || 0)
              )}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Reactive repairs & emergencies</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Cost / Task</span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-xl font-black text-blue-700 font-outfit">
              {formatCurrency(costAnalytics?.averageCostPerTask)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Across {costAnalytics?.completedTasksCount || 0} completed tasks
          </span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Flagged for Review</span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-xl font-black text-rose-700 font-outfit">
              {lifecycleAssessments?.flaggedAssets?.length || 0}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">High burden or end-of-life</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Preventive Compliance</span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-xl font-black text-indigo-700 font-outfit">
              {sustainabilityMetrics?.preventiveCompletionRate !== undefined
                ? `${sustainabilityMetrics.preventiveCompletionRate}%`
                : '100%'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">On-time servicing rate</span>
        </div>
      </div>

      {/* 3. Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('costs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'costs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" />
          Cost Analytics
        </button>

        <button
          onClick={() => setActiveSubTab('repair_vs_replace')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'repair_vs_replace'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          Repair vs Replacement
          {lifecycleAssessments?.flaggedAssets?.length ? (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-mono">
              {lifecycleAssessments.flaggedAssets.length}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveSubTab('sustainability')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'sustainability'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Sustainability & Resource Efficiency
        </button>

        <button
          onClick={() => setActiveSubTab('exports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'exports'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Download className="h-3.5 w-3.5" />
          Report Exports
        </button>
      </div>

      {isLoading ? (
        <div className="glass-card rounded-2xl p-16 text-center text-slate-400 border border-slate-200">
          <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading database analytics and lifecycle records...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: COST ANALYTICS */}
          {activeSubTab === 'costs' && (
            <div className="space-y-6">
              {/* Filter controls */}
              <div className="glass-card rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-500">Timeframe:</span>
                  {(['30', '90', '365', 'all'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setDateFilter(t)}
                      className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition ${
                        dateFilter === t
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t === '30' ? 'Last 30 Days' : t === '90' ? 'Last 90 Days' : t === '365' ? 'Last 12 Months' : 'All Time'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    placeholder="Filter by building..."
                    value={buildingFilter}
                    onChange={(e) => setBuildingFilter(e.target.value)}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Filter by category..."
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Cost Breakdown & Monthly Trends */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cost by Maintenance Type */}
                <div className="glass-card rounded-2xl p-5 border border-slate-200 space-y-4">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-600" />
                    Expenditure by Maintenance Type
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1 font-semibold text-slate-700">
                        <span>Preventive Maintenance</span>
                        <span className="font-mono text-emerald-700">
                          {formatCurrency(costAnalytics?.costByMaintenanceType?.PREVENTIVE)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: `${
                              (costAnalytics?.totalRecordedExpenditure || 0) > 0
                                ? ((costAnalytics?.costByMaintenanceType?.PREVENTIVE || 0) / (costAnalytics?.totalRecordedExpenditure || 1)) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1 font-semibold text-slate-700">
                        <span>Corrective Repairs</span>
                        <span className="font-mono text-amber-700">
                          {formatCurrency(costAnalytics?.costByMaintenanceType?.CORRECTIVE)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{
                            width: `${
                              (costAnalytics?.totalRecordedExpenditure || 0) > 0
                                ? ((costAnalytics?.costByMaintenanceType?.CORRECTIVE || 0) / (costAnalytics?.totalRecordedExpenditure || 1)) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1 font-semibold text-slate-700">
                        <span>Emergency Interventions</span>
                        <span className="font-mono text-rose-700">
                          {formatCurrency(costAnalytics?.costByMaintenanceType?.EMERGENCY)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{
                            width: `${
                              (costAnalytics?.totalRecordedExpenditure || 0) > 0
                                ? ((costAnalytics?.costByMaintenanceType?.EMERGENCY || 0) / (costAnalytics?.totalRecordedExpenditure || 1)) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1 font-semibold text-slate-700">
                        <span>Routine Inspection</span>
                        <span className="font-mono text-blue-700">
                          {formatCurrency(costAnalytics?.costByMaintenanceType?.INSPECTION)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${
                              (costAnalytics?.totalRecordedExpenditure || 0) > 0
                                ? ((costAnalytics?.costByMaintenanceType?.INSPECTION || 0) / (costAnalytics?.totalRecordedExpenditure || 1)) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-xs space-y-1">
                    <span className="font-bold text-slate-500 block">Expense Breakdown:</span>
                    <div className="flex justify-between text-slate-600">
                      <span>Labour Cost:</span>
                      <strong className="font-mono">{formatCurrency(costAnalytics?.expenditureBreakdown?.labour)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Spare Parts:</span>
                      <strong className="font-mono">{formatCurrency(costAnalytics?.expenditureBreakdown?.parts)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Other Expenses:</span>
                      <strong className="font-mono">{formatCurrency(costAnalytics?.expenditureBreakdown?.other)}</strong>
                    </div>
                  </div>
                </div>

                {/* Monthly Trend Bars */}
                <div className="glass-card rounded-2xl p-5 border border-slate-200 lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      Monthly Maintenance Expenditure Trend (Past 6 Months)
                    </h3>
                    <span className="text-[11px] text-slate-400">Actual MongoDB Records</span>
                  </div>

                  <div className="grid grid-cols-6 gap-2 pt-4 h-48 items-end">
                    {costAnalytics?.monthlyExpenditureTrends?.map((item) => {
                      const maxCost = Math.max(
                        ...costAnalytics.monthlyExpenditureTrends.map((m) => m.totalCost),
                        100
                      );
                      const heightPercent = Math.min(100, Math.max(10, (item.totalCost / maxCost) * 100));

                      return (
                        <div key={item.month} className="flex flex-col items-center gap-1.5 h-full justify-end">
                          <span className="font-mono text-[10px] font-bold text-slate-700">
                            {formatCurrency(item.totalCost)}
                          </span>
                          <div
                            className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-t-lg transition-all relative group cursor-pointer"
                            style={{ height: `${heightPercent}%` }}
                          >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-[10px] p-2 rounded shadow-lg whitespace-nowrap z-10">
                              <div>Tasks: {item.taskCount}</div>
                              <div>Prev: {formatCurrency(item.preventiveCost)}</div>
                              <div>Corr: {formatCurrency(item.correctiveCost)}</div>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-500 font-semibold">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Top Cost Assets & Repeated Repairs Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Cost Assets */}
                <div className="glass-card rounded-2xl p-5 border border-slate-200 space-y-3">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-rose-600" />
                    Top Assets by Recorded Maintenance Cost
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 text-[11px]">
                          <th className="pb-2">Asset Code</th>
                          <th className="pb-2">Name & Location</th>
                          <th className="pb-2 text-right">Maint. Cost</th>
                          <th className="pb-2 text-right">Acquisition</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {costAnalytics?.topCostAssets?.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-slate-400">
                              No maintenance expenses recorded yet.
                            </td>
                          </tr>
                        ) : (
                          costAnalytics?.topCostAssets?.map((a) => (
                            <tr key={a.assetId} className="hover:bg-slate-50/50">
                              <td className="py-2.5 font-mono font-bold text-indigo-700">{a.assetCode}</td>
                              <td className="py-2.5">
                                <div className="font-bold text-slate-800">{a.assetName}</div>
                                <div className="text-[10px] text-slate-400">{a.building} • {a.room}</div>
                              </td>
                              <td className="py-2.5 text-right font-mono font-black text-rose-700">
                                {formatCurrency(a.totalCost)}
                              </td>
                              <td className="py-2.5 text-right font-mono text-slate-500">
                                {a.purchaseCost ? formatCurrency(a.purchaseCost) : 'N/A'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Repeatedly Repaired Equipment */}
                <div className="glass-card rounded-2xl p-5 border border-slate-200 space-y-3">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-amber-600" />
                    Repeatedly Repaired Equipment (Chronic Failures)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 text-[11px]">
                          <th className="pb-2">Asset</th>
                          <th className="pb-2">Repairs</th>
                          <th className="pb-2 text-right">Total Spent</th>
                          <th className="pb-2 text-right">Condition</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {costAnalytics?.repeatedRepairedAssets?.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-slate-400">
                              No chronic failure assets identified.
                            </td>
                          </tr>
                        ) : (
                          costAnalytics?.repeatedRepairedAssets?.map((a) => (
                            <tr key={a.assetId} className="hover:bg-slate-50/50">
                              <td className="py-2.5">
                                <div className="font-bold text-slate-800">{a.assetName}</div>
                                <div className="font-mono text-[10px] text-indigo-600">{a.assetCode}</div>
                              </td>
                              <td className="py-2.5 font-bold text-amber-700">
                                {a.repairCount} corrective repairs
                              </td>
                              <td className="py-2.5 text-right font-mono font-black text-slate-800">
                                {formatCurrency(a.totalCost)}
                              </td>
                              <td className="py-2.5 text-right font-bold text-xs">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                  a.condition === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {a.condition}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REPAIR VS REPLACEMENT ASSESSMENTS */}
          {activeSubTab === 'repair_vs_replace' && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-5 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">Equipment Flagged for Administrative Lifecycle Review</h3>
                    <p className="text-xs text-slate-500">
                      Rule-based evaluations comparing recorded repair expenditures, operational age, useful lifespan, and warranty coverage.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-[11px]">
                        <th className="pb-2">Asset Code</th>
                        <th className="pb-2">Asset Name</th>
                        <th className="pb-2">Location</th>
                        <th className="pb-2">Condition</th>
                        <th className="pb-2">Evaluation Flag</th>
                        <th className="pb-2 text-right">Burden Ratio</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lifecycleAssessments?.flaggedAssets?.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                            No assets currently breach replacement burden or end-of-life thresholds.
                          </td>
                        </tr>
                      ) : (
                        lifecycleAssessments?.flaggedAssets?.map((item) => (
                          <tr key={item.assetId} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 font-mono font-bold text-indigo-700">{item.assetCode}</td>
                            <td className="py-3 font-bold text-slate-800">{item.assetName}</td>
                            <td className="py-3 text-slate-500">{item.building} • {item.room}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.condition === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {item.condition} ({item.healthScore}/100)
                              </span>
                            </td>
                            <td className="py-3">
                              <span className="font-semibold text-[11px] text-slate-700 block">
                                {item.title}
                              </span>
                            </td>
                            <td className="py-3 text-right font-mono font-bold">
                              {item.costRatioPercent !== null ? (
                                <span className={item.costRatioPercent >= 75 ? 'text-rose-700' : 'text-amber-700'}>
                                  {item.costRatioPercent}%
                                </span>
                              ) : (
                                <span className="text-slate-400">N/A</span>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => setSelectedAssessment(item)}
                                className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                              >
                                Review
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Missing Lifecycle Telemetry Alert Table */}
              <div className="glass-card rounded-2xl p-5 border border-slate-200">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  Assets Requiring Lifecycle Data Completion
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  To enable automated financial replacement calculations, ensure purchase prices and acquisition dates are recorded.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-[11px]">
                        <th className="pb-2">Asset Code</th>
                        <th className="pb-2">Asset Name</th>
                        <th className="pb-2">Missing Fields</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lifecycleAssessments?.missingDataAssets?.slice(0, 5).map((m) => (
                        <tr key={m.assetId}>
                          <td className="py-2 font-mono font-bold text-indigo-700">{m.assetCode}</td>
                          <td className="py-2 text-slate-800 font-medium">{m.assetName}</td>
                          <td className="py-2">
                            <div className="flex gap-1 flex-wrap">
                              {m.missingFields.map((f) => (
                                <span key={f} className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                  {f}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SUSTAINABILITY & RESOURCE EFFICIENCY */}
          {activeSubTab === 'sustainability' && (
            <div className="space-y-6">
              {/* Transparency Notice */}
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs text-blue-950 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-blue-900 mb-0.5">Physical Telemetry Notice</h4>
                  <p className="leading-relaxed">
                    {sustainabilityMetrics?.resourceEfficiencyNotes}
                  </p>
                </div>
              </div>

              {/* Sustainability Indicators Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card rounded-2xl p-5 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Preventive Compliance</span>
                  <div className="text-3xl font-black text-emerald-700 font-outfit">
                    {sustainabilityMetrics?.preventiveCompletionRate}%
                  </div>
                  <p className="text-xs text-slate-500">
                    Ratio of completed preventive maintenance vs total scheduled preventive tasks. High compliance directly extends equipment longevity.
                  </p>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Preventive : Corrective Ratio</span>
                  <div className="text-3xl font-black text-indigo-700 font-outfit">
                    {sustainabilityMetrics?.preventiveToCorrectiveRatio} : 1
                  </div>
                  <p className="text-xs text-slate-500">
                    Proactive tasks conducted per reactive repair. Target ratio &gt; 3.0 indicates sustainable operational stability.
                  </p>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Chronic Failure Frequency</span>
                  <div className="text-3xl font-black text-amber-700 font-outfit">
                    {sustainabilityMetrics?.repeatedRepairFrequencyRate}%
                  </div>
                  <p className="text-xs text-slate-500">
                    Percentage of campus equipment requiring repeated corrective interventions within the active maintenance window.
                  </p>
                </div>
              </div>

              {/* Department Workload & Maintenance Backlog */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card rounded-2xl p-5 border border-slate-200 space-y-3">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <Building className="h-4 w-4 text-indigo-600" />
                    Maintenance Backlog by Building
                  </h3>
                  <div className="space-y-2">
                    {sustainabilityMetrics?.maintenanceBacklogByBuilding?.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Zero overdue maintenance backlog across campus buildings.</p>
                    ) : (
                      sustainabilityMetrics?.maintenanceBacklogByBuilding?.map((b) => (
                        <div key={b.building} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50">
                          <span className="font-bold text-slate-700">{b.building}</span>
                          <span className="font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                            {b.overdueTasksCount} overdue tasks
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-slate-200 space-y-3">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    Department Workload & Expenditure
                  </h3>
                  <div className="space-y-2">
                    {sustainabilityMetrics?.workloadByDepartment?.map((d) => (
                      <div key={d.department} className="text-xs p-2.5 rounded-xl bg-slate-50 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800">{d.department}</div>
                          <div className="text-[10px] text-slate-400">
                            Completed: {d.completedTasksCount} • Pending: {d.pendingTasksCount}
                          </div>
                        </div>
                        <div className="text-right font-mono font-black text-slate-700">
                          {formatCurrency(d.totalCost)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECURE REPORT EXPORTS */}
          {activeSubTab === 'exports' && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-5 border border-slate-200 space-y-2">
                <h3 className="font-bold text-sm text-slate-800">Secure Administrative Report Exports</h3>
                <p className="text-xs text-slate-500">
                  Export complete persisted database records for institutional compliance, financial auditing, and equipment replacement planning.
                  All CSV outputs include formula injection protection (CWE-1236) and strict student identity masking.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card rounded-2xl p-5 border border-slate-200 flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      Maintenance Expenditure Report
                    </h4>
                    <p className="text-xs text-slate-500">
                      Complete log of maintenance records, labour costs, spare parts, other expenses, technician assignments, and dates.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadCsv('expenditure', 'smartcampus_maintenance_expenditure')}
                    disabled={downloadingReport === 'expenditure'}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer transition flex items-center gap-1.5"
                  >
                    {downloadingReport === 'expenditure' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Export CSV
                  </button>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-slate-200 flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      Asset Lifecycle & Equipment Cost Report
                    </h4>
                    <p className="text-xs text-slate-500">
                      Inventory report with acquisition dates, operational age, useful lifespan, total maintenance costs, and burden ratios.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadCsv('lifecycle', 'smartcampus_asset_lifecycle')}
                    disabled={downloadingReport === 'lifecycle'}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer transition flex items-center gap-1.5"
                  >
                    {downloadingReport === 'lifecycle' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Export CSV
                  </button>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-slate-200 flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-amber-600" />
                      Preventive Compliance Report
                    </h4>
                    <p className="text-xs text-slate-500">
                      Audit report detailing preventive maintenance compliance rates and overdue backlogs across departments.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadCsv('compliance', 'smartcampus_preventive_compliance')}
                    disabled={downloadingReport === 'compliance'}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer transition flex items-center gap-1.5"
                  >
                    {downloadingReport === 'compliance' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Export CSV
                  </button>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-slate-200 flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-rose-600" />
                      Repair vs Replacement Review Report
                    </h4>
                    <p className="text-xs text-slate-500">
                      Executive review sheet for assets flagged with high maintenance burdens, chronic breakdowns, or expired lifespans.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadCsv('repair-vs-replace', 'smartcampus_repair_vs_replace')}
                    disabled={downloadingReport === 'repair-vs-replace'}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer transition flex items-center gap-1.5"
                  >
                    {downloadingReport === 'repair-vs-replace' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Assessment Modal */}
      {selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card rounded-3xl border border-slate-200 w-full max-w-xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {selectedAssessment.assetCode}
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-1">{selectedAssessment.assetName}</h3>
                <span className="text-xs text-slate-500">{selectedAssessment.building} • {selectedAssessment.room}</span>
              </div>
              <button
                onClick={() => setSelectedAssessment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-500 block uppercase text-[10px]">Evaluation Finding</span>
                <p className="text-slate-800 font-semibold">{selectedAssessment.title}</p>
                <p className="text-slate-600">{selectedAssessment.reason}</p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Supporting Database Facts:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                  {selectedAssessment.evidence.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>

              {selectedAssessment.missingDataNotes.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                  <span className="font-bold block uppercase text-[10px] text-amber-900 mb-0.5">Missing Information:</span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {selectedAssessment.missingDataNotes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950">
                <span className="font-bold block uppercase text-[10px] text-indigo-900 mb-0.5">Recommended Administrative Action:</span>
                <p>{selectedAssessment.recommendedAction}</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedAssessment(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer hover:bg-slate-800 transition"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
