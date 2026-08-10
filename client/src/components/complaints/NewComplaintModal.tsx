import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { ICategory, IComplaint } from '../../types/index';
import { X, MapPin, Upload, AlertCircle, ThumbsUp, Check, Zap, Fan, Droplets, Bath, Trash2, Armchair, DoorClosed, Tv, Wifi, AlertTriangle, ShieldAlert } from 'lucide-react';
import canvasConfetti from 'canvas-confetti';

interface NewComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewComplaintModal: React.FC<NewComplaintModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [hierarchy, setHierarchy] = useState<Record<string, Record<string, string[]>>>({});

  // Form State
  const [buildingName, setBuildingName] = useState('');
  const [floor, setFloor] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [imageUrl, setImageUrl] = useState('');
  const [beforeImages, setBeforeImages] = useState<string[]>([]);

  // Duplicate state
  const [duplicates, setDuplicates] = useState<IComplaint[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Icon mapping
  const getCategoryIcon = (name: string) => {
    if (name.includes('Light')) return <Zap className="h-5 w-5 text-amber-400" />;
    if (name.includes('Fan')) return <Fan className="h-5 w-5 text-blue-400" />;
    if (name.includes('Water') || name.includes('Leak')) return <Droplets className="h-5 w-5 text-cyan-400" />;
    if (name.includes('Washroom')) return <Bath className="h-5 w-5 text-teal-400" />;
    if (name.includes('Garbage')) return <Trash2 className="h-5 w-5 text-emerald-400" />;
    if (name.includes('Bench')) return <Armchair className="h-5 w-5 text-purple-400" />;
    if (name.includes('Classroom')) return <DoorClosed className="h-5 w-5 text-indigo-400" />;
    if (name.includes('Projector')) return <Tv className="h-5 w-5 text-rose-400" />;
    if (name.includes('WiFi')) return <Wifi className="h-5 w-5 text-sky-400" />;
    if (name.includes('Electrical')) return <AlertTriangle className="h-5 w-5 text-orange-400" />;
    return <ShieldAlert className="h-5 w-5 text-red-400" />;
  };

  useEffect(() => {
    if (!isOpen) return;

    const fetchMasterData = async () => {
      try {
        const [catRes, locRes] = await Promise.all([
          api.get('/categories'),
          api.get('/locations'),
        ]);
        setCategories(catRes.data.categories || []);
        setHierarchy(locRes.data.hierarchy || {});
      } catch (err) {
        console.error('Failed to load master data for complaint modal', err);
      }
    };
    fetchMasterData();
  }, [isOpen]);

  // Check duplicates when room changes
  useEffect(() => {
    if (!buildingName || !floor || !roomNumber) {
      setDuplicates([]);
      return;
    }

    const checkDupes = async () => {
      setIsCheckingDuplicates(true);
      try {
        const res = await api.get('/complaints/check-duplicate', {
          params: { buildingName, floor, roomNumber, categoryId },
        });
        setDuplicates(res.data.duplicates || []);
      } catch (err) {
        console.error('Failed to check duplicate complaints', err);
      } finally {
        setIsCheckingDuplicates(false);
      }
    };

    checkDupes();
  }, [buildingName, floor, roomNumber, categoryId]);

  const handleAddImageUrl = () => {
    if (imageUrl.trim()) {
      setBeforeImages([...beforeImages, imageUrl.trim()]);
      setImageUrl('');
    }
  };

  const handleUpvoteDuplicate = async (comp: IComplaint) => {
    try {
      await api.post(`/complaints/${comp._id}/upvote`);
      canvasConfetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upvote duplicate.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !categoryId || !buildingName || !floor || !roomNumber) {
      setErrorMsg('Please fill in all mandatory fields (Location, Category, Title, Description).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await api.post('/complaints', {
        title,
        description,
        categoryId,
        buildingName,
        floor,
        roomNumber,
        priority,
        beforeImages: beforeImages.length > 0 ? beforeImages : [
          'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'
        ],
      });

      canvasConfetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const buildings = Object.keys(hierarchy);
  const floors = buildingName ? Object.keys(hierarchy[buildingName] || {}) : [];
  const rooms = buildingName && floor ? hierarchy[buildingName][floor] || [] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="glass-card rounded-2xl border border-slate-200 w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800 font-outfit">Report Campus Issue</h2>
              <p className="text-xs text-slate-500 font-medium">Fill in details to dispatch maintenance staff</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Location Cascade Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-650 flex items-center gap-1.5 uppercase tracking-wider">
              <MapPin className="h-3.5 w-3.5 text-rose-500" />
              1. Select Campus Location (Building → Floor → Room)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block mb-1">Building</span>
                <select
                  value={buildingName}
                  onChange={(e) => {
                    setBuildingName(e.target.value);
                    setFloor('');
                    setRoomNumber('');
                  }}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                  required
                >
                  <option value="" className="bg-white text-slate-800">Select Building...</option>
                  {buildings.map((b) => (
                    <option key={b} value={b} className="bg-white text-slate-800">{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 font-semibold block mb-1">Floor</span>
                <select
                  value={floor}
                  onChange={(e) => {
                    setFloor(e.target.value);
                    setRoomNumber('');
                  }}
                  disabled={!buildingName}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs disabled:opacity-50"
                  required
                >
                  <option value="" className="bg-white text-slate-800">Select Floor...</option>
                  {floors.map((f) => (
                    <option key={f} value={f} className="bg-white text-slate-800">{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 font-semibold block mb-1">Room / Specific Spot</span>
                <select
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  disabled={!floor}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs disabled:opacity-50"
                  required
                >
                  <option value="" className="bg-white text-slate-800">Select Room...</option>
                  {rooms.map((r) => (
                    <option key={r} value={r} className="bg-white text-slate-800">{r}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* DUPLICATE PREVENTION ALERT BANNER */}
          {isCheckingDuplicates ? (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2 font-medium">
              <div className="h-3.5 w-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Scanning room for active duplicate complaints...</span>
            </div>
          ) : duplicates.length > 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
                <AlertCircle className="h-4 w-4 animate-bounce" />
                <span>Duplicate Check: {duplicates.length} Active Issue(s) Already Reported in {roomNumber}!</span>
              </div>
              <p className="text-xs text-slate-650 font-medium leading-relaxed">
                To prevent duplicate tickets and accelerate repair, check if your issue is already listed below and click <strong>Upvote</strong>!
              </p>

              <div className="space-y-2">
                {duplicates.map((dupe) => (
                  <div key={dupe._id} className="p-3 rounded-lg bg-white border border-amber-200 flex items-center justify-between shadow-sm">
                    <div>
                      <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {dupe.ticketId}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 mt-1">{dupe.title}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">Status: {dupe.status} • Upvotes: {dupe.upvotes?.length || 0}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpvoteDuplicate(dupe)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-450 flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <ThumbsUp className="h-3.5 w-3.5 fill-current" />
                      Upvote & Join
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Category Selection Grid */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-650 flex items-center gap-1.5 uppercase tracking-wider">
              2. Select Issue Category
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {categories.map((cat) => {
                const isSelected = categoryId === cat._id;
                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => {
                      setCategoryId(cat._id);
                      if (!title) setTitle(`${cat.name} issue in ${roomNumber || 'room'}`);
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-blue-400 text-slate-800 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-350 hover:text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      {getCategoryIcon(cat.name)}
                      {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">{cat.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">{cat.defaultSLAHours}h SLA</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-650 block mb-1">Issue Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Ceiling Fan #2 not rotating"
                className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-650 block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs"
              >
                <option value="Low" className="bg-white text-slate-800">Low (Routine)</option>
                <option value="Medium" className="bg-white text-slate-800">Medium (Standard)</option>
                <option value="High" className="bg-white text-slate-800">High (Interrupting Class)</option>
                <option value="Urgent" className="bg-white text-slate-800">Urgent (Safety Hazard / Leak)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-650 block mb-1">Detailed Problem Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what is wrong, exact position in room, or any hazard..."
              className="w-full glass-input rounded-xl p-3 text-xs"
              required
            />
          </div>

          {/* Image Upload Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-650 flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5 text-blue-600" />
              Upload Before-Repair Image (Optional Photo Proof)
            </label>

            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste Image URL (Unsplash/Imgur/Cloudinary link)"
                className="flex-1 glass-input rounded-xl px-3.5 py-2 text-xs"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-3 py-2 bg-slate-100 text-blue-600 hover:bg-slate-200 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer"
              >
                Add URL
              </button>
            </div>

            {beforeImages.length > 0 && (
              <div className="flex items-center gap-2 pt-2">
                {beforeImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img src={img} alt="Before Preview" className="h-14 w-14 object-cover rounded-lg border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => setBeforeImages(beforeImages.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit CTA */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? 'Submitting Issue...' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
