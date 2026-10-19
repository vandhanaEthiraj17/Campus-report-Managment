import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { connectSocket } from '../../services/socket';
import {
  AlertOctagon,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Clock,
  Send,
  UserCheck,
  Search,
  Plus,
  Phone,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ISMSDispatch {
  recipientPhone: string;
  recipientName: string;
  providerMessageId: string;
  status: string;
  dispatchedAt: string;
  deliveredAt?: string;
  errorMessage?: string;
}

interface IEmergencyIncident {
  _id: string;
  incidentCode: string;
  title: string;
  description: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  locationName: string;
  locationPath?: string;
  reportedByName: string;
  reporterPhone?: string;
  isAnonymous: boolean;
  assignedTeam: string;
  status: 'REPORTED' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED' | 'FALSE_ALARM';
  acknowledgedByName?: string;
  acknowledgedAt?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  smsDispatches: ISMSDispatch[];
  timeline: Array<{
    status: string;
    action: string;
    performedByName: string;
    timestamp: string;
    notes?: string;
  }>;
  createdAt: string;
}

interface IRecipient {
  _id: string;
  name: string;
  roleTitle: string;
  phone: string;
  department: string;
  alertCategories: string[];
  isActive: boolean;
}

export const EmergencyDashboardTab: React.FC = () => {
  const [incidents, setIncidents] = useState<IEmergencyIncident[]>([]);
  const [recipients, setRecipients] = useState<IRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'incidents' | 'recipients'>('incidents');

  // Filters
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);

  // Modals
  const [selectedIncident, setSelectedIncident] = useState<IEmergencyIncident | null>(null);
  const [actionType, setActionType] = useState<'acknowledge' | 'assign' | 'resolve' | null>(null);
  const [assignTeamInput, setAssignTeamInput] = useState('Campus Rapid Emergency Response Desk');
  const [resolutionNotesInput, setResolutionNotesInput] = useState('');
  const [isFalseAlarm, setIsFalseAlarm] = useState(false);

  // Recipient Modal
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [newRecName, setNewRecName] = useState('');
  const [newRecRole, setNewRecRole] = useState('');
  const [newRecPhone, setNewRecPhone] = useState('');
  const [newRecDept, setNewRecDept] = useState('');
  const [newRecCategory, setNewRecCategory] = useState('ALL_EMERGENCIES');

  const fetchIncidents = async () => {
    try {
      const res = await api.get('/emergencies', {
        params: {
          severity: filterSeverity || undefined,
          status: filterStatus || undefined,
          search: searchTerm || undefined,
        },
      });
      setIncidents(res.data.incidents || []);
    } catch (err) {
      console.error('Failed to fetch emergency incidents:', err);
    }
  };

  const fetchRecipients = async () => {
    try {
      const res = await api.get('/notifications/recipients');
      setRecipients(res.data.recipients || []);
    } catch (err) {
      console.error('Failed to fetch emergency recipients:', err);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchIncidents(), fetchRecipients()]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    // Attach Socket.IO live real-time listeners
    const socket = connectSocket();

    socket.on('emergency:created', (newIncident: IEmergencyIncident) => {
      setIncidents((prev) => [newIncident, ...prev]);
    });

    socket.on('emergency:acknowledged', (updated: IEmergencyIncident) => {
      setIncidents((prev) => prev.map((inc) => (inc._id === updated._id ? updated : inc)));
    });

    socket.on('emergency:resolved', (updated: IEmergencyIncident) => {
      setIncidents((prev) => prev.map((inc) => (inc._id === updated._id ? updated : inc)));
    });

    socket.on('emergency:updated', (updated: IEmergencyIncident) => {
      setIncidents((prev) => prev.map((inc) => (inc._id === updated._id ? updated : inc)));
    });

    return () => {
      socket.off('emergency:created');
      socket.off('emergency:acknowledged');
      socket.off('emergency:resolved');
      socket.off('emergency:updated');
    };
  }, [filterSeverity, filterStatus, searchTerm]);

  // Actions
  const handleAcknowledge = async (id: string) => {
    try {
      const res = await api.patch(`/emergencies/${id}/acknowledge`);
      setIncidents((prev) => prev.map((i) => (i._id === id ? res.data.incident : i)));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to acknowledge incident.');
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    try {
      const res = await api.patch(`/emergencies/${selectedIncident._id}/assign`, {
        assignedTeam: assignTeamInput,
      });
      setIncidents((prev) => prev.map((i) => (i._id === selectedIncident._id ? res.data.incident : i)));
      setActionType(null);
      setSelectedIncident(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign response team.');
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    if (!resolutionNotesInput.trim()) {
      alert('Resolution notes are mandatory.');
      return;
    }
    try {
      const res = await api.patch(`/emergencies/${selectedIncident._id}/resolve`, {
        resolutionNotes: resolutionNotesInput,
        isFalseAlarm,
      });
      setIncidents((prev) => prev.map((i) => (i._id === selectedIncident._id ? res.data.incident : i)));
      setActionType(null);
      setSelectedIncident(null);
      setResolutionNotesInput('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resolve incident.');
    }
  };

  const handleCreateRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/notifications/recipients', {
        name: newRecName,
        roleTitle: newRecRole,
        phone: newRecPhone,
        department: newRecDept,
        alertCategories: [newRecCategory],
      });
      setRecipients((prev) => [...prev, res.data.recipient]);
      setShowRecipientModal(false);
      setNewRecName('');
      setNewRecRole('');
      setNewRecPhone('');
      setNewRecDept('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create recipient.');
    }
  };

  const handleDeleteRecipient = async (id: string) => {
    if (!window.confirm('Remove this emergency contact?')) return;
    try {
      await api.delete(`/notifications/recipients/${id}`);
      setRecipients((prev) => prev.filter((r) => r._id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete recipient.');
    }
  };

  // Metrics
  const criticalCount = incidents.filter((i) => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length;
  const activeCount = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'FALSE_ALARM').length;
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED').length;

  const totalSmsSent = incidents.reduce((acc, i) => acc + (i.smsDispatches?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. Command Banner */}
      <div className="glass-card rounded-2xl p-6 border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-amber-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/30">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 font-outfit">Campus Emergency & Rapid Response Center</h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">
              ● Live WebSocket Dispatch Active
            </span>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl font-medium">
            Real-time emergency monitoring, priority triage, instant Twilio cellular SMS alerts to coordinators, and security response tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === 'incidents' ? 'recipients' : 'incidents')}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-300 flex items-center gap-2 shadow-xs cursor-pointer transition-all"
          >
            <Phone className="h-3.5 w-3.5 text-blue-600" />
            <span>{activeTab === 'incidents' ? 'Emergency Alert Contacts' : 'Back to Incident Feed'}</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 cursor-pointer shadow-xs"
            title="Refresh feed"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Key Metrics KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-rose-200 bg-rose-50/50 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 block">Critical Alarms</span>
            <span className="text-2xl font-bold font-outfit text-rose-900">{criticalCount}</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-amber-200 bg-amber-50/50 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <AlertOctagon className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 block">Active Incidents</span>
            <span className="text-2xl font-bold font-outfit text-amber-900">{activeCount}</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-emerald-200 bg-emerald-50/50 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">Resolved Cases</span>
            <span className="text-2xl font-bold font-outfit text-emerald-900">{resolvedCount}</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-blue-200 bg-blue-50/50 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 block">SMS Alerts Logged</span>
            <span className="text-2xl font-bold font-outfit text-blue-900">{totalSmsSent}</span>
          </div>
        </div>
      </div>

      {activeTab === 'incidents' ? (
        <>
          {/* 3. Search & Filter Strip */}
          <div className="glass-card rounded-xl p-4 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search emergency by code, title, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white border border-slate-200 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-700 focus:outline-hidden"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical Severity</option>
                <option value="HIGH">High Severity</option>
                <option value="MEDIUM">Medium Severity</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-700 focus:outline-hidden"
              >
                <option value="">All Statuses</option>
                <option value="REPORTED">Reported (Pending)</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="RESOLVED">Resolved</option>
                <option value="FALSE_ALARM">False Alarm</option>
              </select>
            </div>
          </div>

          {/* 4. Incidents List */}
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 font-medium text-xs">
              Loading campus emergency logs...
            </div>
          ) : incidents.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-slate-200 space-y-2">
              <ShieldAlert className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Active Emergency Alarms</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No emergencies matching current filters. All campus sectors are currently operating safely.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((inc) => {
                const isExpanded = expandedIncidentId === inc._id;
                const isCritical = inc.severity === 'CRITICAL';
                const isResolved = inc.status === 'RESOLVED';

                return (
                  <div
                    key={inc._id}
                    className={`glass-card rounded-2xl border transition-all ${
                      isCritical && !isResolved
                        ? 'border-rose-300 bg-rose-50/30 shadow-md shadow-rose-500/10'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white">
                            {inc.incidentCode}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                              inc.severity === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : inc.severity === 'HIGH'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}
                          >
                            {inc.severity === 'CRITICAL' && <Flame className="h-3 w-3" />}
                            {inc.severity} SEVERITY
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              inc.status === 'REPORTED'
                                ? 'bg-rose-600 text-white'
                                : inc.status === 'ACKNOWLEDGED'
                                ? 'bg-amber-500 text-white'
                                : inc.status === 'DISPATCHED'
                                ? 'bg-blue-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {inc.status}
                          </span>
                          {inc.isAnonymous && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full border border-slate-300">
                              🔒 Anonymous Reporter
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 font-outfit">{inc.title}</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">{inc.description}</p>

                        <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 flex-wrap">
                          <span className="font-semibold text-slate-700">📍 {inc.locationPath || inc.locationName}</span>
                          <span>•</span>
                          <span>Category: <strong>{inc.category}</strong></span>
                          <span>•</span>
                          <span>Reported: {new Date(inc.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Action Control Panel */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full md:w-auto">
                        {inc.status === 'REPORTED' && (
                          <button
                            onClick={() => handleAcknowledge(inc._id)}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Acknowledge</span>
                          </button>
                        )}

                        {inc.status !== 'RESOLVED' && inc.status !== 'FALSE_ALARM' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedIncident(inc);
                                setActionType('assign');
                              }}
                              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                              <span>Assign Team</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedIncident(inc);
                                setActionType('resolve');
                              }}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Resolve</span>
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setExpandedIncidentId(isExpanded ? null : inc._id)}
                          className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Details' : 'Audit Logs'}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* 5. Expanded SMS Dispatch & Timeline Audit Drawer */}
                    {isExpanded && (
                      <div className="border-t border-slate-200/80 p-5 bg-slate-50/70 rounded-b-2xl space-y-4 text-xs">
                        {/* SMS Dispatch Verification Table */}
                        <div>
                          <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                            <Send className="h-3.5 w-3.5 text-blue-600" />
                            Twilio Cellular SMS Dispatch Verification ({inc.smsDispatches?.length || 0} Recipients)
                          </h4>
                          {(!inc.smsDispatches || inc.smsDispatches.length === 0) ? (
                            <p className="text-slate-400 italic">No SMS dispatches recorded.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {inc.smsDispatches.map((sms, sIdx) => (
                                <div key={sIdx} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <div className="font-semibold text-slate-800">{sms.recipientName}</div>
                                    <div className="font-mono text-[11px] text-slate-500">{sms.recipientPhone}</div>
                                    <div className="font-mono text-[10px] text-slate-400">Ref: {sms.providerMessageId}</div>
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      sms.status === 'DELIVERED'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : sms.status === 'SENT'
                                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                        : sms.status === 'SIMULATED_DEV'
                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}
                                  >
                                    {sms.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Audit Timeline */}
                        <div>
                          <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-500" />
                            Incident Audit Timeline
                          </h4>
                          <div className="space-y-1.5">
                            {inc.timeline?.map((evt, eIdx) => (
                              <div key={eIdx} className="flex items-start gap-2 text-slate-600">
                                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                                  {new Date(evt.timestamp).toLocaleTimeString()}
                                </span>
                                <span>
                                  <strong>{evt.performedByName}:</strong> {evt.action}
                                  {evt.notes && <span className="text-slate-500 italic"> — "{evt.notes}"</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {inc.resolutionNotes && (
                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                            <strong>Final Resolution Record:</strong> {inc.resolutionNotes} (Closed by {inc.resolvedByName})
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Recipient Directory Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Emergency SMS Recipients & Security Taskforce</h3>
              <p className="text-xs text-slate-500">Authorized personnel who immediately receive cellular alerts upon incident reporting.</p>
            </div>
            <button
              onClick={() => setShowRecipientModal(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Recipient</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipients.map((rec) => (
              <div key={rec._id} className="glass-card rounded-2xl p-4 border border-slate-200 bg-white space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{rec.name}</h4>
                    <span className="text-xs text-blue-700 font-medium">{rec.roleTitle}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteRecipient(rec._id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Remove recipient"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>📞 Phone: <span className="font-mono font-semibold">{rec.phone}</span></div>
                  <div>🏢 Dept: <strong>{rec.department}</strong></div>
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {rec.alertCategories?.map((c, cIdx) => (
                      <span key={cIdx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign Team Modal */}
      {actionType === 'assign' && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-900 text-base font-outfit">Assign Response Taskforce</h3>
            <p className="text-xs text-slate-500">Incident: <strong>{selectedIncident.incidentCode}</strong> — {selectedIncident.title}</p>
            <form onSubmit={handleAssignSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Designated Response Team</label>
                <select
                  value={assignTeamInput}
                  onChange={(e) => setAssignTeamInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800"
                >
                  <option value="Campus Rapid Emergency Response Desk">Campus Rapid Emergency Response Desk</option>
                  <option value="Women Safety Cell & Security Taskforce">Women Safety Cell & Security Taskforce</option>
                  <option value="Campus Medical & First Aid Squad">Campus Medical & First Aid Squad</option>
                  <option value="Electrical & Fire Hazard Unit">Electrical & Fire Hazard Unit</option>
                  <option value="Estate & Transport Emergency Team">Estate & Transport Emergency Team</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  Confirm & Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Incident Modal */}
      {actionType === 'resolve' && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-900 text-base font-outfit">Resolve Emergency Incident</h3>
            <p className="text-xs text-slate-500">Provide official closure notes for audit and compliance.</p>
            <form onSubmit={handleResolveSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mandatory Resolution Notes</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain actions taken on site, security check outcome, or medical assistance rendered..."
                  value={resolutionNotesInput}
                  onChange={(e) => setResolutionNotesInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFalseAlarm}
                  onChange={(e) => setIsFalseAlarm(e.target.checked)}
                  className="rounded text-rose-600"
                />
                <span>Flag this incident as a False Alarm</span>
              </label>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  Mark Resolved
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Recipient Modal */}
      {showRecipientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-900 text-base font-outfit">Add Emergency Alert Contact</h3>
            <form onSubmit={handleCreateRecipient} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. K. Meenakshi"
                  value={newRecName}
                  onChange={(e) => setNewRecName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Role / Position Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Women Safety Coordinator / HOD"
                  value={newRecRole}
                  onChange={(e) => setNewRecRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Phone (for Twilio SMS)</label>
                <input
                  type="text"
                  required
                  placeholder="+91 99529112177"
                  value={newRecPhone}
                  onChange={(e) => setNewRecPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Department</label>
                <input
                  type="text"
                  required
                  placeholder="Security & Women Safety Cell"
                  value={newRecDept}
                  onChange={(e) => setNewRecDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Alert Scope</label>
                <select
                  value={newRecCategory}
                  onChange={(e) => setNewRecCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200"
                >
                  <option value="ALL_EMERGENCIES">All Campus Emergencies</option>
                  <option value="WOMEN_SAFETY">Women Safety & Harassment Alerts Only</option>
                  <option value="FIRE_HAZARD">Fire & Electrical Hazards Only</option>
                  <option value="TRANSPORT">Transport & Bus Accidents Only</option>
                  <option value="HOSTEL">Hostel Emergencies Only</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecipientModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  Save Recipient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
