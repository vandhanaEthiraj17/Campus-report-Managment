import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { IAsset, IMaintenanceRecord, IAssetAnalytics, IUser } from '../../types/index';
import {
  Package, Wrench, AlertTriangle, CheckCircle2, Clock, Calendar,
  ShieldCheck, AlertCircle, Plus, Search, RefreshCw,
  Eye, Edit3, Trash2, Check, X,
  Building, MapPin, Tag
} from 'lucide-react';
import canvasConfetti from 'canvas-confetti';

const PREDEFINED_LOCATIONS: Record<string, Record<string, string[]>> = {
  'Main Block': {
    '1st Floor': ['Room 101', 'Room 102', 'Room 103', 'Computer Lab 1', 'Washroom East Wing', 'Corridor'],
    '2nd Floor': ['Room 201', 'Room 202', 'Room 203', 'Seminar Hall A', 'Washroom West Wing', 'Corridor'],
    '3rd Floor': ['Room 301', 'Room 302', 'Room 303', 'Auditorium', 'Washroom', 'Corridor'],
    '4th Floor': ['Room 401', 'Room 402', 'Room 403', 'Conference Room', 'Washroom', 'Corridor']
  },
  'MBA Block': {
    '1st Floor': ['Room 108', 'MBA Lecture Hall 1', 'Washroom', 'Corridor'],
    '2nd Floor': ['MBA Room 201', 'MBA Room 202', 'Washroom', 'Corridor'],
    '3rd Floor': ['MBA Room 301', 'MBA Room 302', 'Washroom', 'Corridor'],
    '4th Floor': ['MBA Room 401', 'MBA Room 402', 'Washroom', 'Corridor']
  },
  'Arch Block': {
    '1st Floor': ['Studio A', 'Design Lab 1', 'Washroom', 'Corridor'],
    '2nd Floor': ['Studio B', 'Design Lab 2', 'Washroom', 'Corridor'],
    '3rd Floor': ['Studio C', 'Exhibition Hall', 'Washroom', 'Corridor'],
    '4th Floor': ['Studio D', 'Arch Faculty Room', 'Washroom', 'Corridor']
  },
  'Civil Block': {
    '1st Floor': ['Mechanical Workshop', 'Civil Lab 1', 'Washroom', 'Corridor'],
    '2nd Floor': ['Civil Room 201', 'Civil Lab 2', 'Washroom', 'Corridor'],
    '3rd Floor': ['Civil Room 301', 'Geotech Lab', 'Washroom', 'Corridor'],
    '4th Floor': ['Civil Room 401', 'Survey Lab', 'Washroom', 'Corridor']
  },
  'Canteen': {
    '1st Floor': ['Main Dining Hall', 'Kitchen', 'Billing Counter', 'Handwash Area'],
    '2nd Floor': ['Mezzanine Seating', 'VIP Lounge', 'Washroom'],
    '3rd Floor': ['Staff Dining', 'Store Room', 'Washroom'],
    '4th Floor': ['Rooftop Seating', 'Service Area', 'Washroom']
  },
  'Stores': {
    '1st Floor': ['Inventory Room 1', 'Loading Dock', 'Billing Counter'],
    '2nd Floor': ['Inventory Room 2', 'Manager Office', 'Washroom'],
    '3rd Floor': ['Archive Store', 'Equipment Room', 'Washroom'],
    '4th Floor': ['Stationery Store', 'Supplies Room', 'Washroom']
  },
  'Library Block': {
    '1st Floor': ['Digital Reading Room', 'Newspaper Section', 'Circulation Counter'],
    '2nd Floor': ['Reference Book Section', 'Study Cubicles', 'Washroom'],
    '3rd Floor': ['Journal Section', 'Discussion Room A', 'Washroom'],
    '4th Floor': ['Rare Book Section', 'Discussion Room B', 'Washroom']
  }
};

const ASSET_TYPES = [
  'PROJECTOR',
  'AIR_CONDITIONER',
  'LAB_EQUIPMENT',
  'ELECTRICAL_PANEL',
  'WATER_PURIFIER',
  'FURNITURE',
  'NETWORK_ROUTER',
  'GENERATOR',
  'OTHER',
];

