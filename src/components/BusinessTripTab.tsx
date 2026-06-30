import React, { useState, useRef } from 'react';
import { TripRequest, TripReport, TripSchedule, SportType, User, TripReportReceipt } from '../types';
import {
  Plus,
  FileText,
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Briefcase,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlusCircle,
  Trash2,
  Check,
  X,
  CreditCard,
  Sparkles,
  RefreshCw,
  Camera,
  Image as ImageIcon,
  Upload
} from 'lucide-react';

interface BusinessTripTabProps {
  tripRequests: TripRequest[];
  tripReports: TripReport[];
  activeSport: SportType;
  currentUser: User;
  onAddTripRequest: (trip: Omit<TripRequest, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateTripRequest: (id: string, trip: Partial<TripRequest>) => Promise<void>;
  onDeleteTripRequest: (id: string) => Promise<void>;
  onAddTripReport: (report: Omit<TripReport, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateTripReport: (id: string, report: Partial<TripReport>) => Promise<void>;
  onDeleteTripReport: (id: string) => Promise<void>;
}

// Preset samples of travel receipts for Demo OCR
const TRAVEL_SAMPLE_RECEIPTS = [
  {
    name: 'KTX 고속열차 (세종->예천)',
    amount: 28400,
    merchant: '코레일 (한국철도공사)',
    date: '2026-06-22',
    paymentMethod: '국인법인(4821)',
    memo: '대진회의 참석용 KTX 운임비'
  },
  {
    name: '예천 파크모텔 (지방출장숙소)',
    amount: 65000,
    merchant: '예천 비즈니스 파크모텔',
    date: '2026-06-22',
    paymentMethod: '국인법인(4821)',
    memo: '출장 공식 1박 숙박 영수증'
  }
];

export default function BusinessTripTab({
  tripRequests,
  tripReports,
  activeSport,
  currentUser,
  onAddTripRequest,
  onUpdateTripRequest,
  onDeleteTripRequest,
  onAddTripReport,
  onUpdateTripReport,
  onDeleteTripReport,
}: BusinessTripTabProps) {
  const [subTab, setSubTab] = useState<'request' | 'report'>('request');
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [isReportFormOpen, setIsReportFormOpen] = useState(false);
  const [activeRequestForReport, setActiveRequestForReport] = useState<TripRequest | null>(null);

  // --- TRIP REQUEST FORM STATES ---
  const [reqDept, setReqDept] = useState(`고려대학교 세종캠퍼스 체육부 (${activeSport === 'soccer' ? '여자축구부' : '양궁부'})`);
  const [reqName, setReqName] = useState(currentUser.name.split(' ')[0]);
  const [reqPosition, setReqPosition] = useState(currentUser.role === 'director' ? '감독' : '코치');
  const [reqDest, setReqDest] = useState('');
  const [reqPurpose, setReqPurpose] = useState('');
  const [reqStartDate, setReqStartDate] = useState('');
  const [reqEndDate, setReqEndDate] = useState('');
  
  // Trip Schedule (Dynamic Array)
  const [scheduleList, setScheduleList] = useState<TripSchedule[]>([
    { date: '', time: '10:00', description: '세종캠퍼스 출발 및 이동' }
  ]);

  // Expected Expenses Unit calculations
  const [allowanceRate, setAllowanceRate] = useState(20000);
  const [allowanceDays, setAllowanceDays] = useState(2);
  const [foodRate, setFoodRate] = useState(25000);
  const [foodDays, setFoodDays] = useState(2);
  const [lodgingRate, setLodgingRate] = useState(60000);
  const [lodgingDays, setLodgingDays] = useState(1);

  // Bank Info
  const [bankName, setBankName] = useState('하나은행');
  const [bankNumber, setBankNumber] = useState('');
  const [bankHolder, setBankHolder] = useState(currentUser.name.split(' ')[0]);

  const [reqError, setReqError] = useState('');

  // --- TRIP REPORT FORM STATES (방안 A) ---
  const [repActivities, setRepActivities] = useState('');
  const [repReceipts, setRepReceipts] = useState<TripReportReceipt[]>([]);
  const [repPhotos, setRepPhotos] = useState<string[]>([]);
  
  // Reporting OCR States
  const [isRepOcrLoading, setIsRepOcrLoading] = useState(false);
  const [repOcrError, setRepOcrError] = useState('');
  const [repOcrResult, setRepOcrResult] = useState<any>(null);
  
  // Manual Correction states for report receipts
  const [repManualDate, setRepManualDate] = useState('');
  const [repManualAmount, setRepManualAmount] = useState('');
  const [repManualPayment, setRepManualPayment] = useState('');
  const [repManualMemo, setRepManualMemo] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Auto-calculated expected expenses
  const allowanceTotal = allowanceRate * allowanceDays;
  const foodTotal = foodRate * foodDays;
  const lodgingTotal = lodgingRate * lodgingDays;
  const expectedTotal = allowanceTotal + foodTotal + lodgingTotal;

  const canModify =
    currentUser.role === 'admin' ||
    ((currentUser.role === 'director' || currentUser.role === 'coach') && currentUser.sport === activeSport);

  const isProfessor = currentUser.role === 'professor';

  const filteredRequests = tripRequests.filter((t) => t.sport === activeSport);
  const filteredReports = tripReports.filter((r) => r.sport === activeSport);

  // --- SCHEDULE HANDLERS ---
  const handleAddSchedule = () => {
    setScheduleList([...scheduleList, { date: '', time: '12:00', description: '' }]);
  };

  const handleRemoveSchedule = (idx: number) => {
    setScheduleList(scheduleList.filter((_, i) => i !== idx));
  };

  const handleScheduleChange = (idx: number, field: keyof TripSchedule, val: string) => {
    const copy = [...scheduleList];
    copy[idx][field] = val;
    setScheduleList(copy);
  };

  // --- SAVE REQUEST PLAN ---
  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDest.trim()) return setReqError('출장지를 입력해 주세요.');
    if (!reqPurpose.trim()) return setReqError('출장 목적을 입력해 주세요.');
    if (!reqStartDate || !reqEndDate) return setReqError('출장 기간을 입력해 주세요.');
    if (scheduleList.some((s) => !s.date || !s.description.trim())) {
      return setReqError('세부 일정을 정확히 기입해 주세요.');
    }
    if (!bankNumber.trim()) return setReqError('계좌번호를 입력해 주세요.');

    try {
      const payload = {
        department: reqDept,
        name: reqName,
        position: reqPosition,
        destination: reqDest.trim(),
        purpose: reqPurpose.trim(),
        startDate: reqStartDate,
        endDate: reqEndDate,
        schedule: scheduleList,
        expectedExpenses: {
          dailyAllowanceRate: Number(allowanceRate),
          dailyAllowanceDays: Number(allowanceDays),
          dailyAllowanceTotal: allowanceTotal,
          foodRate: Number(foodRate),
          foodDays: Number(foodDays),
          foodTotal: foodTotal,
          lodgingRate: Number(lodgingRate),
          lodgingDays: Number(lodgingDays),
          lodgingTotal: lodgingTotal,
          total: expectedTotal
        },
        account: {
          bank: bankName,
          number: bankNumber.trim(),
          holder: bankHolder.trim()
        },
        attachments: [],
        status: '기안' as const,
        createdBy: currentUser.email,
        sport: activeSport
      };

      await onAddTripRequest(payload);
      setIsRequestFormOpen(false);
      resetRequestForm();
    } catch (err: any) {
      setReqError(err.message || '저장 오류 발생');
    }
  };

