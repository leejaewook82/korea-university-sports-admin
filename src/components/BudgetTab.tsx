import React, { useState, useRef } from 'react';
import { ExpensePlan, Receipt, SportType, User } from '../types';
import {
  Plus,
  Receipt as ReceiptIcon,
  Upload,
  Sparkles,
  Calendar,
  MapPin,
  FileText,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Check,
  X,
  RefreshCw,
  Eye,
  CreditCard,
  Edit2
} from 'lucide-react';

interface BudgetTabProps {
  expenses: ExpensePlan[];
  activeSport: SportType;
  currentUser: User;
  onAddExpense: (expense: Omit<ExpensePlan, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateExpense: (id: string, expense: Partial<ExpensePlan>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

// Preset samples of receipts for easy testing
const SAMPLE_RECEIPTS = [
  {
    name: '강릉 삼겹살 회식 (식대)',
    amount: 184000,
    merchant: '강릉 한돈 숯불갈비',
    date: '2026-06-29',
    paymentMethod: '하나법인(4215)',
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // Tiny pixel
    memo: '전지훈련 첫날 저녁 단체 식사비'
  },
  {
    name: 'KTX 기차 운임 (교통비)',
    amount: 48200,
    merchant: '코레일 청량리역',
    date: '2026-06-29',
    paymentMethod: 'KB개인(7824)',
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    memo: '지도자 전지훈련 답사 왕복 승차권'
  },
  {
    name: '예천 파크모텔 (숙박비)',
    amount: 130000,
    merchant: '예천 비즈니스 파크모텔',
    date: '2026-06-22',
    paymentMethod: '국인법인(4821)',
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    memo: '대회 공식 숙소 대관 선납금'
  }
];

const MOCK_UPLOAD_RECEIPT_DATA_URL =
  'data:image/svg+xml;base64,' +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="620" viewBox="0 0 420 620">
    <rect width="420" height="620" fill="#fffdf7"/>
    <rect x="24" y="24" width="372" height="572" rx="14" fill="#ffffff" stroke="#d7d0c2" stroke-width="2"/>
    <text x="210" y="78" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#111827">RECEIPT</text>
    <text x="46" y="132" font-family="Arial, sans-serif" font-size="18" fill="#111827">Merchant: Sejong Sports Goods</text>
    <text x="46" y="176" font-family="Arial, sans-serif" font-size="18" fill="#111827">Date: 2026-06-29</text>
    <text x="46" y="220" font-family="Arial, sans-serif" font-size="18" fill="#111827">Payment: Hana Corporate Card 4215</text>
    <line x1="46" y1="258" x2="374" y2="258" stroke="#d1d5db" stroke-width="2"/>
    <text x="46" y="310" font-family="Arial, sans-serif" font-size="18" fill="#111827">Training cones and tape</text>
    <text x="374" y="310" text-anchor="end" font-family="Arial, sans-serif" font-size="18" fill="#111827">74,500 KRW</text>
    <line x1="46" y1="452" x2="374" y2="452" stroke="#d1d5db" stroke-width="2"/>
    <text x="46" y="505" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#111827">TOTAL</text>
    <text x="374" y="505" text-anchor="end" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#b91c1c">74,500 KRW</text>
  </svg>`);

export default function BudgetTab({
  expenses,
  activeSport,
  currentUser,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
}: BudgetTabProps) {
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<ExpensePlan | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Plan Form States
  const [type, setType] = useState<'훈련' | '대회'>('훈련');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [budget, setBudget] = useState('');
  const [errorPlan, setErrorPlan] = useState('');

  // Receipt Modal / OCR States
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<Partial<Receipt> | null>(null);
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [receiptMemo, setReceiptMemo] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualMerchant, setManualMerchant] = useState('');
  const [manualPayment, setManualPayment] = useState('');
  const [ocrError, setOcrError] = useState('');
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
  const [previewingReceipt, setPreviewingReceipt] = useState<Receipt | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canModify =
    currentUser.role === 'admin' ||
    ((currentUser.role === 'director' || currentUser.role === 'coach') && currentUser.sport === activeSport);

  const isDirector = currentUser.role === 'director' && currentUser.sport === activeSport;

  const filteredPlans = expenses.filter((e) => e.sport === activeSport);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setErrorPlan('계획명을 입력해 주세요.');
    if (!startDate || !endDate) return setErrorPlan('기간을 입력해 주세요.');
    if (!location.trim()) return setErrorPlan('장소를 입력해 주세요.');
    if (!budget || Number(budget) <= 0) return setErrorPlan('예상 예산을 올바르게 입력해 주세요.');

    try {
      const payload = {
        type,
        title: title.trim(),
        startDate,
        endDate,
        location: location.trim(),
        purpose: purpose.trim(),
        budget: Number(budget),
        receipts: [],
        status: '기안' as const,
        createdBy: currentUser.email,
        createdByName: currentUser.name,
        sport: activeSport,
      };

      await onAddExpense(payload);
      setIsPlanFormOpen(false);
      resetPlanForm();
    } catch (err: any) {
      setErrorPlan(err.message || '오류가 발생했습니다.');
    }
  };

  const resetPlanForm = () => {
    setTitle('');
    setStartDate('');
    setEndDate('');
    setLocation('');
    setPurpose('');
    setBudget('');
    setErrorPlan('');
  };

  // Trigger Gemini OCR using uploaded photo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setReceiptImage(base64String);
      await runOcr(base64String, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleMockFileUpload = async () => {
    setReceiptImage(MOCK_UPLOAD_RECEIPT_DATA_URL);
    await runOcr(MOCK_UPLOAD_RECEIPT_DATA_URL, 'image/svg+xml');
  };

  // Run the OCR API call
  const runOcr = async (base64Data: string, mimeType: string) => {
    setIsOcrLoading(true);
    setOcrError('');
    setOcrResult(null);

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data, mimeType }),
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.error || 'OCR 분석에 실패했습니다.');
      }

      if (resJson.success && resJson.data) {
        const { date, amount, merchant, paymentMethod } = resJson.data;
        setOcrResult({
          date: date || '',
          amount: Number(amount) || 0,
          merchant: merchant || '',
          paymentMethod: paymentMethod || '',
        });
        // Populate manual correction fields
        setManualDate(date || '');
        setManualAmount(amount ? String(amount) : '');
        setManualMerchant(merchant || '');
        setManualPayment(paymentMethod || '');
      } else {
        throw new Error('영수증 파싱 오류');
      }
    } catch (err: any) {
      console.error(err);
      setOcrError('인공지능 OCR 인식 중 오류가 발생했습니다. 직접 필드를 입력해 주세요.');
      // Initialize empty manual fields so user can just type them
      setManualDate(new Date().toISOString().split('T')[0]);
      setManualAmount('');
      setManualMerchant('');
      setManualPayment('');
    } finally {
      setIsOcrLoading(false);
    }
  };

  // Select a preset sample to test OCR instantly without taking picture
  const handleSelectSample = async (sample: typeof SAMPLE_RECEIPTS[0]) => {
    setReceiptImage('/placeholder_receipt.png');
    setIsOcrLoading(true);
    setOcrError('');
    setOcrResult(null);

    // Simulate network delay to give premium feel
    setTimeout(() => {
      setOcrResult({
        date: sample.date,
        amount: sample.amount,
        merchant: sample.merchant,
        paymentMethod: sample.paymentMethod,
      });
      setManualDate(sample.date);
      setManualAmount(String(sample.amount));
      setManualMerchant(sample.merchant);
      setManualPayment(sample.paymentMethod);
      setReceiptMemo(sample.memo);
      setIsOcrLoading(false);
    }, 1200);
  };

  // Save parsed and manually corrected receipt details to current plan
  const handleSaveReceipt = async () => {
    if (!activePlan) return;
    if (!manualAmount || Number(manualAmount) <= 0) {
      alert('금액을 올바르게 입력해 주세요.');
      return;
    }
    if (!manualMerchant.trim()) {
      alert('사용처를 입력해 주세요.');
      return;
    }

    let updatedReceipts: Receipt[];

    if (editingReceiptId) {
      updatedReceipts = activePlan.receipts.map((rec) => {
        if (rec.id === editingReceiptId) {
          return {
            ...rec,
            imageUrl: receiptImage || rec.imageUrl || '/placeholder_receipt.png',
            date: manualDate || new Date().toISOString().split('T')[0],
            amount: Number(manualAmount),
            merchant: manualMerchant.trim(),
            paymentMethod: manualPayment.trim() || '현금/기타',
            manuallyEdited: true,
            memo: receiptMemo.trim(),
          };
        }
        return rec;
      });
    } else {
      const newReceipt: Receipt = {
        id: 'rec_' + Date.now().toString(),
        imageUrl: receiptImage || '/placeholder_receipt.png',
        date: manualDate || new Date().toISOString().split('T')[0],
        amount: Number(manualAmount),
        merchant: manualMerchant.trim(),
        paymentMethod: manualPayment.trim() || '현금/기타',
        ocrStatus: ocrResult ? 'success' : 'failed',
        manuallyEdited:
          !ocrResult ||
          ocrResult?.date !== manualDate ||
          ocrResult?.amount !== Number(manualAmount) ||
          ocrResult?.merchant !== manualMerchant ||
          ocrResult?.paymentMethod !== manualPayment,
        memo: receiptMemo.trim(),
      };
      updatedReceipts = [...activePlan.receipts, newReceipt];
    }
    
    try {
      await onUpdateExpense(activePlan.id, { receipts: updatedReceipts });
      // Update local state
      setActivePlan({ ...activePlan, receipts: updatedReceipts });
      closeReceiptModal();
    } catch (err) {
      alert('영수증 저장 중 실패했습니다.');
    }
  };

  const closeReceiptModal = () => {
    setIsReceiptModalOpen(false);
    setOcrResult(null);
    setReceiptImage('');
    setReceiptMemo('');
    setManualDate('');
    setManualAmount('');
    setManualMerchant('');
    setManualPayment('');
    setOcrError('');
    setEditingReceiptId(null);
  };

  const openEditReceiptModal = (plan: ExpensePlan, rec: Receipt) => {
    setEditingReceiptId(rec.id);
    setReceiptImage(rec.imageUrl);
    setManualDate(rec.date);
    setManualAmount(String(rec.amount));
    setManualMerchant(rec.merchant);
    setManualPayment(rec.paymentMethod);
    setReceiptMemo(rec.memo || '');
    setOcrResult({
      date: rec.date,
      amount: rec.amount,
      merchant: rec.merchant,
      paymentMethod: rec.paymentMethod,
    });
    setIsReceiptModalOpen(true);
  };

  const handleDeleteReceipt = async (plan: ExpensePlan, receiptId: string) => {
    if (window.confirm('이 영수증 증빙을 삭제하시겠습니까?')) {
      const updatedReceipts = plan.receipts.filter((r) => r.id !== receiptId);
      await onUpdateExpense(plan.id, { receipts: updatedReceipts });
      if (activePlan?.id === plan.id) {
        setActivePlan({ ...activePlan, receipts: updatedReceipts });
      }
    }
  };

  const handleApprovePlan = async (planId: string) => {
    if (window.confirm('이 경비 지출 내역 및 영수증 증빙을 최종 승인(정산 완료) 처리하시겠습니까?')) {
      await onUpdateExpense(planId, { status: '승인완료' });
    }
  };

  const handleRejectPlan = async (planId: string) => {
    const reason = window.prompt('반려 사유를 입력해 주세요:');
    if (reason !== null) {
      await onUpdateExpense(planId, { status: '반려', rejectReason: reason.trim() });
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 font-display">
            {activeSport === 'soccer' ? '⚽ 경비 지출 및 영수증 증빙' : '🏹 경비 지출 및 영수증 증빙'}
          </h2>
          <p className="text-xs text-gray-500">훈련 및 대회 관련 예산 계획과 지출 영수증 OCR 정산을 관리합니다.</p>
        </div>

        {canModify && !isPlanFormOpen && (
          <button
            onClick={() => setIsPlanFormOpen(true)}
            className="flex items-center gap-1 bg-crimson-700 hover:bg-crimson-800 text-white text-xs px-3 py-2 rounded-lg font-medium shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>경비 계획 생성</span>
          </button>
        )}
      </div>

      {/* Plan Form */}
      {isPlanFormOpen && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-sm font-bold text-gray-900">신규 경비 계획 작성</span>
            <button onClick={() => setIsPlanFormOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreatePlan} className="grid grid-cols-2 gap-3">
            <div className="col-span-1">
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">경비 구분</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-crimson-600"
              >
                <option value="훈련">훈련 경비 (훈련식대, 대관료 등)</option>
                <option value="대회">대회 참전 경비 (등록비, 숙박 등)</option>
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">예상 소요 예산 (원)</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="예: 2500000"
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-crimson-600 font-mono"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">계획명 / 대회(훈련)명</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 2026 전국 추계 대학축구 연맹전 참전"
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-crimson-600"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">시작일자</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-crimson-600"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">종료일자</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-crimson-600"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">실시 장소</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="예: 경북 예천 양궁 필드"
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-crimson-600"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">경비 사용 목적 및 취지</label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={2}
                placeholder="예: 대학 연맹전 공식 훈련 및 식대 제공을 통한 최상의 경기력 조율"
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-crimson-600"
              />
            </div>

            {errorPlan && <div className="col-span-2 text-xs text-red-600 font-medium">{errorPlan}</div>}

            <div className="col-span-2 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIsPlanFormOpen(false)}
                className="bg-white border border-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-lg"
              >
                취소
              </button>
              <button
                type="submit"
                className="bg-crimson-700 text-white text-xs px-4 py-1.5 rounded-lg font-medium shadow"
              >
                계획 저장
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Plans List */}
      {filteredPlans.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl bg-gray-50 text-gray-400 text-xs">
          등록된 경비 계획이 없습니다. 상단 "경비 계획 생성" 버튼으로 새로운 계획을 기안해 주세요.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPlans.map((plan) => {
            const receiptsSum = plan.receipts.reduce((acc, r) => acc + r.amount, 0);
            const budgetPercent = Math.min(Math.round((receiptsSum / plan.budget) * 100), 100);
            const isPlanActive = activePlan?.id === plan.id;

            return (
              <div
                key={plan.id}
                className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${
                  isPlanActive ? 'border-crimson-600 ring-1 ring-crimson-100' : 'border-gray-200'
                }`}
              >
                {/* Accordion / Info Header */}
                <div className="p-4 flex flex-col gap-2 cursor-pointer" onClick={() => setActivePlan(isPlanActive ? null : plan)}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            plan.type === '훈련' ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {plan.type}
                        </span>
                        <h3 className="text-sm font-bold text-gray-900 leading-snug">{plan.title}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {plan.startDate} ~ {plan.endDate}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {plan.location}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          plan.status === '승인완료'
                            ? 'bg-emerald-100 text-emerald-800'
                            : plan.status === '반려'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {plan.status}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">기안: {plan.createdByName.split(' ')[0]}</span>
                    </div>
                  </div>

                  {/* Budget progress bar */}
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">지출 증빙 완료액:</span>
                      <span className="font-semibold text-gray-900">
                        <span className="text-crimson-700 font-mono">{receiptsSum.toLocaleString()}원</span> /{' '}
                        <span className="text-gray-400 font-mono">{plan.budget.toLocaleString()}원</span> ({budgetPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-crimson-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${budgetPercent}%` }}
                      />
                    </div>
                  </div>

                  {plan.status === '반려' && plan.rejectReason && (
                    <div className="mt-1 p-2 bg-red-50 text-red-800 text-[11px] rounded-lg border border-red-100">
                      <b>반려 사유:</b> {plan.rejectReason}
                    </div>
                  )}

                  <div className="flex justify-end mt-1">
                    <span className="text-[11px] text-crimson-700 font-semibold flex items-center gap-0.5">
                      {isPlanActive ? '상세 접기' : '증빙 영수증 확인 및 OCR 등록 (' + plan.receipts.length + '개)'}
                    </span>
                  </div>
                </div>

                {/* Expanded Section: Receipts & OCR */}
                {isPlanActive && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-700">증빙 영수증 내역 ({plan.receipts.length}건)</span>
                      
                      {canModify && plan.status !== '승인완료' && (
                        <button
                          onClick={() => setIsReceiptModalOpen(true)}
                          className="flex items-center gap-1 bg-gray-900 text-white hover:bg-gray-800 text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>영수증 추가 (AI OCR)</span>
                        </button>
                      )}
                    </div>

                    {/* Receipts List inside Plan */}
                    {plan.receipts.length === 0 ? (
                      <div className="text-center py-6 text-xs text-gray-400">
                        첨부된 증빙 영수증이 없습니다. 영수증을 촬영하거나 업로드하여 AI 정산을 시작하세요.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {plan.receipts.map((rec) => (
                          <div
                            key={rec.id}
                            className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-start gap-2 shadow-xs"
                          >
                            <div className="flex gap-2.5 min-w-0 flex-1">
                              {/* Interactive Thumbnail */}
                              <div
                                onClick={() => setPreviewingReceipt(rec)}
                                className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-gray-400 shrink-0 overflow-hidden cursor-zoom-in hover:opacity-80 transition-opacity"
                                title="증빙 파일 크게 보기"
                              >
                                {rec.imageUrl && rec.imageUrl.startsWith('data:application/pdf') ? (
                                  <div className="flex flex-col items-center justify-center bg-red-50 w-full h-full text-red-700">
                                    <FileText className="w-5 h-5 text-red-600" />
                                    <span className="text-[8px] font-bold uppercase">PDF</span>
                                  </div>
                                ) : rec.imageUrl && rec.imageUrl !== '/placeholder_receipt.png' ? (
                                  <img src={rec.imageUrl} className="w-full h-full object-cover" alt="Thumb" referrerPolicy="no-referrer" />
                                ) : (
                                  <ReceiptIcon className="w-5 h-5 text-gray-400" />
                                )}
                              </div>

                              <div className="space-y-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-xs text-gray-900 truncate">{rec.merchant}</span>
                                  <span className="text-[10px] text-gray-400 font-mono shrink-0">{rec.date}</span>
                                </div>
                                <div className="text-xs font-semibold text-crimson-700 font-mono">
                                  {rec.amount.toLocaleString()}원
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
                                  <span className="flex items-center gap-0.5 shrink-0">
                                    <CreditCard className="w-3 h-3 text-gray-400" />
                                    {rec.paymentMethod}
                                  </span>
                                  {rec.manuallyEdited && (
                                    <span className="bg-amber-50 text-amber-700 px-1 py-0.2 rounded font-medium text-[9px] shrink-0">
                                      수동보정됨
                                    </span>
                                  )}
                                  {rec.memo && <span className="text-gray-400 font-normal truncate">| {rec.memo}</span>}
                                </div>
                              </div>
                            </div>

                            {canModify && plan.status !== '승인완료' && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => openEditReceiptModal(plan, rec)}
                                  className="p-1 text-gray-400 hover:text-indigo-700 hover:bg-indigo-50 rounded cursor-pointer transition-colors"
                                  title="영수증 수동 수정"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteReceipt(plan, rec.id)}
                                  className="p-1 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer transition-colors"
                                  title="영수증 삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Approver Controls (Director ONLY or Admin) */}
                    {(isDirector || currentUser.role === 'admin') && plan.status === '기안' && (
                      <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
                        <button
                          onClick={() => handleRejectPlan(plan.id)}
                          className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs px-3.5 py-1.5 rounded-lg border border-red-200 font-semibold cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>지출 반려</span>
                        </button>
                        <button
                          onClick={() => handleApprovePlan(plan.id)}
                          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-1.5 rounded-lg font-semibold shadow-sm cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>최종 승인</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Receipt OCR Upload Modal */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className={`bg-white rounded-2xl overflow-hidden shadow-2xl animate-scaleIn w-full transition-all duration-300 ${
            receiptImage ? 'max-w-4xl' : 'max-w-md'
          }`}>
            <div className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <ReceiptIcon className="w-4 h-4 text-crimson-400" />
                <span className="text-xs font-bold font-display">
                  {editingReceiptId ? '경비 증빙 영수증 정보 수동 수정' : '경비 증빙 영수증 OCR 정산'}
                </span>
              </div>
              <button onClick={closeReceiptModal} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className={receiptImage ? 'grid grid-cols-1 md:grid-cols-12 gap-5' : 'space-y-4'}>
                
                {/* Left Side: Attachment Preview (if uploaded/present) */}
                {receiptImage && (
                  <div className="md:col-span-5 space-y-2 border border-gray-200 rounded-xl p-3 bg-gray-50 flex flex-col">
                    <span className="block text-[11px] font-bold text-gray-700">📎 첨부된 증빙 서류/사진</span>
                    
                    <div className="relative border rounded-lg overflow-hidden bg-white flex items-center justify-center flex-1 min-h-[220px] max-h-[360px]">
                      {receiptImage.startsWith('data:application/pdf') ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                          <FileText className="w-12 h-12 text-red-600 mb-2 shrink-0 animate-bounce" />
                          <span className="text-xs font-bold text-gray-900 block truncate max-w-full">스캔된 PDF 문서</span>
                          <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold mt-1">파일 로드 성공</span>
                          <embed src={receiptImage} type="application/pdf" className="w-full h-48 mt-2 border rounded" />
                        </div>
                      ) : (
                        <img 
                          src={receiptImage} 
                          className="max-h-[320px] object-contain hover:scale-105 transition-transform duration-200" 
                          alt="Receipt Preview" 
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 text-center mt-1.5 leading-tight">
                      좌측 서류 정보를 보며 우측 OCR 인식값에 오탈자가 있다면 직접 검증하여 수정해 주세요.
                    </p>
                  </div>
                )}

                {/* Right Side: Upload triggers & form fields */}
                <div className={receiptImage ? 'md:col-span-7 space-y-4' : 'space-y-4'}>
                  
                  {/* Sample receipts selector (Hidden during edit) */}
                  {!editingReceiptId && (
                    <div className="space-y-1.5">
                      <span className="block text-[11px] font-semibold text-gray-500">빠른 데모용 샘플 영수증 선택</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {SAMPLE_RECEIPTS.map((sam, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSample(sam)}
                            className="bg-crimson-50/50 hover:bg-crimson-50 border border-crimson-100 text-crimson-900 rounded-lg p-1.5 text-[10px] text-left leading-tight transition-colors cursor-pointer"
                          >
                            <div className="font-semibold truncate">{sam.name}</div>
                            <div className="font-mono mt-0.5 text-crimson-700">{sam.amount.toLocaleString()}원</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Real file uploader */}
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center space-y-2 bg-white">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mx-auto flex flex-col items-center gap-1.5 text-gray-500 hover:text-crimson-700 cursor-pointer"
                    >
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-xs font-semibold">
                        {receiptImage ? '다른 증빙 파일로 교체하기' : '영수증 사진 촬영 또는 파일 업로드'}
                      </span>
                    </button>
                    <p className="text-[10px] text-gray-400">모바일 카메라 촬영, 이미지 파일 및 PDF 스캔 문서 지원</p>
                    {!editingReceiptId && (
                      <button
                        type="button"
                        onClick={handleMockFileUpload}
                        className="inline-flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-[11px] px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>목업 영수증 업로드로 OCR 테스트</span>
                      </button>
                    )}
                    
                    {!editingReceiptId && !receiptImage && (
                      <div className="pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptImage('/placeholder_receipt.png');
                            setOcrResult({
                              date: new Date().toISOString().split('T')[0],
                              amount: 0,
                              merchant: '',
                              paymentMethod: '',
                            });
                            setManualDate(new Date().toISOString().split('T')[0]);
                            setManualAmount('');
                            setManualMerchant('');
                            setManualPayment('');
                            setReceiptMemo('');
                          }}
                          className="text-[11px] text-crimson-700 hover:underline font-semibold cursor-pointer"
                        >
                          💡 영수증 파일 없이 직접 수동 입력하여 등록하기
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Loading indicator */}
                  {isOcrLoading && (
                    <div className="bg-crimson-50 text-crimson-900 border border-crimson-100 rounded-xl p-4 flex flex-col items-center justify-center gap-2 animate-pulse text-center">
                      <RefreshCw className="w-6 h-6 animate-spin text-crimson-700" />
                      <div className="text-xs font-semibold flex items-center gap-1">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Gemini AI가 영수증 정보를 정확히 식별 중입니다...</span>
                      </div>
                      <span className="text-[10px] text-gray-500">거래일자, 이용금액, 사용처, 결제수단을 정밀 파싱 중입니다.</span>
                    </div>
                  )}

                  {/* Error block */}
                  {ocrError && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>{ocrError}</div>
                    </div>
                  )}

                  {/* Manual inputs & OCR verification */}
                  {(ocrResult || receiptImage) && (
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-3">
                      <div className="text-xs font-bold text-gray-900 flex items-center justify-between pb-1 border-b border-gray-200">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-crimson-700 animate-spin" />
                          <span>
                            {editingReceiptId 
                              ? '영수증 수동 입력 및 검증' 
                              : '영수증 AI 정보 분석 및 검증 (수동 보정)'}
                          </span>
                        </span>
                        <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-bold">
                          수동 수정 활성화됨
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="col-span-1">
                          <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">거래일자</label>
                          <input
                            type="date"
                            value={manualDate}
                            onChange={(e) => setManualDate(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-crimson-600"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">이용금액(원)</label>
                          <input
                            type="number"
                            value={manualAmount}
                            onChange={(e) => setManualAmount(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-crimson-600"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">사용처 (상호명)</label>
                          <input
                            type="text"
                            value={manualMerchant}
                            onChange={(e) => setManualMerchant(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-crimson-600"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">결제수단 (카드사 등)</label>
                          <input
                            type="text"
                            value={manualPayment}
                            onChange={(e) => setManualPayment(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-crimson-600"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">메모 (선택)</label>
                          <input
                            type="text"
                            value={receiptMemo}
                            onChange={(e) => setReceiptMemo(e.target.value)}
                            placeholder="예: 선수단 영양제 및 훈련용 음료수 보급"
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-crimson-600"
                          />
                        </div>
                      </div>

                      <div className="text-[10px] text-gray-400">
                        * AI OCR이 읽은 항목에 누락 또는 오탈자가 있는 경우 위 입력 칸을 직접 수정하시면 안전하게 증빙이 반영됩니다.
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Footer with save actions */}
            <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={closeReceiptModal}
                className="bg-white border border-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-lg cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveReceipt}
                disabled={!receiptImage && !ocrResult}
                className={`text-white text-xs px-4 py-1.5 rounded-lg font-medium shadow-sm flex items-center gap-1 cursor-pointer ${
                  receiptImage || ocrResult ? 'bg-crimson-700 hover:bg-crimson-800' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{editingReceiptId ? '수정 완료' : '영수증 등록'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Preview Modal for Receipts */}
      {previewingReceipt && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-scaleIn">
            <div className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center">
              <span className="text-xs font-bold">{previewingReceipt.merchant} - 증빙 첨부파일 미리보기</span>
              <button 
                onClick={() => setPreviewingReceipt(null)} 
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex flex-col items-center justify-center bg-gray-100 min-h-[300px]">
              {previewingReceipt.imageUrl && previewingReceipt.imageUrl.startsWith('data:application/pdf') ? (
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-center gap-2 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200">
                    <FileText className="w-6 h-6 text-red-600" />
                    <span className="text-xs font-semibold">PDF 형식의 문서 증빙 파일이 첨부되어 있습니다.</span>
                  </div>
                  <iframe 
                    src={previewingReceipt.imageUrl} 
                    className="w-full h-[450px] border rounded shadow-sm bg-white" 
                    title="PDF Preview"
                  />
                  <div className="flex justify-center">
                    <a
                      href={previewingReceipt.imageUrl}
                      download={`증빙_${previewingReceipt.merchant}_${previewingReceipt.date}.pdf`}
                      className="inline-flex items-center gap-1.5 bg-crimson-700 hover:bg-crimson-800 text-white text-xs px-3 py-2 rounded-lg font-medium shadow-sm transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 rotate-180" />
                      <span>PDF 파일 다운로드</span>
                    </a>
                  </div>
                </div>
              ) : previewingReceipt.imageUrl && previewingReceipt.imageUrl !== '/placeholder_receipt.png' ? (
                <div className="space-y-3 text-center w-full">
                  <div className="max-h-[500px] overflow-auto border rounded bg-white p-2 shadow-inner">
                    <img 
                      src={previewingReceipt.imageUrl} 
                      className="max-h-[450px] mx-auto object-contain" 
                      alt="Receipt Attachment" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex justify-center">
                    <a
                      href={previewingReceipt.imageUrl}
                      download={`증빙_${previewingReceipt.merchant}_${previewingReceipt.date}.png`}
                      className="inline-flex items-center gap-1.5 bg-crimson-700 hover:bg-crimson-800 text-white text-xs px-3 py-2 rounded-lg font-medium shadow-sm transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 rotate-180" />
                      <span>이미지 다운로드</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <ReceiptIcon className="w-16 h-16 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">실제 파일이 업로드되지 않은 샘플 영수증입니다.</p>
                </div>
              )}
            </div>
            <div className="bg-gray-50 border-t px-4 py-3 text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span><b>가맹점:</b> {previewingReceipt.merchant}</span>
                <span><b>일자:</b> {previewingReceipt.date}</span>
              </div>
              <div className="flex justify-between">
                <span><b>지출 금액:</b> <b className="text-crimson-700">{previewingReceipt.amount.toLocaleString()}원</b></span>
                <span><b>결제수단:</b> {previewingReceipt.paymentMethod}</span>
              </div>
              {previewingReceipt.memo && (
                <div className="text-gray-600 bg-white p-2 rounded border border-gray-200 mt-1.5">
                  <b>메모:</b> {previewingReceipt.memo}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