export const AssetManagementTab: React.FC = () => {
  // Main view state
  const [subTab, setSubTab] = useState<'inventory' | 'maintenance'>('inventory');
  const [isLoading, setIsLoading] = useState(true);
  const [assets, setAssets] = useState<IAsset[]>([]);
  const [analytics, setAnalytics] = useState<IAssetAnalytics | null>(null);
  const [staffUsers, setStaffUsers] = useState<IUser[]>([]);

  // Filter & Search state
  const [search, setSearch] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [maintenanceNeededOnly, setMaintenanceNeededOnly] = useState(false);
  const [warrantyExpiredOnly, setWarrantyExpiredOnly] = useState(false);
  const [repeatedComplaintsOnly, setRepeatedComplaintsOnly] = useState(false);

  // Maintenance Tasks state
  const [maintenanceTasks, setMaintenanceTasks] = useState<IMaintenanceRecord[]>([]);
  const [taskFilterStatus, setTaskFilterStatus] = useState('');

  // Modals state
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<IAsset | null>(null);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Schedule Maintenance Modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [targetAssetForMaintenance, setTargetAssetForMaintenance] = useState<IAsset | null>(null);
  const [schedType, setSchedType] = useState<'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION' | 'EMERGENCY'>('PREVENTIVE');
  const [schedDate, setSchedDate] = useState('');
  const [schedStaffId, setSchedStaffId] = useState('');
  const [schedDesc, setSchedDesc] = useState('');
  const [schedNotes, setSchedNotes] = useState('');

  // Complete Maintenance Modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [activeTaskToComplete, setActiveTaskToComplete] = useState<IMaintenanceRecord | null>(null);
  const [completeDesc, setCompleteDesc] = useState('');
  const [completeParts, setCompleteParts] = useState('');
  const [completeCost, setCompleteCost] = useState('0');
  const [completeCondition, setCompleteCondition] = useState('GOOD');

  // Asset Form fields
  const [formAssetCode, setFormAssetCode] = useState('');
  const [formAssetName, setFormAssetName] = useState('');
  const [formAssetType, setFormAssetType] = useState('OTHER');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBuilding, setFormBuilding] = useState('');
  const [formFloor, setFormFloor] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formModelNumber, setFormModelNumber] = useState('');
  const [formSerialNumber, setFormSerialNumber] = useState('');
  const [formInstallationDate, setFormInstallationDate] = useState('');
  const [formWarrantyDate, setFormWarrantyDate] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [formCondition, setFormCondition] = useState('GOOD');
  const [formFreqDays, setFormFreqDays] = useState('90');
  const [formDept, setFormDept] = useState('');
  const [formStaffId, setFormStaffId] = useState('');

  // Data Loaders
  const loadAnalytics = async () => {
    try {
      const res = await api.get('/assets/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to load asset analytics', err);
    }
  };

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/assets', {
        params: {
          search: search || undefined,
          building: filterBuilding || undefined,
          category: filterCategory || undefined,
          status: filterStatus || undefined,
          condition: filterCondition || undefined,
          maintenanceNeeded: maintenanceNeededOnly ? 'true' : undefined,
          warrantyExpired: warrantyExpiredOnly ? 'true' : undefined,
          repeatedComplaints: repeatedComplaintsOnly ? 'true' : undefined,
        },
      });
      setAssets(res.data.assets || []);
    } catch (err) {
      console.error('Failed to load assets', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMaintenanceTasks = async () => {
    try {
      const res = await api.get('/maintenance/tasks', {
        params: {
          status: taskFilterStatus || undefined,
        },
      });
      setMaintenanceTasks(res.data.records || []);
    } catch (err) {
      console.error('Failed to load maintenance tasks', err);
    }
  };

  const loadStaffUsers = async () => {
    try {
      const res = await api.get('/admin/users', { params: { role: 'STAFF' } });
      setStaffUsers(res.data.users || []);
    } catch (err) {
      console.error('Failed to load staff users', err);
    }
  };

  useEffect(() => {
    loadAnalytics();
    loadStaffUsers();
  }, []);

  useEffect(() => {
    loadAssets();
  }, [
    search,
    filterBuilding,
    filterCategory,
    filterStatus,
    filterCondition,
    maintenanceNeededOnly,
    warrantyExpiredOnly,
    repeatedComplaintsOnly,
  ]);

  useEffect(() => {
    if (subTab === 'maintenance') {
      loadMaintenanceTasks();
    }
  }, [subTab, taskFilterStatus]);

  // Asset Creation / Editing
  const openCreateModal = () => {
    setEditingAsset(null);
    setFormAssetCode('');
    setFormAssetName('');
    setFormAssetType('PROJECTOR');
    setFormCategory('Projector & AV Issues');
    setFormDescription('');
    setFormBuilding('Main Block');
    setFormFloor('1st Floor');
    setFormRoom('Room 101');
    setFormManufacturer('');
    setFormModelNumber('');
    setFormSerialNumber('');
    setFormInstallationDate(new Date().toISOString().slice(0, 10));
    setFormWarrantyDate('');
    setFormStatus('ACTIVE');
    setFormCondition('EXCELLENT');
    setFormFreqDays('90');
    setFormDept('IT & Multimedia Support');
    setFormStaffId('');
    setShowAssetModal(true);
  };

  const openEditModal = (asset: IAsset) => {
    setEditingAsset(asset);
    setFormAssetCode(asset.assetCode);
    setFormAssetName(asset.assetName);
    setFormAssetType(asset.assetType || 'OTHER');
    setFormCategory(asset.category || '');
    setFormDescription(asset.description || '');
    setFormBuilding(asset.building);
    setFormFloor(asset.floor);
    setFormRoom(asset.room);
    setFormManufacturer(asset.manufacturer || '');
    setFormModelNumber(asset.modelNumber || '');
    setFormSerialNumber(asset.serialNumber || '');
    setFormInstallationDate(asset.installationDate ? asset.installationDate.slice(0, 10) : '');
    setFormWarrantyDate(asset.warrantyExpiryDate ? asset.warrantyExpiryDate.slice(0, 10) : '');
    setFormStatus(asset.status);
    setFormCondition(asset.condition);
    setFormFreqDays(String(asset.maintenanceFrequencyDays || 90));
    setFormDept(asset.assignedDepartment || '');
    setFormStaffId(typeof asset.assignedStaff === 'object' && asset.assignedStaff ? (asset.assignedStaff as any)._id : (asset.assignedStaff || ''));
    setShowAssetModal(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        assetCode: formAssetCode || undefined,
        assetName: formAssetName,
        assetType: formAssetType,
        category: formCategory,
        description: formDescription,
        building: formBuilding,
        floor: formFloor,
        room: formRoom,
        manufacturer: formManufacturer || undefined,
        modelNumber: formModelNumber || undefined,
        serialNumber: formSerialNumber || undefined,
        installationDate: formInstallationDate || undefined,
        warrantyExpiryDate: formWarrantyDate || undefined,
        status: formStatus,
        condition: formCondition,
        maintenanceFrequencyDays: Number(formFreqDays) || 90,
        assignedDepartment: formDept || undefined,
        assignedStaff: formStaffId || undefined,
      };

      if (editingAsset) {
        await api.put(`/assets/${editingAsset._id}`, payload);
        alert('Campus asset updated successfully.');
      } else {
        await api.post('/assets', payload);
        canvasConfetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        alert('New campus asset registered successfully.');
      }

      setShowAssetModal(false);
      loadAssets();
      loadAnalytics();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save campus asset.');
    }
  };

  const handleDecommissionAsset = async (asset: IAsset) => {
    if (!window.confirm(`Are you sure you want to decommission ${asset.assetCode} (${asset.assetName})?`)) {
      return;
    }
    try {
      await api.delete(`/assets/${asset._id}`);
      alert(`Asset ${asset.assetCode} decommissioned.`);
      loadAssets();
      loadAnalytics();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to decommission asset.');
    }
  };

  const viewAssetDetails = async (asset: IAsset) => {
    try {
      const res = await api.get(`/assets/${asset._id}`);
      setSelectedAssetDetail(res.data);
      setShowDetailModal(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to fetch asset details.');
    }
  };

  // Schedule Maintenance
  const openScheduleMaintenance = (asset: IAsset) => {
    setTargetAssetForMaintenance(asset);
    setSchedType('PREVENTIVE');
    setSchedDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10)); // Tomorrow
    setSchedStaffId(typeof asset.assignedStaff === 'object' && asset.assignedStaff ? (asset.assignedStaff as any)._id : '');
    setSchedDesc(`Routine preventive maintenance & diagnostic for ${asset.assetName}`);
    setSchedNotes('');
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAssetForMaintenance) return;
    try {
      await api.post('/maintenance/schedule', {
        assetId: targetAssetForMaintenance._id,
        maintenanceType: schedType,
        scheduledDate: schedDate,
        assignedStaffId: schedStaffId || undefined,
        workDescription: schedDesc,
        notes: schedNotes || undefined,
      });

      alert('Preventive maintenance task scheduled.');
      setShowScheduleModal(false);
      loadAssets();
      loadAnalytics();
      if (subTab === 'maintenance') {
        loadMaintenanceTasks();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to schedule maintenance.');
    }
  };

  // Task Actions
  const handleStartTask = async (taskId: string) => {
    try {
      await api.patch(`/maintenance/${taskId}/start`);
      loadMaintenanceTasks();
      loadAssets();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start maintenance.');
    }
  };

  const openCompleteModal = (task: IMaintenanceRecord) => {
    setActiveTaskToComplete(task);
    setCompleteDesc(task.workDescription || 'Maintenance completed per routine specifications.');
    setCompleteParts('');
    setCompleteCost('0');
    setCompleteCondition('GOOD');
    setShowCompleteModal(true);
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTaskToComplete) return;
    try {
      await api.post(`/maintenance/${activeTaskToComplete._id}/complete`, {
        workDescription: completeDesc,
        partsReplaced: completeParts,
        cost: Number(completeCost) || 0,
        conditionAfter: completeCondition,
      });

      alert('Maintenance completed and asset records updated.');
      setShowCompleteModal(false);
      loadMaintenanceTasks();
      loadAssets();
      loadAnalytics();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record maintenance completion.');
    }
  };

  const handleCancelTask = async (taskId: string) => {
    if (!window.confirm('Cancel this scheduled maintenance task?')) return;
    try {
      await api.patch(`/maintenance/${taskId}/cancel`);
      loadMaintenanceTasks();
      loadAssets();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel task.');
    }
  };

  // Condition Badge color
  const getConditionBadge = (cond: string) => {
    switch (cond) {
      case 'EXCELLENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'GOOD':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'FAIR':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'POOR':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_REPAIR':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'UNDER_MAINTENANCE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DECOMMISSIONED':
        return 'bg-slate-100 text-slate-500 border-slate-200 line-through';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getMaintenanceTaskBadge = (st: string) => {
    switch (st) {
      case 'SCHEDULED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'OVERDUE':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-extrabold';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-400 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const isWarrantyExpired = (dateStr?: string) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const isMaintenanceDue = (asset: IAsset) => {
    if (!asset.nextMaintenanceDate) return false;
    return new Date(asset.nextMaintenanceDate) <= new Date() || asset.condition === 'POOR' || asset.condition === 'CRITICAL';
  };

  return (
    <div className="space-y-6">
      {/* 1. Database-Driven Analytics Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-card rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Assets</span>
            <Package className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-800 font-outfit">
              {analytics?.totalAssets ?? 0}
            </span>
            <span className="block text-[10px] text-slate-500 font-medium mt-0.5">
              Active: {analytics?.activeAssets ?? 0}
            </span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200 flex flex-col justify-between bg-amber-50/40">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Maint. Needed</span>
            <Wrench className="h-4 w-4" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-700 font-outfit">
              {analytics?.maintenanceNeeded ?? 0}
            </span>
            <span className="block text-[10px] text-amber-800 font-medium mt-0.5">
              Due or Poor Condition
            </span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200 flex flex-col justify-between bg-rose-50/40">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overdue Tasks</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-rose-700 font-outfit">
              {analytics?.overdueTasks ?? 0}
            </span>
            <span className="block text-[10px] text-rose-800 font-medium mt-0.5">
              Breached schedule
            </span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Repeated Issues</span>
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-purple-700 font-outfit">
              {analytics?.repeatedComplaints ?? 0}
            </span>
            <span className="block text-[10px] text-slate-500 font-medium mt-0.5">
              ≥ 2 complaints filed
            </span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Warranty</span>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-800 font-outfit">
              {analytics?.underWarranty ?? 0}
            </span>
            <span className="block text-[10px] text-rose-600 font-medium mt-0.5">
              Expired: {analytics?.expiredWarranty ?? 0}
            </span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200 flex flex-col justify-between bg-blue-50/40">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completion</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-blue-700 font-outfit">
              {analytics?.maintenanceCompletionRate ?? 100}%
            </span>
            <span className="block text-[10px] text-slate-500 font-medium mt-0.5">
              {analytics?.completedMaintenanceRecords ?? 0} completed
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Insights Sub-Bar (Highest Demand Buildings & Categories) */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card rounded-2xl p-4 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-blue-600" />
              Buildings With Highest Maintenance Demand
            </h4>
            <div className="space-y-2">
              {analytics.buildingDemand && analytics.buildingDemand.length > 0 ? (
                analytics.buildingDemand.map((b) => (
                  <div key={b.building} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                    <span className="font-semibold text-slate-800">{b.building}</span>
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium text-slate-600">
                        {b.assetCount} assets
                      </span>
                      {b.maintenanceDue > 0 && (
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          {b.maintenanceDue} due
                        </span>
                      )}
                      <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {b.totalComplaints} complaints
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-2">No building maintenance demand data yet.</p>
              )}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-indigo-600" />
              Most Frequently Reported Asset Categories
            </h4>
            <div className="space-y-2">
              {analytics.categoryDemand && analytics.categoryDemand.length > 0 ? (
                analytics.categoryDemand.map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                    <span className="font-semibold text-slate-800">{c.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium text-slate-600">
                        {c.totalAssets} registered
                      </span>
                      <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        {c.totalComplaints} tickets
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-2">No category complaint records yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Sub-tab switcher: Asset Inventory vs Maintenance Queue */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSubTab('inventory')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'inventory'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            Campus Asset Register ({assets.length})
          </button>

          <button
            onClick={() => setSubTab('maintenance')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'maintenance'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            Preventive Maintenance Queue ({maintenanceTasks.length})
          </button>
        </div>

        <button
          onClick={openCreateModal}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Register Campus Asset
        </button>
      </div>

      {/* SUB-TAB 1: ASSET INVENTORY */}
      {subTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="glass-card rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code, name, model..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs"
                />
              </div>

              <select
                value={filterBuilding}
                onChange={(e) => setFilterBuilding(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-xs"
              >
                <option value="">All Buildings</option>
                {Object.keys(PREDEFINED_LOCATIONS).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Filter Category..."
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-xs"
              />

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-xs"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="IN_REPAIR">IN_REPAIR</option>
                <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                <option value="DECOMMISSIONED">DECOMMISSIONED</option>
              </select>

              <select
                value={filterCondition}
                onChange={(e) => setFilterCondition(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-xs"
              >
                <option value="">All Conditions</option>
                <option value="EXCELLENT">EXCELLENT</option>
                <option value="GOOD">GOOD</option>
                <option value="FAIR">FAIR</option>
                <option value="POOR">POOR</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            {/* Quick Toggle Flags */}
            <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
              <span className="text-slate-400 font-semibold text-[11px] mr-1">Quick Filters:</span>
              <button
                type="button"
                onClick={() => setMaintenanceNeededOnly(!maintenanceNeededOnly)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  maintenanceNeededOnly
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Wrench className="h-3 w-3" />
                Maintenance Needed
              </button>

              <button
                type="button"
                onClick={() => setWarrantyExpiredOnly(!warrantyExpiredOnly)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  warrantyExpiredOnly
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Clock className="h-3 w-3" />
                Expired Warranty
              </button>

              <button
                type="button"
                onClick={() => setRepeatedComplaintsOnly(!repeatedComplaintsOnly)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  repeatedComplaintsOnly
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <AlertCircle className="h-3 w-3" />
                Repeated Issues (≥ 2 Complaints)
              </button>

              {(search || filterBuilding || filterStatus || filterCondition || maintenanceNeededOnly || warrantyExpiredOnly || repeatedComplaintsOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setFilterBuilding('');
                    setFilterStatus('');
                    setFilterCondition('');
                    setMaintenanceNeededOnly(false);
                    setWarrantyExpiredOnly(false);
                    setRepeatedComplaintsOnly(false);
                  }}
                  className="px-2 py-1 text-slate-400 hover:text-slate-600 font-bold text-[11px] underline cursor-pointer ml-auto"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Loading campus assets...</span>
            </div>
          ) : assets.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <Package className="h-8 w-8 mx-auto text-slate-300" />
              <h3 className="font-bold text-slate-700 text-sm">No campus assets found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No equipment matching your criteria was found. Click "Register Campus Asset" to add one.
              </p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Asset Code / Name</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Status & Condition</th>
                      <th className="py-3.5 px-4">Preventive Maintenance</th>
                      <th className="py-3.5 px-4">Complaints</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assets.map((ast) => {
                      const maintDue = isMaintenanceDue(ast);
                      const wExpired = isWarrantyExpired(ast.warrantyExpiryDate);

                      return (
                        <tr key={ast._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-start gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                                <Package className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] border border-blue-200">
                                    {ast.assetCode}
                                  </span>
                                  {wExpired && (
                                    <span className="text-[9px] bg-rose-50 text-rose-600 border border-rose-200 px-1 rounded font-bold">
                                      Warranty Expired
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-bold text-slate-800 text-xs mt-0.5">{ast.assetName}</h4>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {ast.category} {ast.manufacturer ? `• ${ast.manufacturer}` : ''}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-slate-800 font-semibold text-xs flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-rose-500" />
                              <span>{ast.building}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 block">
                              {ast.floor} • {ast.room}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(ast.status)}`}>
                                {ast.status}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getConditionBadge(ast.condition)}`}>
                                {ast.condition}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-xs">
                              {ast.nextMaintenanceDate ? (
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-semibold ${maintDue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                                    {new Date(ast.nextMaintenanceDate).toLocaleDateString()}
                                  </span>
                                  {maintDue && (
                                    <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[9px] font-extrabold uppercase">
                                      DUE
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">Not scheduled</span>
                              )}
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Frequency: Every {ast.maintenanceFrequencyDays || 90}d
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {ast.complaintCount > 0 ? (
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                ast.complaintCount >= 2 
                                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {ast.complaintCount} ticket(s)
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">0 tickets</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="View Complete History"
                                onClick={() => viewAssetDetails(ast)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                title="Schedule Maintenance"
                                onClick={() => openScheduleMaintenance(ast)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              >
                                <Wrench className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                title="Edit Asset"
                                onClick={() => openEditModal(ast)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>

                              {ast.status !== 'DECOMMISSIONED' && (
                                <button
                                  type="button"
                                  title="Decommission Asset"
                                  onClick={() => handleDecommissionAsset(ast)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: PREVENTIVE MAINTENANCE QUEUE */}
      {subTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-4 border border-slate-200 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Filter:</span>
              <select
                value={taskFilterStatus}
                onChange={(e) => setTaskFilterStatus(e.target.value)}
                className="glass-input rounded-xl px-3 py-1.5 text-xs"
              >
                <option value="">All Tasks</option>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="OVERDUE">OVERDUE</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <button
              onClick={loadMaintenanceTasks}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh Tasks
            </button>
          </div>

          {maintenanceTasks.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <Wrench className="h-8 w-8 mx-auto text-slate-300" />
              <h3 className="font-bold text-slate-700 text-sm">No maintenance tasks in this queue</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Preventive maintenance tasks are automatically triggered by the background scheduler when assets reach their frequency cycle.
              </p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Task ID & Type</th>
                      <th className="py-3.5 px-4">Target Campus Asset</th>
                      <th className="py-3.5 px-4">Scheduled Date</th>
                      <th className="py-3.5 px-4">Technician / Dept</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {maintenanceTasks.map((t) => (
                      <tr key={t._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                            {t.recordId}
                          </span>
                          <span className="text-[10px] font-bold text-indigo-600 block mt-1">
                            {t.maintenanceType}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 text-xs">
                            {t.assetName}
                          </div>
                          <span className="text-[11px] font-mono text-blue-600 block">
                            {t.assetCode}
                          </span>
                          <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                            {t.workDescription}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 font-semibold text-slate-800">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(t.scheduledDate).toLocaleDateString()}
                          </div>
                          {t.completedDate && (
                            <span className="text-[10px] text-emerald-600 block font-medium">
                              Done: {new Date(t.completedDate).toLocaleDateString()}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800 block">
                            {t.assignedStaffName || (typeof t.assignedStaff === 'object' && t.assignedStaff ? (t.assignedStaff as any).name : 'Unassigned')}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {t.assignedDepartment || 'General Maintenance'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getMaintenanceTaskBadge(t.status)}`}>
                            {t.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {t.status === 'SCHEDULED' || t.status === 'OVERDUE' ? (
                              <button
                                type="button"
                                onClick={() => handleStartTask(t._id)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] cursor-pointer"
                              >
                                Start Work
                              </button>
                            ) : null}

                            {t.status === 'IN_PROGRESS' || t.status === 'SCHEDULED' || t.status === 'OVERDUE' ? (
                              <button
                                type="button"
                                onClick={() => openCompleteModal(t)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="h-3 w-3" />
                                Record Completion
                              </button>
                            ) : null}

                            {t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && (
                              <button
                                type="button"
                                onClick={() => handleCancelTask(t._id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                title="Cancel Task"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. REGISTER / EDIT ASSET MODAL */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card rounded-2xl border border-slate-200 w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 font-outfit">
                    {editingAsset ? `Edit Asset: ${editingAsset.assetCode}` : 'Register New Campus Asset'}
                  </h3>
                  <p className="text-xs text-slate-500">Infrastructure asset catalog & preventive scheduling</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssetModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Asset Code (Optional - Auto Generated if Empty)</label>
                  <input
                    type="text"
                    placeholder="e.g. AST-MB-101-01"
                    value={formAssetCode}
                    onChange={(e) => setFormAssetCode(e.target.value.toUpperCase())}
                    className="w-full glass-input rounded-xl px-3 py-2 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Asset Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Epson EB-2250U Laser Projector"
                    value={formAssetName}
                    onChange={(e) => setFormAssetName(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Asset Type</label>
                  <select
                    value={formAssetType}
                    onChange={(e) => setFormAssetType(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2"
                  >
                    {ASSET_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Projector & AV Issues"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              {/* Location Cascade */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Campus Location Details *
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Building</span>
                    <select
                      value={formBuilding}
                      onChange={(e) => {
                        setFormBuilding(e.target.value);
                        setFormFloor('');
                        setFormRoom('');
                      }}
                      required
                      className="w-full glass-input rounded-xl px-2.5 py-1.5"
                    >
                      <option value="">Select Building...</option>
                      {Object.keys(PREDEFINED_LOCATIONS).map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Floor</span>
                    <select
                      value={formFloor}
                      onChange={(e) => {
                        setFormFloor(e.target.value);
                        setFormRoom('');
                      }}
                      required
                      disabled={!formBuilding}
                      className="w-full glass-input rounded-xl px-2.5 py-1.5"
                    >
                      <option value="">Select Floor...</option>
                      {(formBuilding ? Object.keys(PREDEFINED_LOCATIONS[formBuilding] || {}) : []).map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Room / Spot</span>
                    <select
                      value={formRoom}
                      onChange={(e) => setFormRoom(e.target.value)}
                      required
                      disabled={!formFloor}
                      className="w-full glass-input rounded-xl px-2.5 py-1.5"
                    >
                      <option value="">Select Room...</option>
                      {(formBuilding && formFloor ? PREDEFINED_LOCATIONS[formBuilding][formFloor] || [] : []).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Hardware Specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Cisco, Daikin, HP"
                    value={formManufacturer}
                    onChange={(e) => setFormManufacturer(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Model Number</label>
                  <input
                    type="text"
                    placeholder="e.g. WS-C3850-48P"
                    value={formModelNumber}
                    onChange={(e) => setFormModelNumber(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Serial Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-88219-X"
                    value={formSerialNumber}
                    onChange={(e) => setFormSerialNumber(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              {/* Dates & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Installation Date</label>
                  <input
                    type="date"
                    value={formInstallationDate}
                    onChange={(e) => setFormInstallationDate(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Warranty Expiry Date</label>
                  <input
                    type="date"
                    value={formWarrantyDate}
                    onChange={(e) => setFormWarrantyDate(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Maint. Frequency (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={formFreqDays}
                    onChange={(e) => setFormFreqDays(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Condition</label>
                  <select
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value as any)}
                    className="w-full glass-input rounded-xl px-3 py-2"
                  >
                    <option value="EXCELLENT">EXCELLENT</option>
                    <option value="GOOD">GOOD</option>
                    <option value="FAIR">FAIR</option>
                    <option value="POOR">POOR</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Operational Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full glass-input rounded-xl px-3 py-2"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="IN_REPAIR">IN_REPAIR</option>
                    <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                    <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Assigned Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Electrical Maintenance"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assigned Technician</label>
                <select
                  value={formStaffId}
                  onChange={(e) => setFormStaffId(e.target.value)}
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
                <label className="font-semibold text-slate-700 block mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes regarding asset specifications, position, or cabling..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full glass-input rounded-xl p-3"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-md cursor-pointer"
                >
                  {editingAsset ? 'Update Asset' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ASSET DETAIL & MAINTENANCE HISTORY MODAL */}
      {showDetailModal && selectedAssetDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card rounded-2xl border border-slate-200 w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 font-outfit">
                    {selectedAssetDetail.asset.assetName}
                  </h3>
                  <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {selectedAssetDetail.asset.assetCode}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
              {/* Asset Spec Pill Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-100/50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Location</span>
                  <span className="font-bold text-slate-800">
                    {selectedAssetDetail.asset.building} • {selectedAssetDetail.asset.room}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Condition</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${getConditionBadge(selectedAssetDetail.asset.condition)}`}>
                    {selectedAssetDetail.asset.condition}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Next Maintenance</span>
                  <span className="font-bold text-slate-800">
                    {selectedAssetDetail.asset.nextMaintenanceDate
                      ? new Date(selectedAssetDetail.asset.nextMaintenanceDate).toLocaleDateString()
                      : 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Warranty</span>
                  <span className={`font-bold ${isWarrantyExpired(selectedAssetDetail.asset.warrantyExpiryDate) ? 'text-rose-600' : 'text-slate-800'}`}>
                    {selectedAssetDetail.asset.warrantyExpiryDate
                      ? new Date(selectedAssetDetail.asset.warrantyExpiryDate).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Linked Complaints Section */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>Linked Complaint History ({selectedAssetDetail.complaints?.length || 0})</span>
                  {selectedAssetDetail.complaints?.length >= 2 && (
                    <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                      ⚠️ Frequent Failure Item
                    </span>
                  )}
                </h4>

                {selectedAssetDetail.complaints && selectedAssetDetail.complaints.length > 0 ? (
                  <div className="space-y-2">
                    {selectedAssetDetail.complaints.map((c: any) => (
                      <div key={c._id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {c.ticketId}
                            </span>
                            <span className="font-bold text-slate-800">{c.title}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Status: <strong>{c.status}</strong> • Priority: <strong>{c.priority}</strong> • Filed: {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 py-3 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No complaints have been reported against this equipment.
                  </p>
                )}
              </div>

              {/* Maintenance History Records */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Preventive & Corrective Maintenance History ({selectedAssetDetail.maintenanceHistory?.length || 0})
                </h4>

                {selectedAssetDetail.maintenanceHistory && selectedAssetDetail.maintenanceHistory.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedAssetDetail.maintenanceHistory.map((m: any) => (
                      <div key={m._id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-700">
                            {m.recordId} • {m.maintenanceType}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getMaintenanceTaskBadge(m.status)}`}>
                            {m.status}
                          </span>
                        </div>
                        <p className="text-slate-700 font-medium">{m.workDescription}</p>
                        {m.partsReplaced && (
                          <span className="text-[11px] text-indigo-700 block">
                            Parts Replaced: {m.partsReplaced}
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                          <span>Technician: {m.assignedStaffName || m.assignedDepartment || 'General'}</span>
                          <span>Completed: {m.completedDate ? new Date(m.completedDate).toLocaleDateString() : 'Pending'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 py-3 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No maintenance records logged yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SCHEDULE MAINTENANCE MODAL */}
      {showScheduleModal && targetAssetForMaintenance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card rounded-2xl border border-slate-200 w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 font-outfit">Schedule Maintenance</h3>
                  <span className="text-xs text-slate-500 font-mono">
                    {targetAssetForMaintenance.assetCode} • {targetAssetForMaintenance.assetName}
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

            <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Maintenance Type</label>
                <select
                  value={schedType}
                  onChange={(e) => setSchedType(e.target.value as any)}
                  className="w-full glass-input rounded-xl px-3 py-2"
                >
                  <option value="PREVENTIVE">PREVENTIVE</option>
                  <option value="CORRECTIVE">CORRECTIVE</option>
                  <option value="INSPECTION">INSPECTION</option>
                  <option value="EMERGENCY">EMERGENCY</option>
                </select>
              </div>

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
                <label className="font-semibold text-slate-700 block mb-1">Scope of Work *</label>
                <textarea
                  rows={3}
                  required
                  value={schedDesc}
                  onChange={(e) => setSchedDesc(e.target.value)}
                  className="w-full glass-input rounded-xl p-3"
                  placeholder="Describe inspection checklist, filter replacement, cleaning, etc."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md cursor-pointer"
                >
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. COMPLETE MAINTENANCE MODAL */}
      {showCompleteModal && activeTaskToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card rounded-2xl border border-slate-200 w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 font-outfit">Record Maintenance Completion</h3>
                  <span className="text-xs text-slate-500 font-mono">
                    {activeTaskToComplete.recordId} • {activeTaskToComplete.assetName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Work Done Summary *</label>
                <textarea
                  rows={3}
                  required
                  value={completeDesc}
                  onChange={(e) => setCompleteDesc(e.target.value)}
                  className="w-full glass-input rounded-xl p-3"
                  placeholder="Details of servicing, testing, calibration, or component repairs..."
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Parts Replaced (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Capacitor 45uF, Air filter mesh, HDMI connector"
                  value={completeParts}
                  onChange={(e) => setCompleteParts(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={completeCost}
                    onChange={(e) => setCompleteCost(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Condition After Service</label>
                  <select
                    value={completeCondition}
                    onChange={(e) => setCompleteCondition(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2"
                  >
                    <option value="EXCELLENT">EXCELLENT</option>
                    <option value="GOOD">GOOD</option>
                    <option value="FAIR">FAIR</option>
                    <option value="POOR">POOR</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium leading-relaxed">
                Recording completion automatically updates the asset's last maintenance timestamp, sets status to ACTIVE, and schedules the next maintenance cycle based on frequency!
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md cursor-pointer"
                >
                  Complete & Update Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
