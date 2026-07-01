import React, { useState, useCallback, useMemo } from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle,
  ClipboardList,
  Edit2,
  Eye,
  FileText,
  MapPin,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  Users,
  UserCheck,
  X,
} from 'lucide-react';
import { Athlete, SportType, User } from '../types';

type PlanType = '훈련' | '대회';
type VehicleType = '대형버스' | '중형버스' | '기타';
type DayPeriod = '오전' | '오후';

interface PlanAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

interface PlanParticipant {
  id: string;
  category: 'staff' | 'athlete';
  name: string;
  role: string;
  studentInfo: string;
}

const POSITION_ORDER: Record<string, number> = { GK: 1, DF: 2, MF: 3, FW: 4 };
const STAFF_ORDER: Record<string, number> = { 감독: 1, 필드코치: 2, 골키퍼코치: 3, 트레이너: 4 };

interface BudgetItem {
  id: string;
  category: '식비' | '숙박비' | '인건비' | '기타경비';
  amount: number;
  justification: string;
}

interface VehicleRequest {
  type: VehicleType;
  startDate: string;
  startPeriod: DayPeriod;
  startTime: string;
  endDate: string;
  endPeriod: DayPeriod;
  endTime: string;
}

interface TrainingPlan {
  id: string;
  sport: SportType;
  type: PlanType;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  purpose: string;
  participants: string;
  participantList: PlanParticipant[];
  manager: string;
  budgetItems: BudgetItem[];
  schedule: string;
  vehicleRequest: VehicleRequest;
  note: string;
  attachments: PlanAttachment[];
  createdBy: string;
  createdAt: string;
  approvalStatus?: 'pending' | 'approved';
  approvedBy?: string;
  approvedAt?: string;
}

const BUDGET_CATEGORIES: BudgetItem['category'][] = ['식비', '숙박비', '인건비', '기타경비'];
const VEHICLE_TYPES: VehicleType[] = ['대형버스', '중형버스', '기타'];
const DAY_PERIODS: DayPeriod[] = ['오전', '오후'];
const VEHICLE_HOUR_OPTIONS = Array.from({ length: 13 }, (_, hour) => String(hour).padStart(2, '0'));
const VEHICLE_MINUTE_OPTIONS = ['00', '30'];

const DEFAULT_VEHICLE_REQUEST: VehicleRequest = {
  type: '대형버스',
  startDate: '',
  startPeriod: '오전',
  startTime: '',
  endDate: '',
  endPeriod: '오후',
  endTime: '',
};

const TITLE_OPTIONS: Record<PlanType, string[]> = {
  훈련: ['자체 훈련', '전지 훈련'],
  대회: ['U-리그', '전국여자축구선수권대회', 'W코리아컵', '전국체육대회'],
};

interface TrainingPlanTabProps {
  activeSport: SportType;
  onSportChange: (sport: SportType) => void;
  currentUser: User;
  users: User[];
}

const sportLabel = (sport: SportType) => (sport === 'soccer' ? '여자축구부' : '양궁부');

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
};

const formatDateWithWeekday = (date: string) => {
  if (!date) return '';
  const parsedDate = new Date(`${date}T00:00:00`);
  const formattedDate = parsedDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const weekday = parsedDate.toLocaleDateString('ko-KR', { weekday: 'short' });
  return `${formattedDate}(${weekday})`;
};

const formatDateRangeWithWeekday = (startDate: string, endDate: string) => {
  const start = formatDateWithWeekday(startDate);
  const end = formatDateWithWeekday(endDate);
  if (!start && !end) return '-';
  return `${start || '-'} ~ ${end || '-'}`;
};

const toTwelveHourVehicleTime = (time: string, fallbackPeriod: DayPeriod) => {
  if (!time) return { period: fallbackPeriod, time: '' };

  const [hourText, minuteText = '00'] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return { period: fallbackPeriod, time };
  }

  const period: DayPeriod = hour >= 12 ? '오후' : '오전';
  const displayHour = hour > 12 ? hour - 12 : hour;
  const roundedMinute = minute >= 30 ? '30' : '00';
  return {
    period,
    time: `${String(displayHour).padStart(2, '0')}:${roundedMinute}`,
  };
};

const normalizeVehicleRequest = (vehicleRequest?: Partial<VehicleRequest>): VehicleRequest => {
  const merged = { ...DEFAULT_VEHICLE_REQUEST, ...(vehicleRequest || {}) };
  const start = vehicleRequest?.startPeriod
    ? { period: merged.startPeriod, time: merged.startTime }
    : toTwelveHourVehicleTime(merged.startTime, '오전');
  const end = vehicleRequest?.endPeriod
    ? { period: merged.endPeriod, time: merged.endTime }
    : toTwelveHourVehicleTime(merged.endTime, '오후');

  return {
    ...merged,
    startPeriod: start.period,
    startTime: start.time,
    endPeriod: end.period,
    endTime: end.time,
  };
};

