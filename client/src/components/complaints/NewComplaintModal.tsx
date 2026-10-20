import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../services/api';
import type { ICategory, IComplaint } from '../../types/index';
import { 
  X, MapPin, Upload, AlertCircle, Check, Zap, Fan, 
  Droplets, Bath, Trash2, Armchair, Tv, Wifi, 
  AlertTriangle, ShieldAlert, Camera, HelpCircle, Utensils, 
  Building2, Bus, Car, Home, Footprints, Trophy, FlaskConical,
  ShieldCheck
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

// 14 strict Building / Room category configurations as required
const BUILDING_CATEGORY_RULES: Array<{
  displayName: string;
  match: RegExp;
  fallbackMatch?: RegExp;
  defaultSLA: number;
  icon: string;
  isSOS?: boolean;
}> = [
  { displayName: 'Broken Benches & Desks', match: /bench|desk/i, defaultSLA: 48, icon: 'Armchair' },
  { displayName: 'Broken Lights', match: /light/i, fallbackMatch: /light/i, defaultSLA: 24, icon: 'Zap' },
  { displayName: 'Canteen & Food Quality', match: /canteen & food|food quality/i, fallbackMatch: /food|canteen/i, defaultSLA: 8, icon: 'Utensils' },
  { displayName: 'Civil Maintenance & Classroom Damage', match: /civil maintenance & classroom|classroom damage/i, fallbackMatch: /civil|classroom/i, defaultSLA: 24, icon: 'Building2' },
  { displayName: 'Cleaning & Sanitation', match: /cleaning & sanitation/i, fallbackMatch: /clean|sanitation|garbage/i, defaultSLA: 8, icon: 'Trash2' },
  { displayName: 'Electrical', match: /^electrical$/i, fallbackMatch: /electrical/i, defaultSLA: 24, icon: 'Zap' },
  { displayName: 'Electrical Hazards', match: /electrical hazard/i, fallbackMatch: /hazard/i, defaultSLA: 4, icon: 'AlertTriangle' },
  { displayName: 'Emergency & Safety Incidents', match: /emergency & safety incidents/i, fallbackMatch: /emergency/i, defaultSLA: 1, icon: 'ShieldAlert', isSOS: true },
  { displayName: 'Fan Issues', match: /fan/i, defaultSLA: 24, icon: 'Fan' },
  { displayName: 'Networking / Internet', match: /wifi & network|it & campus networking|internet \/ wi-fi/i, fallbackMatch: /wifi|network|internet/i, defaultSLA: 8, icon: 'Wifi' },
  { displayName: 'Plumbing & Water Supply', match: /plumbing & water supply/i, fallbackMatch: /plumbing|water/i, defaultSLA: 12, icon: 'Droplets' },
  { displayName: 'Projector & AV Issues', match: /projector & av/i, fallbackMatch: /projector|av/i, defaultSLA: 12, icon: 'Tv' },
  { displayName: 'Washroom Issues', match: /washroom/i, fallbackMatch: /toilet|restroom/i, defaultSLA: 12, icon: 'Bath' },
  { displayName: 'Other', match: /^others?$|^other$/i, fallbackMatch: /other/i, defaultSLA: 24, icon: 'HelpCircle' },
];

// Campus Facility / Zone category configurations matching all campus facilities
const CAMPUS_FACILITY_CATEGORY_RULES: Array<{
  displayName: string;
  match: RegExp;
  fallbackMatch?: RegExp;
  defaultSLA: number;
  icon: string;
  isSOS?: boolean;
}> = [
  { displayName: 'Women Safety & SOS', match: /women|sos/i, defaultSLA: 1, icon: 'ShieldAlert', isSOS: true },
  { displayName: 'Bus & Transport Incidents', match: /bus|transport/i, defaultSLA: 6, icon: 'Bus' },
  { displayName: 'Classroom Damage', match: /classroom damage|classroom|civil/i, defaultSLA: 48, icon: 'Building2' },
  { displayName: 'Electrical Maintenance', match: /electrical maintenance|^electrical$/i, fallbackMatch: /electrical/i, defaultSLA: 12, icon: 'Zap' },
  { displayName: 'Garbage & Overflow', match: /garbage & overflow|garbage|sanitation|clean/i, defaultSLA: 8, icon: 'Trash2' },
  { displayName: 'Hostel Facilities', match: /hostel/i, defaultSLA: 12, icon: 'Home' },
  { displayName: 'Internet / Wi-Fi', match: /wifi|network|internet/i, defaultSLA: 24, icon: 'Wifi' },
  { displayName: 'Laboratory Equipment & Research', match: /lab/i, defaultSLA: 18, icon: 'FlaskConical' },
  { displayName: 'Parking Issues', match: /parking|car/i, defaultSLA: 12, icon: 'Car' },
  { displayName: 'Road & Subway Issues', match: /road|subway|pathway/i, defaultSLA: 18, icon: 'Footprints' },
  { displayName: 'Safety Hazards', match: /safety hazards|hazard/i, defaultSLA: 4, icon: 'AlertTriangle', isSOS: true },
  { displayName: 'Ground & Sports Facilities', match: /sport|ground|gym/i, defaultSLA: 24, icon: 'Trophy' },
  { displayName: 'Water Supply & Plumbing', match: /water|plumbing|leak/i, defaultSLA: 12, icon: 'Droplets' },
];

interface DisplayCategory {
  _id: string;
  name: string;
  originalName: string;
  defaultSLAHours: number;
  subcategories: string[];
  isSOS?: boolean;
}

interface NewComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewComplaintModal: React.FC<NewComplaintModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [categories, setCategories] = useState<ICategory[]>([]);

  // Form State
  const [locationMode, setLocationMode] = useState<'BUILDING' | 'CAMPUS_ZONE'>('BUILDING');
  const [specificLocation, setSpecificLocation] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [floor, setFloor] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [incidentTimestamp, setIncidentTimestamp] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [beforeImages, setBeforeImages] = useState<string[]>([]);
  
  // Anonymous Reporting State
  const [isAnonymous, setIsAnonymous] = useState(false);

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
        }
      }, 100);
    } catch (err: any) {
      console.warn('Native getUserMedia failed, falling back to mobile camera input', err);
      if (mobileCameraInputRef.current) {
        mobileCameraInputRef.current.click();
      } else {
        setErrorMsg('Camera access unavailable. Please use the file upload option.');
      }
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
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        setIsUploading(true);
        const formData = new FormData();
        const photoFile = new File([blob], `live_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        formData.append('image', photoFile);

        try {
          const res = await api.post('/complaints/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const url = res.data.imageUrl || res.data.url;
          if (url) {
            setBeforeImages((prev) => [...prev, url]);
          }
          stopCamera();
        } catch (err: any) {
          console.error('Failed to upload captured photo', err);
          setErrorMsg(err.response?.data?.message || 'Failed to upload captured photo.');
        } finally {
          setIsUploading(false);
        }
      }, 'image/jpeg', 0.85);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg('');
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post('/complaints/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data.imageUrl || res.data.url;
      if (url) {
        setBeforeImages((prev) => [...prev, url]);
      }
    } catch (err: any) {
      console.error('File upload failed', err);
      setErrorMsg(err.response?.data?.message || 'Failed to upload file.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Modern category icon resolution
  const getCategoryIcon = (name: string) => {
    const key = name.toLowerCase();
    if (key.includes('women') || key.includes('sos')) return <ShieldAlert className="h-4.5 w-4.5 text-rose-600 animate-pulse shrink-0" />;
    if (key.includes('bus') || key.includes('transport')) return <Bus className="h-4.5 w-4.5 text-amber-500 shrink-0" />;
    if (key.includes('park') || key.includes('car') || key.includes('security')) return <Car className="h-4.5 w-4.5 text-blue-500 shrink-0" />;
    if (key.includes('hostel')) return <Home className="h-4.5 w-4.5 text-emerald-500 shrink-0" />;
    if (key.includes('road') || key.includes('subway') || key.includes('path')) return <Footprints className="h-4.5 w-4.5 text-orange-500 shrink-0" />;
    if (key.includes('sport') || key.includes('ground') || key.includes('gym')) return <Trophy className="h-4.5 w-4.5 text-yellow-500 shrink-0" />;
    if (key.includes('lab')) return <FlaskConical className="h-4.5 w-4.5 text-purple-500 shrink-0" />;
    if (key.includes('light')) return <Zap className="h-4.5 w-4.5 text-amber-400 shrink-0" />;
    if (key.includes('fan')) return <Fan className="h-4.5 w-4.5 text-blue-400 shrink-0" />;
    if (key.includes('water') || key.includes('leak') || key.includes('plumb')) return <Droplets className="h-4.5 w-4.5 text-cyan-400 shrink-0" />;
    if (key.includes('washroom') || key.includes('toilet') || key.includes('restroom')) return <Bath className="h-4.5 w-4.5 text-teal-400 shrink-0" />;
    if (key.includes('clean') || key.includes('sanitation') || key.includes('garbage')) return <Trash2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />;
    if (key.includes('bench') || key.includes('desk')) return <Armchair className="h-4.5 w-4.5 text-purple-400 shrink-0" />;
    if (key.includes('classroom') || key.includes('civil')) return <Building2 className="h-4.5 w-4.5 text-indigo-400 shrink-0" />;
    if (key.includes('canteen') || key.includes('food')) return <Utensils className="h-4.5 w-4.5 text-orange-400 shrink-0" />;
    if (key.includes('projector') || key.includes('av')) return <Tv className="h-4.5 w-4.5 text-rose-400 shrink-0" />;
    if (key.includes('wifi') || key.includes('network') || key.includes('internet')) return <Wifi className="h-4.5 w-4.5 text-sky-400 shrink-0" />;
    if (key.includes('hazard')) return <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0" />;
    if (key.includes('emergency')) return <ShieldAlert className="h-4.5 w-4.5 text-rose-600 shrink-0" />;
    if (key.includes('electrical')) return <Zap className="h-4.5 w-4.5 text-amber-500 shrink-0" />;
    if (key.includes('other')) return <HelpCircle className="h-4.5 w-4.5 text-indigo-500 shrink-0" />;
    return <AlertCircle className="h-4.5 w-4.5 text-slate-400 shrink-0" />;
  };

  // Fetch master data on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchMasterData = async () => {
      try {
        const catRes = await api.get('/categories');
        const cats: ICategory[] = catRes.data.categories || [];
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load master data for complaint modal', err);
      }
    };
    fetchMasterData();
  }, [isOpen]);

  // Section 3: 14 strict Building / Room categories
  const buildingCategories: DisplayCategory[] = useMemo(() => {
    const usedIds = new Set<string>();

    return BUILDING_CATEGORY_RULES.map((rule) => {
      let matched = categories.find((c) => !usedIds.has(c._id) && rule.match.test(c.name));
      if (!matched && rule.fallbackMatch) {
        matched = categories.find((c) => !usedIds.has(c._id) && rule.fallbackMatch!.test(c.name));
      }

      if (matched) {
        usedIds.add(matched._id);
        return {
          _id: matched._id,
          name: rule.displayName,
          originalName: matched.name,
          defaultSLAHours: matched.defaultSLAHours || rule.defaultSLA,
          subcategories: matched.subcategories || [],
          isSOS: rule.isSOS || false,
        };
      }

      // Safe fallback ensuring exactly 14 categories are always shown
      return {
        _id: `fallback_${rule.displayName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: rule.displayName,
        originalName: rule.displayName,
        defaultSLAHours: rule.defaultSLA,
        subcategories: [],
        isSOS: rule.isSOS || false,
      };
    });
  }, [categories]);

  // Section 4: Campus facility categories ensuring all required campus facilities are always available
  const campusFacilityCategories: DisplayCategory[] = useMemo(() => {
    const matchedCategoryIds = new Set<string>();

    const mapped: DisplayCategory[] = CAMPUS_FACILITY_CATEGORY_RULES.map((rule) => {
      let matched = categories.find((c) => !matchedCategoryIds.has(c._id) && rule.match.test(c.name));
      if (!matched && rule.fallbackMatch) {
        matched = categories.find((c) => !matchedCategoryIds.has(c._id) && rule.fallbackMatch!.test(c.name));
      }

      if (matched) {
        matchedCategoryIds.add(matched._id);
        return {
          _id: matched._id,
          name: rule.displayName,
          originalName: matched.name,
          defaultSLAHours: matched.defaultSLAHours || rule.defaultSLA,
          subcategories: matched.subcategories || [],
          isSOS: rule.isSOS || false,
        };
      }

      // Safe fallback ensuring category tile is immediately selectable
      return {
        _id: `facility_${rule.displayName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: rule.displayName,
        originalName: rule.displayName,
        defaultSLAHours: rule.defaultSLA,
        subcategories: [],
        isSOS: rule.isSOS || false,
      };
    });

    // Also include any extra custom categories from the backend database
    const extra = categories.filter((c) => !matchedCategoryIds.has(c._id));
    const extraMapped: DisplayCategory[] = extra.map((c) => ({
      _id: c._id,
      name: c.name,
      originalName: c.name,
      defaultSLAHours: c.defaultSLAHours || 12,
      subcategories: c.subcategories || [],
      isSOS: /women|sos|emergency/i.test(c.name),
    }));

    const fullList = [...mapped, ...extraMapped];
    const sosList = fullList.filter((c) => c.isSOS);
    const nonSosList = fullList.filter((c) => !c.isSOS);
    return [...sosList, ...nonSosList];
  }, [categories]);

  const activeCategories = locationMode === 'BUILDING' ? buildingCategories : campusFacilityCategories;

  // Mode switching resets fields to avoid stale values
  const handleSwitchMode = (mode: 'BUILDING' | 'CAMPUS_ZONE') => {
    if (mode === locationMode) return;
    setLocationMode(mode);
    setCategoryId('');
    setErrorMsg('');
    if (mode === 'BUILDING') {
      setSpecificLocation('');
    } else {
      setBuildingName('');
      setFloor('');
      setRoomNumber('');
    }
  };

  // Duplicate ticket check with debouncing for manually typed room numbers
  useEffect(() => {
    if (locationMode !== 'BUILDING' || !buildingName || !floor || !roomNumber.trim() || roomNumber.trim().length < 2) {
      setDuplicates([]);
      return;
    }

    const checkDupes = async () => {
      setIsCheckingDuplicates(true);
      try {
        const res = await api.get('/complaints/check-duplicate', {
          params: { buildingName, floor, roomNumber: roomNumber.trim(), categoryId },
        });
        setDuplicates(res.data.duplicates || []);
      } catch (err) {
        console.error('Failed to check duplicate complaints', err);
      } finally {
        setIsCheckingDuplicates(false);
      }
    };

    const timer = setTimeout(checkDupes, 400);
    return () => clearTimeout(timer);
  }, [buildingName, floor, roomNumber, categoryId, locationMode]);

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

  // Form submission with strict frontend validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (locationMode === 'BUILDING') {
      if (!buildingName.trim() || !floor.trim() || !roomNumber.trim()) {
        setErrorMsg('Please select a Building, enter a Floor, and enter a Room / Specific Spot.');
        return;
      }
    }

    if (!categoryId) {
      setErrorMsg('Please select an Issue Category.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Please enter an Issue Title.');
      return;
    }

    if (!incidentTimestamp) {
      setErrorMsg('Incident Time is mandatory. Please select the incident date and time.');
      return;
    }

    const parsedDate = new Date(incidentTimestamp);
    if (isNaN(parsedDate.getTime())) {
      setErrorMsg('Please enter a valid Incident Date and Time.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Detailed Problem Description is mandatory. Please describe what is wrong.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let payload: any;
      if (locationMode === 'CAMPUS_ZONE') {
        const specLoc = specificLocation.trim();
        const selectedCat = categories.find((c) => c._id === categoryId);
        const catName = selectedCat ? selectedCat.name : 'Campus Facility';
        const effBuilding = 'Campus Facility / Zone';
        const effFloor = 'N/A';
        const effRoom = specLoc || catName || 'Campus Premises';
        const effPath = specLoc ? `Campus Facility > ${specLoc}` : `Campus Facility > ${catName}`;

        payload = {
          title: title.trim(),
          description: description.trim(),
          categoryId,
          incidentTimestamp: parsedDate.toISOString(),
          locationPath: effPath,
          buildingName: effBuilding,
          floor: effFloor,
          roomNumber: effRoom,
          specificLocation: specLoc || undefined,
          priority,
          beforeImages: beforeImages.length > 0 ? beforeImages : [
            'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'
          ],
          isAnonymous,
          voiceTranscription: description.trim(),
        };
      } else {
        const effBuilding = buildingName.trim();
        const effFloor = floor.trim();
        const effRoom = roomNumber.trim();
        const effPath = `${effBuilding} > ${effFloor} > ${effRoom}`;

        payload = {
          title: title.trim(),
          description: description.trim(),
          categoryId,
          incidentTimestamp: parsedDate.toISOString(),
          locationPath: effPath,
          buildingName: effBuilding,
          floor: effFloor,
          roomNumber: effRoom,
          priority,
          beforeImages: beforeImages.length > 0 ? beforeImages : [
            'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'
          ],
          isAnonymous,
          voiceTranscription: description.trim(),
        };
      }

      await api.post('/complaints', payload);

      canvasConfetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      onSuccess();
      onClose();
      setIsAnonymous(false);
      setSpecificLocation('');
      setBuildingName('');
      setFloor('');
      setRoomNumber('');
      setCategoryId('');
      setIncidentTimestamp('');
      setTitle('');
      setDescription('');
      setBeforeImages([]);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const buildings = Object.keys(PREDEFINED_LOCATIONS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="glass-card rounded-2xl border border-slate-200 w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-4 sm:my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="h-8.5 w-8.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <AlertCircle className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-800 font-outfit">Report Campus Issue</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Fill in details to dispatch maintenance staff</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => { stopCamera(); onClose(); }} 
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Location Cascade Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-650 flex items-center gap-1.5 uppercase tracking-wider">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                1. Select Campus Location & Facility
              </label>

              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('BUILDING')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    locationMode === 'BUILDING'
                      ? 'bg-white text-blue-600 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Building / Room
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('CAMPUS_ZONE')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    locationMode === 'CAMPUS_ZONE'
                      ? 'bg-white text-indigo-600 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Campus Facility / Zone
                </button>
              </div>
            </div>

            {locationMode === 'CAMPUS_ZONE' ? (
              <div>
                <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                  Specific location (optional)
                </label>
                <input
                  type="text"
                  value={specificLocation}
                  onChange={(e) => setSpecificLocation(e.target.value)}
                  placeholder="e.g., Main Gate, Bus No. 12, Hostel Block A, Parking Area"
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Building Dropdown */}
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block mb-1">Building</span>
                  <select
                    value={buildingName}
                    onChange={(e) => {
                      setBuildingName(e.target.value);
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

                {/* Floor: Replaced with normal text input field */}
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block mb-1">Floor</span>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="Enter floor (e.g., Ground Floor, First Floor, 2nd Floor)"
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>

                {/* Room / Specific Spot: Replaced with normal text input field */}
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block mb-1">Room / Specific Spot</span>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="Enter room number or specific spot (e.g., Room 204)"
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>
              </div>
            )}
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
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-800">{dupe.ticketId}: {dupe.title}</span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">{dupe.status}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{dupe.description.slice(0, 70)}...</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpvoteDuplicate(dupe)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>👍 Upvote</span>
                      <span className="bg-amber-600/60 px-1 rounded text-[10px]">{(dupe.upvotes || []).length}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Category Selection Grid - 5 columns on desktop, responsive, compact cards */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-650 flex items-center gap-1.5 uppercase tracking-wider">
                2. Select Issue Category
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {locationMode === 'BUILDING' ? 'Building & Room Categories (14)' : 'Campus-Wide & Facility Categories'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-2.5">
              {activeCategories.map((cat) => {
                const isSelected = categoryId === cat._id;
                const isSOS = cat.isSOS;
                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => {
                      setCategoryId(cat._id);
                      if (isSOS) {
                        setPriority('Urgent');
                        if (!title) setTitle(`Urgent ${cat.name} assistance needed in ${roomNumber || 'campus'}`);
                      } else {
                        if (!title) setTitle(`${cat.name} issue in ${roomNumber || 'room'}`);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer min-h-[80px] sm:min-h-[84px] ${
                      isSelected
                        ? isSOS
                          ? 'bg-rose-50 border-rose-500 text-slate-900 shadow-sm ring-2 ring-rose-500/30'
                          : 'bg-blue-50 border-blue-500 text-slate-900 shadow-sm ring-2 ring-blue-500/20'
                        : isSOS
                        ? 'bg-rose-50/60 border-rose-200 text-rose-900 hover:border-rose-400'
                        : 'bg-slate-50 border-slate-200 text-slate-650 hover:border-slate-350 hover:text-slate-800 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      {getCategoryIcon(cat.name)}
                      {isSelected ? (
                        <Check className={`h-3.5 w-3.5 ${isSOS ? 'text-rose-600' : 'text-blue-600'}`} />
                      ) : isSOS ? (
                        <span className="text-[8.5px] font-extrabold uppercase bg-rose-200 text-rose-800 px-1 py-0.5 rounded leading-none">
                          SOS
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <p className={`text-[11px] sm:text-xs font-bold leading-tight line-clamp-2 ${isSOS ? 'text-rose-900' : 'text-slate-800'}`}>
                        {cat.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {cat.defaultSLAHours}h SLA
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* HIGH-RISK / WOMEN SAFETY EMERGENCY MOBILE NOTIFICATION BANNER */}
          {(() => {
            const selectedCat = activeCategories.find((c) => c._id === categoryId);
            if (selectedCat?.isSOS || priority === 'Urgent' || priority === 'High') {
              return (
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
                      Submitting this high-risk issue will automatically dispatch instant mobile SMS alerts with exact location details to the <strong>HOD & Safety Coordinators</strong> at <strong>9952912177</strong> and <strong>6382373918</strong> for rapid intervention.
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Title, Priority & Incident Timestamp */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-650 flex items-center gap-1 mb-1">
                <span>Issue Title</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
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

            {/* Section 6: Incident Time - Mandatory with visible asterisk */}
            <div>
              <label className="text-xs font-semibold text-slate-650 flex items-center gap-1 mb-1">
                <span>Incident Time</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="datetime-local"
                value={incidentTimestamp}
                onChange={(e) => setIncidentTimestamp(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                required
              />
            </div>
          </div>

          {/* Section 5: Detailed Problem Description - Mandatory with visible asterisk */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <span>Detailed Problem Description</span>
              <span className="text-rose-500 font-bold">*</span>
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

                {/* Instant Live Camera Activation */}
                <button
                  type="button"
                  onClick={startCamera}
                  className="border border-slate-200 hover:border-emerald-500/80 hover:bg-emerald-50/30 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors bg-white/40 min-h-[95px] text-center"
                >
                  <Camera className="h-5 w-5 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-700">Take Photo with Camera</span>
                  <span className="text-[10px] text-slate-400">Capture live issue snapshot instantly</span>
                </button>
              </div>
            )}

            {/* Media Preview Thumbnails */}
            {beforeImages.length > 0 && (
              <div className="flex gap-2 flex-wrap pt-2">
                {beforeImages.map((img, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 h-16 w-16 bg-slate-100 flex-shrink-0 shadow-xs">
                    {isVideoUrl(img) ? (
                      <video src={img} className="h-full w-full object-cover" />
                    ) : (
                      <img src={img} alt="Evidence preview" className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setBeforeImages(beforeImages.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* REPORTER IDENTITY SELECTION */}
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
