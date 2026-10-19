import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  MapPin, Plus, RefreshCw, Search, Filter, AlertTriangle,
  CheckCircle2, XCircle, Trash2, Edit2, ShieldAlert,
  Layers, X
} from 'lucide-react';

interface CampusLocation {
  _id: string;
  name: string;
  code: string;
  locationType: string;
  zone?: string;
  buildingName?: string;
  floor?: string;
  roomNumber?: string;
  parentLocation?: {
    _id: string;
    name: string;
    code: string;
  };
  fullPath?: string;
  isActive: boolean;
  metadata?: {
    capacity?: number;
    supervisor?: string;
    contactPhone?: string;
    criticalInfrastructure?: boolean;
    operationalHours?: string;
    notes?: string;
  };
}

const LOCATION_CATEGORIES = [
  { value: 'MAIN_GATE_SECURITY', label: 'Main Gate & Security Checkpoints' },
  { value: 'ACADEMIC_BLOCK', label: 'Academic Blocks & Classrooms' },
  { value: 'LABORATORY', label: 'Laboratories & Research Facilities' },
  { value: 'FACULTY_ADMIN_OFFICE', label: 'Faculty & Admin Offices' },
  { value: 'HOSTEL_RESIDENTIAL', label: 'Hostels & Residential Blocks' },
  { value: 'CANTEEN_CAFETERIA', label: 'Canteens & Food Courts' },
  { value: 'LIBRARY_AUDITORIUM', label: 'Library & Auditoriums' },
  { value: 'PARKING', label: 'Car & Two-Wheeler Parking' },
  { value: 'TRANSPORT_BUS', label: 'College Buses & Transport' },
  { value: 'ROAD_PATHWAY', label: 'Roads, Pathways & Crossings' },
  { value: 'SPORTS_GROUND', label: 'Grounds & Sports Facilities' },
  { value: 'TOILET_WATER', label: 'Toilets & Drinking Water' },
  { value: 'GARDEN_OUTDOOR', label: 'Gardens & Landscaping' },
  { value: 'UTILITY_ELECTRICAL', label: 'Electrical & Utility Rooms' },
  { value: 'OTHER_FACILITY', label: 'Other Campus Facilities' },
];