  const resetRequestForm = () => {
    setReqDest('');
    setReqPurpose('');
    setReqStartDate('');
    setReqEndDate('');
    setScheduleList([{ date: '', time: '10:00', description: '세종캠퍼스 출발 및 이동' }]);
    setAllowanceDays(2);
    setFoodDays(2);
    setLodgingDays(1);
    setBankNumber('');
    setReqError('');
  };

  // --- REPORT RECEIPT OCR & FILE MANAGEMENT ---
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      await runReportOcr(base64String, file.type);
    };
    reader.readAsDataURL(file);
  };

  const runReportOcr = async (base64Data: string, mimeType: string) => {
    setIsRepOcrLoading(true);
    setRepOcrError('');
    setRepOcrResult(null);

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data, mimeType }),
      });

      const resJson = await response.json();
      if (!response.ok) throw new Error(resJson.error || 'OCR 분석 실패');

      if (resJson.success && resJson.data) {
        const { date, amount, paymentMethod } = resJson.data;
        setRepOcrResult(resJson.data);
        setRepManualDate(date || '');
        setRepManualAmount(amount ? String(amount) : '');
        setRepManualPayment(paymentMethod || '');
      } else {
        throw new Error('영수증 파싱 불가');
      }
    } catch (err: any) {
      setRepOcrError('AI OCR 인식 지연으로 직접 입력해 주세요.');
      setRepManualDate(new Date().toISOString().split('T')[0]);
      setRepManualAmount('');
      setRepManualPayment('');
    } finally {
      setIsRepOcrLoading(false);
    }
  };

  const handleSelectReportSample = (sample: typeof TRAVEL_SAMPLE_RECEIPTS[0]) => {
    setIsRepOcrLoading(true);
    setTimeout(() => {
      setRepOcrResult(sample);
      setRepManualDate(sample.date);
      setRepManualAmount(String(sample.amount));
      setRepManualPayment(sample.paymentMethod);
      setRepManualMemo(sample.memo);
      setIsRepOcrLoading(false);
    }, 1000);
  };

  const handleAddReportReceipt = () => {
    if (!repManualAmount || Number(repManualAmount) <= 0) {
      alert('금액을 올바르게 입력해 주세요.');
      return;
    }

    const newRec: TripReportReceipt = {
      id: 'trec_' + Date.now().toString(),
      date: repManualDate || new Date().toISOString().split('T')[0],
      amount: Number(repManualAmount),
      paymentMethod: repManualPayment.trim() || '법인카드',
      receiptUrl: '/placeholder_receipt.png',
      memo: repManualMemo.trim() || '출장 경비 지출'
    };

    setRepReceipts([...repReceipts, newRec]);
    // Clear temp states
    setRepOcrResult(null);
    setRepManualDate('');
    setRepManualAmount('');
    setRepManualPayment('');
    setRepManualMemo('');
  };

  const handleRemoveReportReceipt = (id: string) => {
    setRepReceipts(repReceipts.filter((r) => r.id !== id));
  };

  // Up to 10 photos upload (출장 증빙 사진)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (repPhotos.length + files.length > 10) {
      alert('출장 증빙 사진은 모바일 최적화를 위해 최대 10장으로 제한됩니다.');
      return;
    }

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRepPhotos((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (idx: number) => {
    setRepPhotos(repPhotos.filter((_, i) => i !== idx));
  };

  // --- OPEN REPORT FORM FOR PENDING PLAN ---
  const handleOpenReportForm = (req: TripRequest) => {
    setActiveRequestForReport(req);
    setRepActivities('');
    setRepReceipts([]);
    setRepPhotos([]);
    setIsReportFormOpen(true);
  };

  // --- SAVE REPORT ---
  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequestForReport) return;
    if (!repActivities.trim()) {
      alert('주요 활동 내용을 상세히 기록해 주세요.');
      return;
    }

    try {
      const payload = {
        tripRequestId: activeRequestForReport.id,
        name: activeRequestForReport.name,
        department: activeRequestForReport.department,
        position: activeRequestForReport.position,
        startDate: activeRequestForReport.startDate,
        endDate: activeRequestForReport.endDate,
        destination: activeRequestForReport.destination,
        activities: repActivities.trim(),
        expenses: repReceipts,
        attachments: repPhotos,
        status: '기안' as const,
        createdBy: currentUser.email,
        sport: activeSport
      };

      await onAddTripReport(payload);
      setIsReportFormOpen(false);
      setSubTab('report'); // switch to list report
    } catch (err) {
      alert('출장 보고서 등록에 실패했습니다.');
    }
  };

  // --- APPROVAL HANDLERS FOR PROFESSOR ---
  const handleApproveRequest = async (id: string) => {
    if (window.confirm('이 출장 계획서를 최종 승인 처리하시겠습니까?')) {
      await onUpdateTripRequest(id, { status: '최종승인' });
    }
  };

  const handleRejectRequest = async (id: string) => {
    const reason = window.prompt('반려 사유를 입력해 주세요:');
    if (reason !== null) {
      await onUpdateTripRequest(id, { status: '반려', rejectReason: reason.trim() });
    }
  };

  const handleApproveReport = async (id: string) => {
    if (window.confirm('이 출장 결과 보고서를 최종 승인 처리하시겠습니까?')) {
      await onUpdateTripReport(id, { status: '최종승인' });
    }
  };

  const handleRejectReport = async (id: string) => {
    const reason = window.prompt('반려 사유를 입력해 주세요:');
    if (reason !== null) {
      await onUpdateTripReport(id, { status: '반려', rejectReason: reason.trim() });
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => {
            setSubTab('request');
            setIsRequestFormOpen(false);
            setIsReportFormOpen(false);
          }}
          className={`flex-1 py-2 text-center text-xs font-bold border-b-2 transition-all cursor-pointer ${
            subTab === 'request'
              ? 'border-crimson-700 text-crimson-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          1단계: 출장 계획서 (신청)
        </button>
        <button
          onClick={() => {
            setSubTab('report');
            setIsRequestFormOpen(false);
            setIsReportFormOpen(false);
          }}
          className={`flex-1 py-2 text-center text-xs font-bold border-b-2 transition-all cursor-pointer ${
            subTab === 'report'
              ? 'border-crimson-700 text-crimson-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          2단계: 출장 결과 보고서
        </button>
      </div>

      {/* --- SUB TAB 1: TRIP REQUEST --- */}
      {subTab === 'request' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-gray-900">지도자 출장 계획 신청함</h3>
              <p className="text-[11px] text-gray-500">지방 경기 대동, 미팅 및 답사를 위한 사전 출장 신청을 수행합니다.</p>
            </div>
            {canModify && !isRequestFormOpen && !isReportFormOpen && (
              <button
                onClick={() => setIsRequestFormOpen(true)}
                className="flex items-center gap-1 bg-crimson-700 text-white hover:bg-crimson-800 text-xs px-2.5 py-1.5 rounded-lg font-medium shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>계획서 작성</span>
              </button>
            )}
          </div>

          {/* Form: Trip Request Plan */}
          {isRequestFormOpen && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-950 flex items-center gap-1">
                  <Briefcase className="w-4 h-4 text-crimson-700" />
                  <span>출장 계획서 신청 양식 작성</span>
                </span>
                <button onClick={() => setIsRequestFormOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveRequest} className="space-y-4">
                {/* Basic user info fields */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">소속부서</label>
                    <input type="text" value={reqDept} disabled className="w-full bg-gray-50 border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-600 font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">성명</label>
                    <input type="text" value={reqName} disabled className="w-full bg-gray-50 border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-600 font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">직위</label>
                    <input type="text" value={reqPosition} disabled className="w-full bg-gray-50 border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-600 font-medium" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="col-span-1">
                    <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">출장지</label>
                    <input
                      type="text"
                      value={reqDest}
                      onChange={(e) => setReqDest(e.target.value)}
                      placeholder="예: 경북 예천 진호국제양궁장"
                      className="w-full border border-gray-300 rounded px-2.5 py-1"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">출장 목적</label>
                    <input
                      type="text"
                      value={reqPurpose}
                      onChange={(e) => setReqPurpose(e.target.value)}
                      placeholder="예: 전국 양궁 연맹전 대진 추첨 및 시설 협의"
                      className="w-full border border-gray-300 rounded px-2.5 py-1"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">출장 시작일</label>
                    <input
                      type="date"
                      value={reqStartDate}
                      onChange={(e) => setReqStartDate(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2.5 py-1"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">출장 종료일</label>
                    <input
                      type="date"
                      value={reqEndDate}
                      onChange={(e) => setReqEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2.5 py-1"
                    />
                  </div>
                </div>

                {/* Daily Schedule (경기 관람/미팅 기술) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-1">
                    <span className="text-[11px] font-bold text-gray-700">주요 일자별 세부 일정</span>
                    <button
                      type="button"
                      onClick={handleAddSchedule}
                      className="text-[10px] text-crimson-700 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>일정 추가</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {scheduleList.map((sch, sIdx) => (
                      <div key={sIdx} className="flex gap-1.5 items-center bg-gray-50 p-1.5 rounded border border-gray-200">
                        <input
                          type="date"
                          value={sch.date}
                          onChange={(e) => handleScheduleChange(sIdx, 'date', e.target.value)}
                          className="border border-gray-300 rounded px-1.5 py-0.5 text-[11px] bg-white font-mono"
                        />
                        <input
                          type="text"
                          value={sch.time}
                          onChange={(e) => handleScheduleChange(sIdx, 'time', e.target.value)}
                          placeholder="10:00"
                          className="w-14 border border-gray-300 rounded px-1.5 py-0.5 text-[11px] bg-white text-center font-mono"
                        />
                        <input
                          type="text"
                          value={sch.description}
                          onChange={(e) => handleScheduleChange(sIdx, 'description', e.target.value)}
                          placeholder="활동 설명 (예: 양궁 조직위 미팅)"
                          className="flex-1 border border-gray-300 rounded px-1.5 py-0.5 text-[11px] bg-white"
                        />
                        {scheduleList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSchedule(sIdx)}
                            className="text-gray-400 hover:text-red-600 p-0.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expected Travel Expenses calculations */}
                <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <span className="block text-[11px] font-bold text-gray-700 border-b border-gray-200 pb-1">
                    여비 기준액 자동 계산 (단가 × 일수)
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">일비 단가</label>
                      <input type="number" value={allowanceRate} onChange={(e) => setAllowanceRate(Number(e.target.value))} className="w-full bg-white border border-gray-300 rounded px-1.5 py-0.5 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">일수</label>
                      <input type="number" value={allowanceDays} onChange={(e) => setAllowanceDays(Number(e.target.value))} className="w-full bg-white border border-gray-300 rounded px-1.5 py-0.5 font-mono" />
                    </div>
                    <div className="flex items-end justify-end font-mono font-semibold text-gray-700 pb-1">
                      {allowanceTotal.toLocaleString()}원
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">식비 단가</label>
                      <input type="number" value={foodRate} onChange={(e) => setFoodRate(Number(e.target.value))} className="w-full bg-white border border-gray-300 rounded px-1.5 py-0.5 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">일수</label>
                      <input type="number" value={foodDays} onChange={(e) => setFoodDays(Number(e.target.value))} className="w-full bg-white border border-gray-300 rounded px-1.5 py-0.5 font-mono" />
                    </div>
                    <div className="flex items-end justify-end font-mono font-semibold text-gray-700 pb-1">
                      {foodTotal.toLocaleString()}원
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">숙박비 단가</label>
                      <input type="number" value={lodgingRate} onChange={(e) => setLodgingRate(Number(e.target.value))} className="w-full bg-white border border-gray-300 rounded px-1.5 py-0.5 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">일수</label>
                      <input type="number" value={lodgingDays} onChange={(e) => setLodgingDays(Number(e.target.value))} className="w-full bg-white border border-gray-300 rounded px-1.5 py-0.5 font-mono" />
                    </div>
                    <div className="flex items-end justify-end font-mono font-semibold text-gray-700 pb-1">
                      {lodgingTotal.toLocaleString()}원
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-200 pt-2 text-xs font-bold text-crimson-800">
                    <span>예상 여비 합계:</span>
                    <span className="font-mono text-sm">{expectedTotal.toLocaleString()}원</span>
                  </div>
                </div>

                {/* Account info */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="col-span-1">
                    <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">은행명</label>
                    <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full border border-gray-300 rounded px-2.5 py-1" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">계좌번호</label>
                    <input type="text" value={bankNumber} onChange={(e) => setBankNumber(e.target.value)} placeholder="숫자만 입력" className="w-full border border-gray-300 rounded px-2.5 py-1 font-mono" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">예금주</label>
                    <input type="text" value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} className="w-full border border-gray-300 rounded px-2.5 py-1" />
                  </div>
                </div>

                {reqError && <div className="text-xs text-red-600 font-medium">{reqError}</div>}

                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsRequestFormOpen(false)}
                    className="bg-white border border-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="bg-crimson-700 text-white text-xs px-4 py-1.5 rounded-lg font-medium shadow"
                  >
                    결재 상신 (체육부장 교수 승인대기)
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List: Requests */}
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl bg-gray-50 text-gray-400 text-xs">
              기안된 출장 계획서가 존재하지 않습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => {
                const correspondingReport = filteredReports.find((r) => r.tripRequestId === req.id);

                return (
                  <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] bg-crimson-50 text-crimson-800 font-bold px-1.5 rounded">
                            {req.name} {req.position}
                          </span>
                          <h4 className="text-xs font-bold text-gray-900">{req.purpose}</h4>
                        </div>
                        <div className="text-[11px] text-gray-500 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span>출장지: {req.destination}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span>기간: {req.startDate} ~ {req.endDate}</span>
                          </div>
                        </div>
                      </div>

                      {/* Request Status */}
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            req.status === '최종승인'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === '반려'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {req.status}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-crimson-700">
                          {req.expectedExpenses.total.toLocaleString()}원
                        </span>
                      </div>
                    </div>

                    {/* Schedule Accordion summary */}
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-1.5 text-xs">
                      <div className="font-semibold text-[11px] text-gray-700">핵심 일정 계획:</div>
                      <div className="space-y-1 text-[11px] text-gray-600">
                        {req.schedule.map((sch, sIdx) => (
                          <div key={sIdx} className="flex gap-2">
                            <span className="font-mono font-medium text-crimson-700">[{sch.date.substring(5)}] {sch.time}</span>
                            <span>- {sch.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {req.status === '반려' && req.rejectReason && (
                      <div className="p-2 bg-red-50 text-red-800 border border-red-100 text-[11px] rounded-lg">
                        <b>반려 사유:</b> {req.rejectReason}
                      </div>
                    )}

                    {/* Gym Master (Professor) approval controls or Creator report triggers */}
                    <div className="flex justify-end gap-1.5 pt-1">
                      {isProfessor && req.status === '기안' && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            className="bg-red-50 text-red-700 hover:bg-red-100 text-[10px] px-2.5 py-1.5 rounded font-semibold border border-red-200 cursor-pointer"
                          >
                            출장 반려
                          </button>
                          <button
                            onClick={() => handleApproveRequest(req.id)}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] px-3 py-1.5 rounded font-semibold shadow-xs cursor-pointer"
                          >
                            최종 승인
                          </button>
                        </div>
                      )}

                      {/* Coach/Director triggers result reporting */}
                      {canModify && req.status === '최종승인' && !correspondingReport && !isReportFormOpen && (
                        <button
                          onClick={() => handleOpenReportForm(req)}
                          className="bg-gray-900 text-white hover:bg-gray-800 text-[11px] px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>출장 보고서(결과) 기안하기</span>
                        </button>
                      )}

                      {correspondingReport && (
                        <span className="text-emerald-700 font-semibold text-xs flex items-center gap-0.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>출장 보고서 상신 완료 ({correspondingReport.status})</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- SUB TAB 2: TRIP REPORT (방안 A) --- */}
      {subTab === 'report' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-gray-900">지도자 출장 결과 보고함</h3>
              <p className="text-[11px] text-gray-500">
                수행 완료된 출장의 세부 결과 보고서 및 실지출 영수증(OCR), 현장 증빙 사진(최대 10장)을 승인받습니다.
              </p>
            </div>
          </div>

          {/* Form: Trip Report Creation (방안 A) */}
          {isReportFormOpen && activeRequestForReport && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-950 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-crimson-700" />
                  <span>출장 결과 보고서 기안 (수동 보정 및 증빙)</span>
                </span>
                <button onClick={() => setIsReportFormOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-crimson-50/50 p-3 rounded-lg text-xs space-y-1.5 border border-crimson-100">
                <div className="font-bold text-crimson-900">연동된 출장 계획 정보:</div>
                <div className="text-gray-600 grid grid-cols-2 gap-1.5">
                  <div>• 성명: {activeRequestForReport.name} ({activeRequestForReport.position})</div>
                  <div>• 출장지: {activeRequestForReport.destination}</div>
                  <div className="col-span-2">• 목적: {activeRequestForReport.purpose}</div>
                  <div className="col-span-2">• 기간: {activeRequestForReport.startDate} ~ {activeRequestForReport.endDate}</div>
                </div>
              </div>

              <form onSubmit={handleSaveReport} className="space-y-4">
                {/* Detailed Activities */}
                <div className="space-y-1 text-xs">
                  <label className="block text-[11px] text-gray-700 font-bold">주요 활동 내용 요약 및 결과</label>
                  <textarea
                    rows={4}
                    value={repActivities}
                    onChange={(e) => setRepActivities(e.target.value)}
                    placeholder="출장지에서의 세부 대진 회의 추첨 상황, 상대 관람/분석 내용, 미팅 진행 상황 등을 조리있게 서술해 주세요."
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs"
                  />
                </div>

                {/* Receipts attaching section with OCR */}
                <div className="space-y-2.5 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                    <span className="text-[11px] font-bold text-gray-700 flex items-center gap-0.5">
                      <CreditCard className="w-3.5 h-3.5 text-crimson-700" />
                      <span>출장 실지출 영수증 내역 상세 (교통/숙박 등 OCR)</span>
                    </span>
                  </div>

                  {/* Sample travel receipts selectors */}
                  <div className="space-y-1.5">
                    <span className="block text-[9px] text-gray-400 font-semibold">테스트용 교통/숙박 샘플 영수증 선택</span>
                    <div className="grid grid-cols-2 gap-2">
                      {TRAVEL_SAMPLE_RECEIPTS.map((ts, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectReportSample(ts)}
                          className="bg-white hover:bg-crimson-50/50 border border-gray-300 rounded-lg p-1.5 text-[10px] text-left transition-colors cursor-pointer"
                        >
                          <div className="font-semibold truncate text-gray-800">{ts.name}</div>
                          <div className="font-mono text-crimson-700 mt-0.5">{ts.amount.toLocaleString()}원</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-1.5 flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleReceiptUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white border border-gray-300 text-gray-700 hover:text-crimson-700 text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>진짜 영수증 사진 업로드 (OCR)</span>
                    </button>
                  </div>

                  {isRepOcrLoading && (
                    <div className="bg-crimson-50 text-crimson-950 p-2.5 rounded border border-crimson-100 flex items-center gap-2 animate-pulse text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-crimson-700" />
                      <span>Gemini AI가 여비 영수증을 파악 중입니다...</span>
                    </div>
                  )}

                  {repOcrError && (
                    <div className="text-[10px] text-amber-700 font-semibold bg-amber-50 p-2 rounded">
                      {repOcrError}
                    </div>
                  )}

                  {/* Manual correction blocks */}
                  {(repOcrResult || repManualAmount) && (
                    <div className="bg-white border border-gray-200 rounded p-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="col-span-1">
                        <label className="block text-[9px] text-gray-500 font-semibold mb-0.5">거래일자</label>
                        <input
                          type="date"
                          value={repManualDate}
                          onChange={(e) => setRepManualDate(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded px-1.5 py-0.5 font-mono text-[11px]"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[9px] text-gray-500 font-semibold mb-0.5">금액(원)</label>
                        <input
                          type="number"
                          value={repManualAmount}
                          onChange={(e) => setRepManualAmount(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded px-1.5 py-0.5 font-mono text-[11px]"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[9px] text-gray-500 font-semibold mb-0.5">결제 수단</label>
                        <input
                          type="text"
                          value={repManualPayment}
                          onChange={(e) => setRepManualPayment(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded px-1.5 py-0.5 text-[11px]"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] text-gray-500 font-semibold mb-0.5">메모</label>
                        <input
                          type="text"
                          value={repManualMemo}
                          onChange={(e) => setRepManualMemo(e.target.value)}
                          placeholder="영수증 보충 메모 (예: KTX 편도)"
                          className="w-full bg-gray-50 border border-gray-300 rounded px-1.5 py-0.5 text-[11px]"
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={handleAddReportReceipt}
                          className="w-full bg-gray-900 text-white text-[11px] py-1 rounded font-semibold cursor-pointer"
                        >
                          내역 추가
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Table of report receipts */}
                  {repReceipts.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="block text-[10px] text-gray-500 font-semibold">기입된 영수증 총액: {repReceipts.reduce((a, b) => a + b.amount, 0).toLocaleString()}원</span>
                      {repReceipts.map((rr) => (
                        <div key={rr.id} className="bg-white border border-gray-200 rounded p-2 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-gray-900">{rr.memo}</span>
                            <span className="text-[10px] text-gray-400 font-mono ml-2">{rr.date}</span>
                            <div className="text-[10px] text-gray-500 font-mono">{rr.paymentMethod} • {rr.amount.toLocaleString()}원</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveReportReceipt(rr.id)}
                            className="text-red-600 p-1 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Photo uploads grid (Max 10) */}
                <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                    <span className="text-[11px] font-bold text-gray-700 flex items-center gap-0.5">
                      <Camera className="w-3.5 h-3.5 text-crimson-700" />
                      <span>출장 현장 증빙 사진 (최대 10장)</span>
                    </span>
                    <span className="text-[10px] text-gray-500">{repPhotos.length} / 10장</span>
                  </div>

                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      ref={photoInputRef}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="bg-white border border-gray-300 hover:text-crimson-700 text-gray-700 text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>사진 추가</span>
                    </button>
                  </div>

                  {repPhotos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      {repPhotos.map((photo, pIdx) => (
                        <div key={pIdx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          <img src={photo} alt="증빙" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(pIdx)}
                            className="absolute top-1 right-1 bg-black/65 text-white p-0.5 rounded-full hover:bg-black cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsReportFormOpen(false)}
                    className="bg-white border border-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="bg-crimson-700 text-white text-xs px-4 py-1.5 rounded-lg font-medium shadow"
                  >
                    결과 보고서 상신 (교수 결재 요청)
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List: Reports */}
          {filteredReports.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl bg-gray-50 text-gray-400 text-xs">
              상신된 출장 결과 보고서가 존재하지 않습니다. 계획서가 '최종승인'된 후 보고서를 상신할 수 있습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((rep) => {
                const totalRepAmount = rep.expenses.reduce((a, b) => a + b.amount, 0);

                return (
                  <div key={rep.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-1.5 rounded">
                            보고자: {rep.name} {rep.position}
                          </span>
                          <h4 className="text-xs font-bold text-gray-900">{rep.destination} 출장 보고</h4>
                        </div>
                        <div className="text-[11px] text-gray-500 space-y-0.5">
                          <div>기간: {rep.startDate} ~ {rep.endDate}</div>
                        </div>
                      </div>

                      {/* Report Status */}
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            rep.status === '최종승인'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rep.status === '반려'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rep.status}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-crimson-700">
                          실지출: {totalRepAmount.toLocaleString()}원
                        </span>
                      </div>
                    </div>

                    {/* Detailed Activity summary */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2 text-xs">
                      <div className="font-bold text-[11px] text-gray-700 border-b border-gray-200 pb-1">주요 활동 보고 내용:</div>
                      <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">{rep.activities}</p>
                    </div>

                    {/* Report Expense Details Accordion */}
                    {rep.expenses.length > 0 && (
                      <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-1.5 text-xs">
                        <div className="font-semibold text-[11px] text-gray-700">실지출 증빙 상세 ({rep.expenses.length}건):</div>
                        <div className="space-y-1">
                          {rep.expenses.map((re, reIdx) => (
                            <div key={reIdx} className="flex justify-between items-center text-[10px] text-gray-600">
                              <span>• {re.memo} ({re.date})</span>
                              <span className="font-mono font-semibold">{re.amount.toLocaleString()}원</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Proof photo thumbnail preview */}
                    {rep.attachments && rep.attachments.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 font-semibold">출장 현장 증빙 사진 ({rep.attachments.length}장)</span>
                        <div className="flex gap-1 overflow-x-auto pb-1">
                          {rep.attachments.map((atUrl, aIdx) => (
                            <div key={aIdx} className="w-12 h-12 rounded border bg-gray-100 shrink-0 overflow-hidden">
                              <img src={atUrl} alt="현장" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {rep.status === '반려' && rep.rejectReason && (
                      <div className="p-2 bg-red-50 text-red-800 border border-red-100 text-[11px] rounded-lg">
                        <b>반려 사유:</b> {rep.rejectReason}
                      </div>
                    )}

                    {/* Gym Master (Professor) approval buttons for Report */}
                    {isProfessor && rep.status === '기안' && (
                      <div className="flex justify-end gap-1.5 border-t border-gray-100 pt-2.5">
                        <button
                          onClick={() => handleRejectReport(rep.id)}
                          className="bg-red-50 text-red-700 hover:bg-red-100 text-[10px] px-2.5 py-1.5 rounded font-semibold border border-red-200 cursor-pointer"
                        >
                          보고 반려
                        </button>
                        <button
                          onClick={() => handleApproveReport(rep.id)}
                          className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] px-3 py-1.5 rounded font-semibold shadow-xs cursor-pointer"
                        >
                          보고서 최종 승인
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