const formatVehicleUsage = (vehicleRequest: VehicleRequest) => {
  const normalizedVehicleRequest = normalizeVehicleRequest(vehicleRequest);
  const start = [
    formatDateWithWeekday(normalizedVehicleRequest.startDate),
    normalizedVehicleRequest.startPeriod,
    normalizedVehicleRequest.startTime,
  ].filter(Boolean).join(' ');
  const end = [
    formatDateWithWeekday(normalizedVehicleRequest.endDate),
    normalizedVehicleRequest.endPeriod,
    normalizedVehicleRequest.endTime,
  ].filter(Boolean).join(' ');

  if (!start && !end) return '-';
  return `${start || '-'} ~ ${end || '-'}`;
};

export default function TrainingPlanTab({ activeSport, onSportChange, currentUser, users }: TrainingPlanTabProps) {
  const [plans, setPlans] = useState<TrainingPlan[]>([
    {
      id: 'tp_seed_1',
      sport: 'soccer',
      type: '훈련',
      title: '전지 훈련',
      startDate: '2026-07-15',
      endDate: '2026-07-19',
      location: '고려대학교 세종캠퍼스 운동장',
      purpose: '전술 조직력 강화 및 체력 보강',
      participants: '선수 22명, 지도자 3명',
      participantList: [],
      manager: '신우근',
      budgetItems: [
        { id: 'bi_1', category: '식비', amount: 500000, justification: '1인 1식 10,000원, 25명 5일' },
        { id: 'bi_2', category: '숙박비', amount: 375000, justification: '1인 15,000원, 25명 1박' },
        { id: 'bi_3', category: '인건비', amount: 0, justification: '' },
        { id: 'bi_4', category: '기타경비', amount: 375000, justification: '차량 대여 250,000원, 의료용품 125,000원' },
      ],
      schedule: '오전 체력 훈련 / 오후 전술 훈련 / 야간 회복 프로그램',
      vehicleRequest: {
        type: '대형버스',
        startDate: '2026-07-15',
        startPeriod: '오전',
        startTime: '08:00',
        endDate: '2026-07-19',
        endPeriod: '오후',
        endTime: '06:00',
      },
      note: '목업 데이터',
      attachments: [],
      createdBy: 'admin@ku.ac.kr',
      createdAt: '2026-06-29',
      approvalStatus: 'pending',
    },
    {
      id: 'tp_seed_2',
      sport: 'archery',
      type: '대회',
      title: '전국여자축구선수권대회',
      startDate: '2026-08-03',
      endDate: '2026-08-06',
      location: '예천 진호국제양궁장',
      purpose: '전국 대회 출전 및 경기력 점검',
      participants: '선수 8명, 지도자 2명',
      participantList: [],
      manager: '박지승',
      budgetItems: [
        { id: 'bi_5', category: '식비', amount: 300000, justification: '1인 1식 10,000원, 10명 4일' },
        { id: 'bi_6', category: '숙박비', amount: 400000, justification: '1인 50,000원, 10명 4박' },
        { id: 'bi_7', category: '인건비', amount: 0, justification: '' },
        { id: 'bi_8', category: '기타경비', amount: 280000, justification: '차량 렌트 200,000원, 참가비 80,000원' },
      ],
      schedule: '이동 및 공식 연습 / 예선전 / 본선전 / 복귀',
      vehicleRequest: {
        type: '중형버스',
        startDate: '2026-08-03',
        startPeriod: '오전',
        startTime: '09:00',
        endDate: '2026-08-06',
        endPeriod: '오후',
        endTime: '05:00',
      },
      note: '목업 데이터',
      attachments: [],
      createdBy: 'admin@ku.ac.kr',
      createdAt: '2026-06-29',
      approvalStatus: 'pending',
    },
  ]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [type, setType] = useState<PlanType>('훈련');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [manager, setManager] = useState(currentUser.name);
  const [schedule, setSchedule] = useState('');
  const [note, setNote] = useState('');
  const [vehicleRequest, setVehicleRequest] = useState<VehicleRequest>({ ...DEFAULT_VEHICLE_REQUEST });
  const [attachments, setAttachments] = useState<PlanAttachment[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([
    { id: 'bi_new_1', category: '식비', amount: 0, justification: '' },
    { id: 'bi_new_2', category: '숙박비', amount: 0, justification: '' },
    { id: 'bi_new_3', category: '인건비', amount: 0, justification: '' },
    { id: 'bi_new_4', category: '기타경비', amount: 0, justification: '' },
  ]);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingPlan, setEditingPlan] = useState<TrainingPlan | null>(null);
  const [viewingPlan, setViewingPlan] = useState<TrainingPlan | null>(null);
  const [participants, setParticipants] = useState<PlanParticipant[]>([]);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [registeredAthletes, setRegisteredAthletes] = useState<Athlete[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<string>>(new Set());
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(false);

  const filteredPlans = plans.filter((plan) => plan.sport === activeSport);
  const authorName = useMemo(() => {
    const director = users.find((user) => user.role === 'director' && user.sport === activeSport);
    return director?.name || `${sportLabel(activeSport)} 감독`;
  }, [activeSport, users]);
  const canApprove = currentUser.role === 'professor';

  const budgetTotal = budgetItems.reduce((sum, item) => sum + item.amount, 0);

  const soccerPlanCount = plans.filter((p) => p.sport === 'soccer').length;
  const archeryPlanCount = plans.filter((p) => p.sport === 'archery').length;

  const handleSportTabChange = (sport: SportType) => {
    if (sport === activeSport) return;
    onSportChange(sport);
    setIsFormOpen(false);
    resetForm();
  };

  const openEditForm = (plan: TrainingPlan) => {
    setType(plan.type);
    setTitle(plan.title);
    setStartDate(plan.startDate);
    setEndDate(plan.endDate);
    setLocation(plan.location);
    setPurpose(plan.purpose);
    setParticipants(plan.participantList || []);
    setManager(plan.manager);
    setBudgetItems(plan.budgetItems.map((item) => ({ ...item })));
    setSchedule(plan.schedule);
    setNote(plan.note);
    setVehicleRequest(normalizeVehicleRequest(plan.vehicleRequest || DEFAULT_VEHICLE_REQUEST));
    setAttachments(plan.attachments);
    setErrorMsg('');
    setEditingPlan(plan);
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setType('훈련');
    setTitle('');
    setStartDate('');
    setEndDate('');
    setLocation('');
    setPurpose('');
    setParticipants([]);
    setManager(currentUser.name);
    setBudgetItems([
      { id: 'bi_new_1', category: '식비', amount: 0, justification: '' },
      { id: 'bi_new_2', category: '숙박비', amount: 0, justification: '' },
      { id: 'bi_new_3', category: '인건비', amount: 0, justification: '' },
      { id: 'bi_new_4', category: '기타경비', amount: 0, justification: '' },
    ]);
    setSchedule('');
    setNote('');
    setVehicleRequest({ ...DEFAULT_VEHICLE_REQUEST });
    setAttachments([]);
    setErrorMsg('');
    setEditingPlan(null);
  };

  const handleAttachmentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []) as File[];
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newAttachment: PlanAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl: reader.result as string,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  };

  const handleBudgetItemChange = (id: string, field: keyof BudgetItem, value: string) => {
    if (field === 'amount') {
      const raw = value.replace(/[^0-9]/g, '');
      setBudgetItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, amount: raw ? Number(raw) : 0 } : item
        )
      );
    } else {
      setBudgetItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        )
      );
    }
  };

  const handleVehicleRequestChange = <K extends keyof VehicleRequest>(field: K, value: VehicleRequest[K]) => {
    setVehicleRequest((prev) => ({ ...prev, [field]: value }));
  };

  const handleVehicleTimePartChange = (
    field: 'startTime' | 'endTime',
    part: 'hour' | 'minute',
    value: string
  ) => {
    setVehicleRequest((prev) => {
      const [currentHour = '', currentMinute = ''] = prev[field].split(':');
      const nextHour = part === 'hour' ? value : currentHour;
      const nextMinute = part === 'minute' ? value : currentMinute;
      return {
        ...prev,
        [field]: nextHour || nextMinute ? `${nextHour || '00'}:${nextMinute || '00'}` : '',
      };
    });
  };

  const openParticipantModal = async () => {
    setIsLoadingRegistry(true);
    setRegisteredUsers([]);
    setRegisteredAthletes([]);
    try {
      const [uRes, aRes] = await Promise.all([
        fetch('/api/users'),
        fetch(`/api/athletes?sport=${activeSport}`),
      ]);
      if (uRes.ok) {
        const users: User[] = await uRes.json();
        setRegisteredUsers(
          users.filter((u) => (u.role === 'director' || u.role === 'coach') && u.sport === activeSport)
        );
      }
      if (aRes.ok) {
        const athletes: Athlete[] = await aRes.json();
        setRegisteredAthletes(athletes.filter((a) => a.sport === activeSport && a.status === '재학'));
      }
    } catch {
      setRegisteredUsers([]);
      setRegisteredAthletes([]);
    } finally {
      setIsLoadingRegistry(false);
    }
    const currentIds = new Set(participants.map((p) => p.id));
    setSelectedParticipantIds(currentIds);
    setShowParticipantModal(true);
  };

  const toggleSelectParticipant = (id: string) => {
    setSelectedParticipantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelectedParticipants = () => {
    const nextParticipants: PlanParticipant[] = [];

    registeredUsers.forEach((u) => {
      const pid = `p_usr_${u.id}`;
      if (selectedParticipantIds.has(pid)) {
        nextParticipants.push({
          id: pid,
          category: 'staff',
          name: u.name,
          role: u.role === 'director' ? '감독' : '코치',
          studentInfo: '',
        });
      }
    });

    registeredAthletes.forEach((a) => {
      const pid = `p_ath_${a.id}`;
      if (selectedParticipantIds.has(pid)) {
        const posShort = a.positionOrEvent.startsWith('GK') ? 'GK' : a.positionOrEvent.startsWith('DF') ? 'DF' : a.positionOrEvent.startsWith('MF') ? 'MF' : 'FW';
        nextParticipants.push({
          id: pid,
          category: 'athlete',
          name: a.name,
          role: posShort,
          studentInfo: a.studentId,
        });
      }
    });

    setParticipants(sortParticipants(nextParticipants));
    setShowParticipantModal(false);
  };

  const selectAllParticipants = () => {
    const allIds = new Set<string>();
    registeredUsers.forEach((u) => allIds.add(`p_usr_${u.id}`));
    registeredAthletes.forEach((a) => allIds.add(`p_ath_${a.id}`));
    setSelectedParticipantIds(allIds);
  };

  const deselectAllParticipants = () => {
    setSelectedParticipantIds(new Set());
  };

  const removeParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const sortParticipants = useCallback((list: PlanParticipant[]) => {
    return [...list].sort((a, b) => {
      if (a.category !== b.category) return a.category === 'staff' ? -1 : 1;
      if (a.category === 'staff') {
        return (STAFF_ORDER[a.role] || 99) - (STAFF_ORDER[b.role] || 99);
      }
      const posDiff = (POSITION_ORDER[a.role] || 99) - (POSITION_ORDER[b.role] || 99);
      if (posDiff !== 0) return posDiff;
      return a.studentInfo.localeCompare(b.studentInfo);
    });
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!title) return setErrorMsg('계획서 제목을 선택해주세요.');
    if (!startDate || !endDate) return setErrorMsg('참가 기간을 입력해주세요.');
    if (!location.trim()) return setErrorMsg('장소를 입력해주세요.');
    if (!purpose.trim()) return setErrorMsg('참가 목적을 입력해주세요.');
    if (participants.length === 0) return setErrorMsg('참가 인원을 추가해주세요.');

    if (editingPlan) {
      const sortedParticipants = sortParticipants(participants);
      const participantsStr = `${sortedParticipants.length}명`;
      const updatedPlan: TrainingPlan = {
        ...editingPlan,
        type,
        title: title.trim(),
        startDate,
        endDate,
        location: location.trim(),
        purpose: purpose.trim(),
        participants: participantsStr,
        participantList: sortedParticipants,
        manager: authorName,
        budgetItems,
        schedule: schedule.trim(),
        vehicleRequest,
        note: note.trim(),
        attachments,
      };
      setPlans((prev) => prev.map((p) => (p.id === editingPlan.id ? updatedPlan : p)));
      resetForm();
      setIsFormOpen(false);
      return;
    }

    const sortedParticipants = sortParticipants(participants);
    const participantsStr = `${sortedParticipants.length}명`;
    const newPlan: TrainingPlan = {
      id: `tp_${Date.now()}`,
      sport: activeSport,
      type,
      title: title.trim(),
      startDate,
      endDate,
      location: location.trim(),
      purpose: purpose.trim(),
      participants: participantsStr,
      participantList: sortedParticipants,
      manager: authorName,
      budgetItems,
      schedule: schedule.trim(),
      vehicleRequest,
      note: note.trim(),
      attachments,
      approvalStatus: 'pending',
      createdBy: currentUser.email,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setPlans((prev) => [newPlan, ...prev]);
    resetForm();
    setIsFormOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('해당 참가 계획서를 삭제하시겠습니까?')) {
      setPlans((prev) => prev.filter((plan) => plan.id !== id));
    }
  };

  const handleApprovePlan = (plan: TrainingPlan) => {
    if (!canApprove) return;
    const approvedPlan: TrainingPlan = {
      ...plan,
      approvalStatus: 'approved',
      approvedBy: currentUser.name,
      approvedAt: new Date().toISOString(),
    };
    setPlans((prev) => prev.map((item) => (item.id === plan.id ? approvedPlan : item)));
    setViewingPlan(approvedPlan);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSportTabChange('soccer')}
            className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-left transition-all cursor-pointer ${
              activeSport === 'soccer'
                ? 'bg-crimson-700 text-white shadow-sm'
                : 'bg-gray-50 text-gray-700 hover:bg-crimson-50 hover:text-crimson-900'
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-base">⚽</span>
              <span className="text-sm font-bold truncate">여자축구부</span>
            </span>
            <span className={`text-xs font-mono px-2 py-1 rounded-full ${
              activeSport === 'soccer' ? 'bg-white/20 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}>
              {soccerPlanCount}건
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSportTabChange('archery')}
            className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-left transition-all cursor-pointer ${
              activeSport === 'archery'
                ? 'bg-crimson-700 text-white shadow-sm'
                : 'bg-gray-50 text-gray-700 hover:bg-crimson-50 hover:text-crimson-900'
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-base">🏹</span>
              <span className="text-sm font-bold truncate">양궁부</span>
            </span>
            <span className={`text-xs font-mono px-2 py-1 rounded-full ${
              activeSport === 'archery' ? 'bg-white/20 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}>
              {archeryPlanCount}건
            </span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 font-display">
            <ClipboardList className="w-5 h-5 text-crimson-700" />
            <span>외부훈련(대회) 참가 계획서</span>
          </h2>
          <p className="text-xs text-gray-500">
            {sportLabel(activeSport)}의 외부 훈련 및 대회 참가 계획을 작성하고 목록으로 확인합니다.
          </p>
        </div>
        {!isFormOpen && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
            className="flex items-center gap-1 bg-crimson-700 hover:bg-crimson-800 text-white text-xs px-3 py-2 rounded-lg font-medium shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>계획서 작성</span>
          </button>
        )}
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">{editingPlan ? '참가 계획서 수정' : '참가 계획서 입력 양식'}</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">기본 정보, 참가 목적, 일정, 예산, 붙임 파일을 입력합니다.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsFormOpen(false);
              }}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">종목</label>
              <input type="text" value={sportLabel(activeSport)} disabled className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 text-gray-600 font-medium" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">구분</label>
              <select value={type} onChange={(event) => setType(event.target.value as PlanType)} className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600">
                <option value="훈련">훈련</option>
                <option value="대회">대회</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">시작일</label>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">종료일</label>
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">훈련(대회)명</label>
              <select value={title} onChange={(event) => setTitle(event.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600">
                <option value="">훈련(대회)명을 선택해주세요.</option>
                {TITLE_OPTIONS[type].map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">장소</label>
              <input type="text" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="예: 예천 진호국제양궁장" className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600" />
            </div>
            <div className="text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-gray-700">훈련(대회) 참가 인원</label>
                {participants.length > 0 && (
                  <span className="text-[11px] text-gray-500 font-mono">{participants.length}명</span>
                )}
              </div>
              <button
                type="button"
                onClick={openParticipantModal}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-center hover:border-crimson-300 hover:bg-crimson-50/40 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-crimson-700" />
                <span className="font-semibold text-gray-800 text-xs">등록 지도자 및 선수 불러오기</span>
              </button>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">작성자</label>
              <input type="text" value={authorName} disabled className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 text-gray-600 font-medium" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">참가 목적 및 내용</label>
              <textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={4} placeholder="훈련 또는 대회 참가 목적 및 내용을 입력해주세요." className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">세부 일정</label>
              <textarea value={schedule} onChange={(event) => setSchedule(event.target.value)} rows={4} placeholder="예: 1일차 이동 및 공식훈련 / 2일차 예선전" className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600" />
            </div>
          </div>

          <div className="text-xs space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-700">소요 예산</label>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 w-[24%]">항목</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600 w-[28%]">금액</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 w-[48%]">산출 근거</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {budgetItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-1.5">
                          <select
                            value={item.category}
                            onChange={(e) => handleBudgetItemChange(item.id, 'category', e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
                          >
                            {BUDGET_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            value={item.amount > 0 ? item.amount.toLocaleString() : ''}
                            onChange={(e) => handleBudgetItemChange(item.id, 'amount', e.target.value)}
                            placeholder="0"
                            className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 font-mono text-right focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            value={item.justification}
                            onChange={(e) => handleBudgetItemChange(item.id, 'justification', e.target.value)}
                            placeholder="산출 근거를 입력해주세요"
                            className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-3 py-2 text-gray-700">합계</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-900">{budgetTotal.toLocaleString()}원</td>
                      <td className="px-3 py-2 text-gray-400" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-xs space-y-2">
              <label className="block text-[11px] font-semibold text-gray-700">차량 신청</label>
              <div className="grid grid-cols-1 xl:grid-cols-[180px_1fr] gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">차량 종류</label>
                  <select
                    value={vehicleRequest.type}
                    onChange={(event) => handleVehicleRequestChange('type', event.target.value as VehicleType)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
                  >
                    {VEHICLE_TYPES.map((vehicleType) => (
                      <option key={vehicleType} value={vehicleType}>{vehicleType}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">사용 기간</label>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_86px_76px_auto_1fr_80px_86px_76px] gap-2 items-start">
                    <div>
                      <input
                        type="date"
                        value={vehicleRequest.startDate}
                        onChange={(event) => handleVehicleRequestChange('startDate', event.target.value)}
                        aria-label="차량 사용 기간 시작 날짜"
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
                      />
                      <div className="mt-1 min-h-4 text-[11px] text-gray-500">{formatDateWithWeekday(vehicleRequest.startDate)}</div>
                    </div>
                    <select
                      value={vehicleRequest.startPeriod}
                      onChange={(event) => handleVehicleRequestChange('startPeriod', event.target.value as DayPeriod)}
                      aria-label="차량 사용 기간 시작 오전 오후"
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
                    >
                      {DAY_PERIODS.map((period) => (
                        <option key={period} value={period}>{period}</option>
                      ))}
                    </select>
                    <select
                      value={vehicleRequest.startTime.split(':')[0] || ''}
                      onChange={(event) => handleVehicleTimePartChange('startTime', 'hour', event.target.value)}
                      aria-label="차량 사용 기간 시작 시간"
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
                    >
                      <option value="">시간</option>
                      {VEHICLE_HOUR_OPTIONS.map((hour) => (
                        <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                    <select
                      value={vehicleRequest.startTime.split(':')[1] || ''}
                      onChange={(event) => handleVehicleTimePartChange('startTime', 'minute', event.target.value)}
                      aria-label="차량 사용 기간 시작 분"
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
                    >
                      <option value="">분</option>
                      {VEHICLE_MINUTE_OPTIONS.map((minute) => (
                        <option key={minute} value={minute}>{minute}</option>
                      ))}
                    </select>
                    <div className="hidden md:flex h-9 items-center justify-center text-gray-400">~</div>
                    <div>
                      <input
                        type="date"
                        value={vehicleRequest.endDate}
                        onChange={(event) => handleVehicleRequestChange('endDate', event.target.value)}
                        aria-label="차량 사용 기간 종료 날짜"
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
                      />
                      <div className="mt-1 min-h-4 text-[11px] text-gray-500">{formatDateWithWeekday(vehicleRequest.endDate)}</div>
                    </div>
                    <select
                      value={vehicleRequest.endPeriod}
                      onChange={(event) => handleVehicleRequestChange('endPeriod', event.target.value as DayPeriod)}
                      aria-label="차량 사용 기간 종료 오전 오후"
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
                    >
                      {DAY_PERIODS.map((period) => (
                        <option key={period} value={period}>{period}</option>
                      ))}
                    </select>
                    <select
                      value={vehicleRequest.endTime.split(':')[0] || ''}
                      onChange={(event) => handleVehicleTimePartChange('endTime', 'hour', event.target.value)}
                      aria-label="차량 사용 기간 종료 시간"
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
                    >
                      <option value="">시간</option>
                      {VEHICLE_HOUR_OPTIONS.map((hour) => (
                        <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                    <select
                      value={vehicleRequest.endTime.split(':')[1] || ''}
                      onChange={(event) => handleVehicleTimePartChange('endTime', 'minute', event.target.value)}
                      aria-label="차량 사용 기간 종료 분"
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
                    >
                      <option value="">분</option>
                      {VEHICLE_MINUTE_OPTIONS.map((minute) => (
                        <option key={minute} value={minute}>{minute}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">비고</label>
                <input type="text" value={note} onChange={(event) => setNote(event.target.value)} placeholder="추가 안내 사항" className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600" />
              </div>
            </div>

          {participants.length > 0 && (
            <div className="text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-gray-700">참가자 명단</label>
                <span className="text-[11px] text-gray-500 font-mono">{participants.length}명</span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 max-h-56 overflow-y-auto">
                {sortParticipants(participants).map((p, index) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-[11px] text-gray-400 font-mono shrink-0">{index + 1}</span>
                      <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-xs font-medium text-gray-800 truncate">{p.name}</span>
                      <span className="text-[11px] text-gray-500 shrink-0">{p.role}</span>
                      {p.studentInfo && (
                        <span className="text-[11px] text-gray-400 font-mono shrink-0">{p.studentInfo}</span>
                      )}
                    </div>
                    <button type="button" onClick={() => removeParticipant(p.id)} className="text-gray-400 hover:text-red-600 cursor-pointer" title="삭제">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs space-y-2">
            <label className="block text-[11px] font-semibold text-gray-700">붙임 파일</label>
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center hover:border-crimson-300 hover:bg-crimson-50/40 cursor-pointer">
              <Upload className="w-5 h-5 text-crimson-700" />
              <span className="font-semibold text-gray-800">파일 선택 또는 업로드</span>
              <span className="text-[11px] text-gray-500">PDF, HWP, Word, Excel, 이미지 파일을 여러 개 첨부할 수 있습니다.</span>
              <input
                type="file"
                multiple
                accept=".pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
                onChange={handleAttachmentUpload}
                className="hidden"
              />
            </label>

            {attachments.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="font-medium text-gray-800 truncate">{attachment.name}</span>
                      <span className="text-[11px] text-gray-400 shrink-0">{formatFileSize(attachment.size)}</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveAttachment(attachment.id)} className="text-gray-400 hover:text-red-600 cursor-pointer" title="첨부 삭제">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {errorMsg && <div className="text-xs text-red-600 font-medium">{errorMsg}</div>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsFormOpen(false);
              }}
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs px-3 py-2 rounded-lg cursor-pointer"
            >
              취소
            </button>
            <button type="submit" className="bg-crimson-700 hover:bg-crimson-800 text-white text-xs px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-1 cursor-pointer">
              <Check className="w-3.5 h-3.5" />
              <span>저장</span>
            </button>
          </div>

          {showParticipantModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                  <span className="text-sm font-bold text-gray-900">등록 지도자 및 선수 명단</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={selectAllParticipants} className="text-[11px] text-crimson-700 hover:text-crimson-800 font-semibold cursor-pointer">전체 선택</button>
                    <button type="button" onClick={deselectAllParticipants} className="text-[11px] text-gray-500 hover:text-gray-700 cursor-pointer">선택 해제</button>
                    <button type="button" onClick={() => setShowParticipantModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4 text-xs">
                  {isLoadingRegistry ? (
                    <div className="text-center py-8 text-gray-400">데이터를 불러오는 중...</div>
                  ) : (
                    <>
                      {registeredUsers.length > 0 && (
                        <div>
                          <div className="font-semibold text-gray-700 mb-1.5">지도자</div>
                          <div className="space-y-1">
                            {registeredUsers
                              .sort((a, b) => {
                                const order: Record<string, number> = { director: 1, coach: 2 };
                                return (order[a.role] || 99) - (order[b.role] || 99);
                              })
                              .map((u) => {
                                const pid = `p_usr_${u.id}`;
                                const checked = selectedParticipantIds.has(pid);
                                return (
                                  <label key={pid} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input type="checkbox" checked={checked} onChange={() => toggleSelectParticipant(pid)} className="accent-crimson-700" />
                                    <span className="font-medium text-gray-800">{u.name}</span>
                                    <span className="text-gray-500">{u.role === 'director' ? '감독' : '코치'}</span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      )}
                      {registeredAthletes.length > 0 && (
                        <div>
                          <div className="font-semibold text-gray-700 mb-1.5">선수</div>
                          <div className="space-y-1">
                            {registeredAthletes
                              .sort((a, b) => {
                                const getPos = (pos: string) => pos.startsWith('GK') ? 1 : pos.startsWith('DF') ? 2 : pos.startsWith('MF') ? 3 : 4;
                                const diff = getPos(a.positionOrEvent) - getPos(b.positionOrEvent);
                                if (diff !== 0) return diff;
                                return a.studentId.localeCompare(b.studentId);
                              })
                              .map((a) => {
                                const pid = `p_ath_${a.id}`;
                                const checked = selectedParticipantIds.has(pid);
                                return (
                                  <label key={pid} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input type="checkbox" checked={checked} onChange={() => toggleSelectParticipant(pid)} className="accent-crimson-700" />
                                    <span className="font-medium text-gray-800">{a.name}</span>
                                    <span className="text-gray-500">{a.positionOrEvent}</span>
                                    <span className="text-gray-400 font-mono">{a.studentId}</span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200">
                  <button type="button" onClick={() => setShowParticipantModal(false)} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs px-3 py-2 rounded-lg cursor-pointer">취소</button>
                  <button type="button" onClick={addSelectedParticipants} className="bg-crimson-700 hover:bg-crimson-800 text-white text-xs px-4 py-2 rounded-lg font-medium cursor-pointer">선택 완료</button>
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">목록</span>
          <span className="text-xs text-gray-500 font-mono">{filteredPlans.length}건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] table-fixed text-xs">
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[22%]" />
              <col className="w-[14%]" />
              <col className="w-[15%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[9%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">구분</th>
                <th className="px-3 py-2 text-left font-semibold">제목</th>
                <th className="px-3 py-2 text-left font-semibold">기간</th>
                <th className="px-3 py-2 text-left font-semibold">장소</th>
                <th className="px-3 py-2 text-left font-semibold">참가 인원</th>
                <th className="px-3 py-2 text-right font-semibold">소요 예산</th>
                <th className="px-3 py-2 text-center font-semibold">붙임</th>
                <th className="px-3 py-2 text-center font-semibold">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-gray-400">
                    등록된 참가 계획서가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50 align-top">
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center rounded-full bg-crimson-50 px-2 py-1 text-[11px] font-bold text-crimson-700">
                        {plan.type}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-bold text-gray-900 truncate">{plan.title}</div>
                      <div className="text-[11px] text-gray-500 truncate">{plan.purpose}</div>
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatDateWithWeekday(plan.startDate)}</span>
                      </div>
                      <div className="pl-4 text-gray-500">{formatDateWithWeekday(plan.endDate)}</div>
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      <div className="flex items-center gap-1 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{plan.location}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      <div className="flex items-center gap-1 min-w-0">
                        <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{plan.participants}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-gray-900">
                      {plan.budgetItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}원
                    </td>
                    <td className="px-3 py-3 text-center">
                      {plan.attachments.length > 0 ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700" title={plan.attachments.map((attachment) => attachment.name).join('\n')}>
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>{plan.attachments.length}개</span>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => setViewingPlan(plan)} className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:border-crimson-200 hover:bg-crimson-50 hover:text-crimson-700 cursor-pointer" title="보기">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => openEditForm(plan)} className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 cursor-pointer" title="수정">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDelete(plan.id)} className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 cursor-pointer" title="삭제">
                          <Trash2 className="w-3.5 h-3.5" />
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

      {viewingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[86vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-base font-bold text-gray-900">외부훈련(대회) 참가 계획서</h3>
                <p className="text-xs text-gray-500 mt-0.5">{sportLabel(viewingPlan.sport)} · {viewingPlan.title}</p>
              </div>
              <button type="button" onClick={() => setViewingPlan(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-[11px] font-semibold text-gray-500">종목</div>
                  <div className="mt-1 font-bold text-gray-900">{sportLabel(viewingPlan.sport)}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-[11px] font-semibold text-gray-500">구분</div>
                  <div className="mt-1 font-bold text-gray-900">{viewingPlan.type}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-[11px] font-semibold text-gray-500">작성자</div>
                  <div className="mt-1 font-bold text-gray-900">{viewingPlan.manager}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-[11px] font-semibold text-gray-500">결재 상태</div>
                  <div className={`mt-1 font-bold ${viewingPlan.approvalStatus === 'approved' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {viewingPlan.approvalStatus === 'approved' ? '결재 완료' : '결재 대기'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-[11px] font-semibold text-gray-500">기간</div>
                  <div className="mt-1 font-mono text-gray-900">{formatDateRangeWithWeekday(viewingPlan.startDate, viewingPlan.endDate)}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-[11px] font-semibold text-gray-500">장소</div>
                  <div className="mt-1 text-gray-900">{viewingPlan.location}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-[11px] font-semibold text-gray-500">참가 목적 및 내용</div>
                  <div className="mt-1 whitespace-pre-wrap text-gray-900 leading-relaxed">{viewingPlan.purpose}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-[11px] font-semibold text-gray-500">세부 일정</div>
                  <div className="mt-1 whitespace-pre-wrap text-gray-900 leading-relaxed">{viewingPlan.schedule || '-'}</div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 text-[11px] font-semibold text-gray-600">참가자 명단</div>
                {viewingPlan.participantList.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {sortParticipants(viewingPlan.participantList).map((participant, index) => (
                      <div key={participant.id} className="flex items-center gap-2 px-3 py-2">
                        <span className="w-5 text-[11px] text-gray-400 font-mono">{index + 1}</span>
                        <span className="font-medium text-gray-900">{participant.name}</span>
                        <span className="text-gray-500">{participant.role}</span>
                        {participant.studentInfo && <span className="text-gray-400 font-mono">{participant.studentInfo}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-gray-400">등록된 참가자 명단이 없습니다.</div>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 text-[11px] font-semibold text-gray-600">소요 예산</div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500">
                      <th className="px-3 py-2 text-left font-semibold">항목</th>
                      <th className="px-3 py-2 text-right font-semibold">금액</th>
                      <th className="px-3 py-2 text-left font-semibold">산출 근거</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viewingPlan.budgetItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-gray-900">{item.category}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-900">{item.amount.toLocaleString()}원</td>
                        <td className="px-3 py-2 text-gray-600">{item.justification || '-'}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-bold">
                      <td className="px-3 py-2 text-gray-900">합계</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-900">
                        {viewingPlan.budgetItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}원
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-[11px] font-semibold text-gray-500">차량 신청</div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-gray-500">차량 종류</div>
                    <div className="mt-0.5 font-bold text-gray-900">{viewingPlan.vehicleRequest?.type || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">사용 기간</div>
                    <div className="mt-0.5 text-gray-900">{formatVehicleUsage(viewingPlan.vehicleRequest || DEFAULT_VEHICLE_REQUEST)}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-[11px] font-semibold text-gray-500">비고</div>
                  <div className="mt-1 text-gray-900">{viewingPlan.note || '-'}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-[11px] font-semibold text-gray-500">붙임 파일</div>
                  <div className="mt-1 text-gray-900">
                    {viewingPlan.attachments.length > 0
                      ? viewingPlan.attachments.map((attachment) => attachment.name).join(', ')
                      : '-'}
                  </div>
                </div>
              </div>

              {viewingPlan.approvalStatus === 'approved' && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                  {viewingPlan.approvedBy} 님이 {viewingPlan.approvedAt ? new Date(viewingPlan.approvedAt).toLocaleString() : ''} 결재했습니다.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200">
              <button type="button" onClick={() => setViewingPlan(null)} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs px-3 py-2 rounded-lg cursor-pointer">
                닫기
              </button>
              {canApprove && viewingPlan.approvalStatus !== 'approved' && (
                <button type="button" onClick={() => handleApprovePlan(viewingPlan)} className="bg-crimson-700 hover:bg-crimson-800 text-white text-xs px-4 py-2 rounded-lg font-medium flex items-center gap-1 cursor-pointer">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>결재</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