export const CampusLocationManagementTab: React.FC = () => {
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterActive, setFilterActive] = useState('ALL');
  const [stats, setStats] = useState({ totalLocations: 0, byType: [] as any[] });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingLoc, setEditingLoc] = useState<CampusLocation | null>(null);
  const [activeComplaintsModal, setActiveComplaintsModal] = useState<{
    open: boolean;
    location: CampusLocation | null;
    complaints: any[];
    loading: boolean;
  }>({ open: false, location: null, complaints: [], loading: false });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    locationType: 'ACADEMIC_BLOCK',
    zone: '',
    buildingName: '',
    floor: '',
    roomNumber: '',
    parentLocation: '',
    isActive: true,
    capacity: '',
    supervisor: '',
    contactPhone: '',
    criticalInfrastructure: false,
    operationalHours: '',
    notes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/locations?limit=200');
      if (res.data.success) {
        setLocations(res.data.data.locations || []);
      }
      const statsRes = await api.get('/locations/stats/overview');
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load locations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const openCreateModal = () => {
    setEditingLoc(null);
    setFormData({
      name: '',
      code: '',
      locationType: 'ACADEMIC_BLOCK',
      zone: '',
      buildingName: '',
      floor: '',
      roomNumber: '',
      parentLocation: '',
      isActive: true,
      capacity: '',
      supervisor: '',
      contactPhone: '',
      criticalInfrastructure: false,
      operationalHours: '',
      notes: '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (loc: CampusLocation) => {
    setEditingLoc(loc);
    setFormData({
      name: loc.name,
      code: loc.code,
      locationType: loc.locationType,
      zone: loc.zone || '',
      buildingName: loc.buildingName || '',
      floor: loc.floor || '',
      roomNumber: loc.roomNumber || '',
      parentLocation: loc.parentLocation?._id || '',
      isActive: loc.isActive,
      capacity: loc.metadata?.capacity ? String(loc.metadata.capacity) : '',
      supervisor: loc.metadata?.supervisor || '',
      contactPhone: loc.metadata?.contactPhone || '',
      criticalInfrastructure: loc.metadata?.criticalInfrastructure || false,
      operationalHours: loc.metadata?.operationalHours || '',
      notes: loc.metadata?.notes || '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload: any = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      locationType: formData.locationType,
      zone: formData.zone.trim() || undefined,
      buildingName: formData.buildingName.trim() || undefined,
      floor: formData.floor.trim() || undefined,
      roomNumber: formData.roomNumber.trim() || undefined,
      parentLocation: formData.parentLocation || undefined,
      isActive: formData.isActive,
      metadata: {
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : undefined,
        supervisor: formData.supervisor.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
        criticalInfrastructure: formData.criticalInfrastructure,
        operationalHours: formData.operationalHours.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      },
    };

    try {
      if (editingLoc) {
        const res = await api.put(`/locations/${editingLoc._id}`, payload);
        if (res.data.success) {
          setActionMessage({ type: 'success', text: `Location "${payload.name}" updated successfully.` });
          setShowModal(false);
          fetchLocations();
        }
      } else {
        const res = await api.post('/locations', payload);
        if (res.data.success) {
          setActionMessage({ type: 'success', text: `Location "${payload.name}" created successfully.` });
          setShowModal(false);
          fetchLocations();
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed');
    }
  };

  const handleDeleteLocation = async (loc: CampusLocation) => {
    if (!window.confirm(`Are you sure you want to permanently delete location "${loc.name}" (${loc.code})?`)) {
      return;
    }

    try {
      const res = await api.delete(`/locations/${loc._id}`);
      if (res.data.success) {
        setActionMessage({ type: 'success', text: `Location "${loc.name}" deleted successfully.` });
        fetchLocations();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Could not delete location';
      setActionMessage({ type: 'error', text: msg });
    }
  };

  const handleToggleActive = async (loc: CampusLocation) => {
    try {
      const res = await api.put(`/locations/${loc._id}`, { isActive: !loc.isActive });
      if (res.data.success) {
        setActionMessage({
          type: 'success',
          text: `Location "${loc.name}" is now ${!loc.isActive ? 'ACTIVE' : 'INACTIVE'}.`,
        });
        fetchLocations();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.message || 'Toggle failed' });
    }
  };

  const openComplaintsView = async (loc: CampusLocation) => {
    setActiveComplaintsModal({ open: true, location: loc, complaints: [], loading: true });
    try {
      const res = await api.get(`/locations/${loc._id}/complaints`);
      if (res.data.success) {
        setActiveComplaintsModal({
          open: true,
          location: loc,
          complaints: res.data.data.complaints || [],
          loading: false,
        });
      }
    } catch (err) {
      setActiveComplaintsModal({ open: true, location: loc, complaints: [], loading: false });
    }
  };

  const filteredLocations = locations.filter((loc) => {
    if (filterType !== 'ALL' && loc.locationType !== filterType) return false;
    if (filterActive === 'ACTIVE' && !loc.isActive) return false;
    if (filterActive === 'INACTIVE' && loc.isActive) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = loc.name.toLowerCase().includes(q);
      const matchCode = loc.code.toLowerCase().includes(q);
      const matchPath = loc.fullPath?.toLowerCase().includes(q) || false;
      const matchZone = loc.zone?.toLowerCase().includes(q) || false;
      return matchName || matchCode || matchPath || matchZone;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Campus Location & Zone Directory</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configurable hierarchical campus coverage across all 15 operational facility categories
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLocations}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition text-sm"
          >
            <Plus className="w-4 h-4" /> Add Campus Location
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/40 border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            )}
            {actionMessage.text}
          </div>
          <button onClick={() => setActionMessage(null)} className="text-xs opacity-75 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Locations</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.totalLocations || locations.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Coverage</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {locations.filter((l) => l.isActive).length}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical Infrastructure</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            {locations.filter((l) => l.metadata?.criticalInfrastructure).length}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Facility Categories</p>
          <p className="text-2xl font-bold text-indigo-400 mt-1">15 Active Types</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search code, name, path, zone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-sm text-white pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-500 hidden md:block" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 py-2 px-3 rounded-lg focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All 15 Categories</option>
            {LOCATION_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 py-2 px-3 rounded-lg focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Locations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Code & Name</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Hierarchy Path</th>
                <th className="px-5 py-3.5">Zone & Attributes</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading campus locations...
                  </td>
                </tr>
              ) : filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No campus locations matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredLocations.map((loc) => (
                  <tr key={loc._id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{loc.name}</span>
                        {loc.metadata?.criticalInfrastructure && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            CRITICAL
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-indigo-400 font-mono mt-0.5">{loc.code}</div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {LOCATION_CATEGORIES.find((c) => c.value === loc.locationType)?.label || loc.locationType}
                      </span>
                    </td>

                    <td className="px-5 py-4 max-w-xs truncate">
                      <div className="text-xs text-slate-300 flex items-center gap-1.5" title={loc.fullPath || loc.name}>
                        <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{loc.fullPath || loc.name}</span>
                      </div>
                      {loc.parentLocation && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Parent: {loc.parentLocation.name} ({loc.parentLocation.code})
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-xs text-slate-400">
                        {loc.zone ? <span className="text-slate-300 font-medium">Zone: {loc.zone}</span> : 'No Zone'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {loc.buildingName ? `${loc.buildingName} ${loc.floor ? '• ' + loc.floor : ''}` : 'Outdoor / Campus-Wide'}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleActive(loc)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                          loc.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                        title="Click to toggle status"
                      >
                        {loc.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {loc.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openComplaintsView(loc)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded-lg transition"
                          title="View Unresolved Complaints in Location"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(loc)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                          title="Edit Location"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLocation(loc)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition"
                          title="Delete Location (Safe Check)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-400" />
                {editingLoc ? `Edit Location: ${editingLoc.name}` : 'Create Campus Location'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Gate Security Cabin 1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Unique Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SEC-GATE-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Location Category *
                  </label>
                  <select
                    value={formData.locationType}
                    onChange={(e) => setFormData({ ...formData, locationType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
                  >
                    {LOCATION_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Parent Location (Hierarchy Tree)
                  </label>
                  <select
                    value={formData.parentLocation}
                    onChange={(e) => setFormData({ ...formData, parentLocation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- None (Top Level Root) --</option>
                    {locations
                      .filter((l) => !editingLoc || l._id !== editingLoc._id)
                      .map((l) => (
                        <option key={l._id} value={l._id}>
                          {l.name} ({l.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Zone / Sector</label>
                  <input
                    type="text"
                    placeholder="e.g. North Zone"
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Building (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Science Block A"
                    value={formData.buildingName}
                    onChange={(e) => setFormData({ ...formData, buildingName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Floor / Room</label>
                  <input
                    type="text"
                    placeholder="e.g. Ground / 102"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Operational Metadata
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Supervisor</label>
                    <input
                      type="text"
                      placeholder="e.g. Chief Security Officer"
                      value={formData.supervisor}
                      onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 9952911217"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Operational Hours</label>
                    <input
                      type="text"
                      placeholder="e.g. 24x7 / 8am - 6pm"
                      value={formData.operationalHours}
                      onChange={(e) => setFormData({ ...formData, operationalHours: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 mt-4">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.criticalInfrastructure}
                      onChange={(e) => setFormData({ ...formData, criticalInfrastructure: e.target.checked })}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-slate-950"
                    />
                    <span>Mark as Critical Campus Infrastructure</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-slate-950"
                    />
                    <span>Active for Complaint Reporting & Maintenance</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition"
                >
                  {editingLoc ? 'Update Location' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNRESOLVED COMPLAINTS DRAWER/MODAL */}
      {activeComplaintsModal.open && activeComplaintsModal.location && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  Unresolved Complaints in {activeComplaintsModal.location.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{activeComplaintsModal.location.code}</p>
              </div>
              <button
                onClick={() => setActiveComplaintsModal({ open: false, location: null, complaints: [], loading: false })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeComplaintsModal.loading ? (
              <div className="text-center py-8 text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                Loading complaints...
              </div>
            ) : activeComplaintsModal.complaints.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-white">No active or pending complaints</p>
                <p className="text-xs text-slate-500 mt-1">This location has zero pending maintenance tasks.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {activeComplaintsModal.complaints.map((c: any) => (
                  <div key={c._id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-semibold text-white">{c.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description}</p>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2">
                      <span>Priority: <strong className="text-slate-300">{c.priority}</strong></span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setActiveComplaintsModal({ open: false, location: null, complaints: [], loading: false })}
                className="px-4 py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
