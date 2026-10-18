import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import type { ICategory, IComplaint, IAsset } from '../../types/index';
import { 
  X, MapPin, Upload, AlertCircle, ThumbsUp, Check, Zap, Fan, 
  Droplets, Bath, Trash2, Armchair, DoorClosed, Tv, Wifi, 
  AlertTriangle, ShieldAlert, Camera, HelpCircle,
  ShieldCheck, Package
} from 'lucide-react';
import canvasConfetti from 'canvas-confetti';

const isVideoUrl = (url: string) => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext) || url.includes('/video/'));
};

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

interface NewComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewComplaintModal: React.FC<NewComplaintModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [categories, setCategories] = useState<ICategory[]>([]);

  // Form State
  const [buildingName, setBuildingName] = useState('');
  const [floor, setFloor] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [beforeImages, setBeforeImages] = useState<string[]>([]);
  
  // Anonymous Reporting State
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Campus Asset Linkage State
  const [availableAssets, setAvailableAssets] = useState<IAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Camera State & Refs
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Duplicate & Submission State
  const [duplicates, setDuplicates] = useState<IComplaint[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Camera start & capture logic
  const startCamera = async () => {
    try {
      setErrorMsg('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((e) => console.error('Camera play error', e));
        }
      }, 100);
    } catch (err: any) {
      console.warn('Direct webcam stream unavailable, prompting device camera input', err);
      mobileCameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopCamera();
      setIsUploading(true);
      setErrorMsg('');

      const file = new File([blob], `campus_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await api.post('/complaints/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.url) {
          setBeforeImages((prev) => [...prev, res.data.url]);
        }
      } catch (err: any) {
        console.error('Captured photo upload error', err);
        setErrorMsg(err.response?.data?.message || 'Failed to upload camera capture.');
      } finally {
        setIsUploading(false);
      }
    }, 'image/jpeg', 0.9);
  };

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/complaints/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (res.data && res.data.url) {
        setBeforeImages([...beforeImages, res.data.url]);
      }
    } catch (err: any) {
      console.error('File upload failed', err);
      setErrorMsg(err.response?.data?.message || 'Failed to upload file.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Icon mapping
  const getCategoryIcon = (name: string) => {
    if (name.includes('Women') || name.includes('SOS')) return <ShieldAlert className="h-5 w-5 text-rose-600 animate-pulse" />;
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
    if (name.toLowerCase().includes('other')) return <HelpCircle className="h-5 w-5 text-indigo-500" />;
    return <ShieldAlert className="h-5 w-5 text-red-400" />;
  };

  useEffect(() => {
    if (!isOpen) return;

    const fetchMasterData = async () => {
      try {
        const catRes = await api.get('/categories');
        const cats: ICategory[] = catRes.data.categories || [];
        
        // Ensure Women Safety & SOS is placed prominently first
        const womenSafetyCats = cats.filter((c) => /women|sos/i.test(c.name));
        const others = cats.filter((c) => c.name.toLowerCase().includes('other'));
        const normalCats = cats.filter((c) => !/women|sos/i.test(c.name) && !c.name.toLowerCase().includes('other'));
        
        let finalCats = [...womenSafetyCats, ...normalCats];
        if (others.length > 0) {
          finalCats.push(...others);
        } else {
          finalCats.push({
            _id: 'others_category',
            name: 'Others',
            description: 'Miscellaneous campus issue or other facilities',
            defaultDepartment: 'Civil & Furniture',
            defaultSLAHours: 24,
            icon: 'HelpCircle'
          } as any);
        }
        setCategories(finalCats);
      } catch (err) {
        console.error('Failed to load master data for complaint modal', err);
      }
    };
    fetchMasterData();
  }, [isOpen]);

  // Check duplicates and fetch assets when room changes
  useEffect(() => {
    if (!buildingName || !floor || !roomNumber) {
      setDuplicates([]);
      setAvailableAssets([]);
      setSelectedAssetId('');
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

    const fetchRoomAssets = async () => {
      setIsLoadingAssets(true);
      try {
        const res = await api.get('/assets', {
          params: { building: buildingName, floor, room: roomNumber, status: 'ACTIVE' },
        });
        setAvailableAssets(res.data.assets || []);
      } catch (err) {
        console.error('Failed to fetch room assets', err);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    checkDupes();
    fetchRoomAssets();
  }, [buildingName, floor, roomNumber, categoryId]);

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
        assetId: selectedAssetId || undefined,
        beforeImages: beforeImages.length > 0 ? beforeImages : [
          'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'
        ],
        isAnonymous,
        voiceTranscription: description,
      });

      canvasConfetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      onSuccess();
      onClose();
      setIsAnonymous(false);
      setSelectedAssetId('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const buildings = Object.keys(PREDEFINED_LOCATIONS);
  const floors = buildingName ? Object.keys(PREDEFINED_LOCATIONS[buildingName] || {}) : [];
  const rooms = buildingName && floor ? PREDEFINED_LOCATIONS[buildingName][floor] || [] : [];

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
          <button 
            onClick={() => { stopCamera(); onClose(); }} 
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
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

            {/* Optional Campus Asset Linkage */}
            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-700 font-semibold flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-indigo-500" />
                  Specific Campus Asset Involved (Optional)
                </span>
                {isLoadingAssets ? (
                  <span className="text-[10px] text-slate-400 font-medium animate-pulse">Scanning assets...</span>
                ) : availableAssets.length > 0 ? (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                    {availableAssets.length} asset(s) tagged in this room
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">None registered</span>
                )}
              </div>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                disabled={!roomNumber || availableAssets.length === 0}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs disabled:opacity-60"
              >
                <option value="" className="bg-white text-slate-800">
                  {roomNumber
                    ? availableAssets.length > 0
                      ? '-- Select Asset or Leave Empty for General Room Issue --'
                      : '-- No specific registered assets in this room (General Report) --'
                    : '-- Select room first to view registered assets --'}
                </option>
                {availableAssets.map((ast) => (
                  <option key={ast._id} value={ast._id} className="bg-white text-slate-800">
                    [{ast.assetCode}] {ast.assetName} • Condition: {ast.condition}
                  </option>
                ))}
              </select>
              {selectedAssetId && (
                <p className="text-[11px] text-indigo-600 mt-1.5 font-medium flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Complaint will be directly linked to this equipment for lifecycle maintenance tracking.
                </p>
              )}
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
                const isWomenSafetyCat = /women|sos/i.test(cat.name);
                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => {
                      setCategoryId(cat._id);
                      if (isWomenSafetyCat) {
                        setPriority('Urgent');
                        if (!title) setTitle(`Urgent Women Safety assistance needed in ${roomNumber || 'campus'}`);
                      } else {
                        if (!title) setTitle(`${cat.name} issue in ${roomNumber || 'room'}`);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? isWomenSafetyCat
                          ? 'bg-rose-50 border-rose-500 text-slate-800 shadow-md ring-2 ring-rose-500/30'
                          : 'bg-blue-50 border-blue-400 text-slate-800 shadow-md ring-2 ring-blue-500/20'
                        : isWomenSafetyCat
                        ? 'bg-rose-50/60 border-rose-200 text-rose-900 hover:border-rose-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-350 hover:text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      {getCategoryIcon(cat.name)}
                      {isSelected ? (
                        <Check className={`h-4 w-4 ${isWomenSafetyCat ? 'text-rose-600' : 'text-blue-600'}`} />
                      ) : isWomenSafetyCat ? (
                        <span className="text-[9px] font-extrabold uppercase bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded">
                          SOS
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <p className={`text-xs font-bold leading-tight ${isWomenSafetyCat ? 'text-rose-900' : ''}`}>{cat.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">{cat.defaultSLAHours}h SLA</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* HIGH-RISK / WOMEN SAFETY EMERGENCY MOBILE NOTIFICATION BANNER */}
          {(categories.find((c) => c._id === categoryId && /women|sos/i.test(c.name)) || priority === 'Urgent' || priority === 'High') && (
            <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 flex items-start gap-3 shadow-sm animate-in fade-in">
              <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs uppercase tracking-wide text-rose-800">
                    🚨 Emergency Mobile SMS Alert Protocol Active
                  </span>
                  <span className="bg-rose-200 text-rose-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-rose-300">
                    SMS NOTIFY HOD & COORDINATORS
                  </span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
                  Submitting this high-risk issue will automatically dispatch instant mobile SMS alerts with exact location details to the <strong>HOD & Safety Coordinators</strong> at <strong>99529112177</strong> and <strong>6382373918</strong> for rapid intervention.
                </p>
              </div>
            </div>
          )}

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
                className="w-full glass-input rounded-xl px-3 py-2 text-xs font-medium"
              >
                <option value="Low" className="bg-white text-slate-800">Low (Routine)</option>
                <option value="Medium" className="bg-white text-slate-800">Medium (Standard)</option>
                <option value="High" className="bg-white text-slate-800">High (Interrupting / Urgent Staff)</option>
                <option value="Urgent" className="bg-white text-slate-800">🚨 Urgent (Emergency / SMS Alert)</option>
              </select>
            </div>
          </div>

          {/* Detailed Problem Description */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span>Detailed Problem Description</span>
              <span className="text-[10px] text-slate-400 font-normal">(Required)</span>
            </label>

            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what is wrong, exact position in room, equipment affected, or any hazard..."
              className="w-full glass-input rounded-xl p-3 text-xs transition-colors"
              required
            />
          </div>

          {/* Image/Video & Camera Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-650 flex items-center gap-1.5 uppercase tracking-wider">
              <Camera className="h-3.5 w-3.5 text-blue-600" />
              Upload Photo / Take Photo (Optional Proof)
            </label>

            {/* Hidden fallback input for native camera hardware */}
            <input
              ref={mobileCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Live Camera Viewfinder Overlay when Camera is Activated */}
            {isCameraOpen ? (
              <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-700 text-white space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Live Camera Active</span>
                  </div>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-60 flex items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>

                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={isUploading}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/30 cursor-pointer"
                  >
                    <Camera className="h-4 w-4" />
                    {isUploading ? 'Saving...' : 'Capture Photo'}
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Native File Upload */}
                <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors bg-white/40 min-h-[95px] text-center">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <>
                      <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[11px] font-semibold text-blue-600">Uploading media...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-700">Click to Upload Photo / Video</span>
                      <span className="text-[10px] text-slate-400">Browse files from computer or gallery</span>
                    </>
                  )}
                </div>

                {/* Direct Camera Trigger */}
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={isUploading}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors bg-white/40 min-h-[95px] text-center w-full"
                >
                  <Camera className="h-5 w-5 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-700">Take Photo with Camera</span>
                  <span className="text-[10px] text-slate-400">Capture live issue snapshot instantly</span>
                </button>
              </div>
            )}

            {/* Preview of Uploaded / Captured Images */}
            {beforeImages.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {beforeImages.map((img, idx) => (
                  <div key={idx} className="relative group h-16 w-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    {isVideoUrl(img) ? (
                      <video src={img} className="h-full w-full object-cover" muted playsInline />
                    ) : (
                      <img src={img} alt="Before Preview" className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setBeforeImages(beforeImages.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-bold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* REPORTER IDENTITY PREFERENCE */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Reporter Identity
              </span>
              {isAnonymous && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>🔒</span> Anonymous Mode Active
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Show My Name */}
              <label
                onClick={() => setIsAnonymous(false)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  !isAnonymous
                    ? 'bg-blue-50/80 border-blue-400 text-slate-800 shadow-xs ring-2 ring-blue-400/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="reporterIdentity"
                  checked={!isAnonymous}
                  onChange={() => setIsAnonymous(false)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div>
                  <p className="text-xs font-bold text-slate-850">Show My Name</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Your official name and profile are visible to campus administration and staff.</p>
                </div>
              </label>

              {/* Option 2: Submit Anonymously */}
              <label
                onClick={() => setIsAnonymous(true)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  isAnonymous
                    ? 'bg-amber-50/90 border-amber-400 text-slate-800 shadow-xs ring-2 ring-amber-400/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="reporterIdentity"
                  checked={isAnonymous}
                  onChange={() => setIsAnonymous(true)}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <div>
                  <p className="text-xs font-bold text-slate-850 flex items-center gap-1.5">
                    <span>Submit Anonymously</span>
                    <span>🔒</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Your name, ID, and contact are protected and hidden from technicians and other users.</p>
                </div>
              </label>
            </div>

            {isAnonymous && (
              <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Privacy Protected:</strong> Technicians will see your ticket as <em>"Anonymous Reporter"</em>. Your account is still tracked internally for resolution updates.
                </span>
              </div>
            )}
          </div>

          {/* Submit CTA */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              {isAnonymous ? (
                <span className="flex items-center gap-1 text-amber-750 font-bold text-[11px]">
                  <span>🔒</span> Submitting as Anonymous Reporter
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Official Account Verified
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { stopCamera(); onClose(); }}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? 'Submitting Issue...' : isAnonymous ? 'Submit Anonymously 🔒' : 'Submit Complaint'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
