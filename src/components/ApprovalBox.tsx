import React from 'react';
import { ExpensePlan, TripRequest, TripReport, User } from '../types';
import {
  FileCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  Briefcase,
  User as UserIcon,
  ChevronRight,
  TrendingUp,
  MapPin,
  Calendar
} from 'lucide-react';

interface ApprovalBoxProps {
  expenses: ExpensePlan[];
  tripRequests: TripRequest[];
  tripReports: TripReport[];
  currentUser: User;
  onUpdateExpense: (id: string, expense: Partial<ExpensePlan>) => Promise<void>;
  onUpdateTripRequest: (id: string, trip: Partial<TripRequest>) => Promise<void>;
  onUpdateTripReport: (id: string, report: Partial<TripReport>) => Promise<void>;
}

export default function ApprovalBox({
  expenses,
  tripRequests,
  tripReports,
  currentUser,
  onUpdateExpense,
  onUpdateTripRequest,
  onUpdateTripReport,
}: ApprovalBoxProps) {
  const isDirector = currentUser.role === 'director';
  const isProfessor = currentUser.role === 'professor';
  const isAdmin = currentUser.role === 'admin';

  // Filters for Director: Pending expenses belonging to their own sport
  const pendingExpenses = expenses.filter(
    (e) => e.status === '기안' && (isAdmin || (isDirector && e.sport === currentUser.sport))
  );

  // Filters for Professor: All pending trip requests & reports
  const pendingTripRequests = tripRequests.filter(
    (t) => t.status === '기안' && (isAdmin || isProfessor)
  );

  const pendingTripReports = tripReports.filter(
    (r) => r.status === '기안' && (isAdmin || isProfessor)
  );

  const totalPending = pendingExpenses.length + pendingTripRequests.length + pendingTripReports.length;

  const handleApproveExpense = async (id: string) => {
    if (window.confirm('이 경비 지출 증빙을 최종 승인하시겠습니까?')) {
      await onUpdateExpense(id, { status: '승인완료' });
    }
  };

  const handleRejectExpense = async (id: string) => {
    const reason = window.prompt('반려 사유를 입력해 주세요:');
    if (reason !== null) {
      await onUpdateExpense(id, { status: '반려', rejectReason: reason.trim() });
    }
  };

  const handleApproveTripRequest = async (id: string) => {
    if (window.confirm('이 출장 계획서를 최종 승인하시겠습니까?')) {
      await onUpdateTripRequest(id, { status: '최종승인' });
    }
  };

  const handleRejectTripRequest = async (id: string) => {
    const reason = window.prompt('반려 사유를 입력해 주세요:');
    if (reason !== null) {
      await onUpdateTripRequest(id, { status: '반려', rejectReason: reason.trim() });
    }
  };

  const handleApproveTripReport = async (id: string) => {
    if (window.confirm('이 출장 결과 보고서를 최종 승인하시겠습니까?')) {
      await onUpdateTripReport(id, { status: '최종승인' });
    }
  };

  const handleRejectTripReport = async (id: string) => {
    const reason = window.prompt('반려 사유를 입력해 주세요:');
    if (reason !== null) {
      await onUpdateTripReport(id, { status: '반려', rejectReason: reason.trim() });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5 font-display">
          <FileCheck className="w-5 h-5 text-crimson-700" />
          <span>결재 대기 문서함</span>
          <span className="text-xs bg-crimson-100 text-crimson-800 font-bold px-2.5 py-0.5 rounded-full font-mono animate-pulse">
            {totalPending}건
          </span>
        </h2>
        <p className="text-xs text-gray-500">
          현재 나의 계정 권한(<b>{currentUser.name}</b>)에 대기 중인 결재선 목록입니다.
        </p>
      </div>

      {totalPending === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-300 rounded-xl bg-gray-50 text-gray-400 text-xs">
          현재 내 검토 권한에 해당하는 결재 대기 기안서가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. Expenses block (For Director / Admin) */}
          {pendingExpenses.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-600 block">■ 경비 지출 결재 요청 ({pendingExpenses.length}건)</span>
              {pendingExpenses.map((e) => (
                <div key={e.id} className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-1.5 rounded">훈련/대회 경비</span>
                        <h4 className="text-xs font-bold text-gray-900">{e.title}</h4>
                      </div>
                      <span className="text-[10px] text-gray-500 block mt-0.5">
                        기안자: {e.createdByName} | 예산: {e.budget.toLocaleString()}원
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-crimson-700">
                      실지출: {e.receipts.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}원
                    </span>
                  </div>

                  {/* Receipts counts inside */}
                  <div className="bg-gray-50 p-2.5 rounded text-[11px] text-gray-600 border border-gray-200 space-y-1">
                    <span className="font-semibold block">등록 증빙 영수증 ({e.receipts.length}건):</span>
                    {e.receipts.map((rec) => (
                      <div key={rec.id} className="flex justify-between">
                        <span>• {rec.merchant} ({rec.date})</span>
                        <span className="font-mono font-medium">{rec.amount.toLocaleString()}원</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => handleRejectExpense(e.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 text-[11px] px-3 py-1.5 rounded-lg border border-red-200 font-semibold cursor-pointer"
                    >
                      지출 반려
                    </button>
                    <button
                      onClick={() => handleApproveExpense(e.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-3.5 py-1.5 rounded-lg font-semibold shadow-xs cursor-pointer"
                    >
                      전결 최종승인
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. Business Trip Requests (For Professor / Admin) */}
          {pendingTripRequests.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-600 block">■ 지도자 출장 계획 결재 요청 ({pendingTripRequests.length}건)</span>
              {pendingTripRequests.map((tr) => (
                <div key={tr.id} className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-crimson-100 text-crimson-800 text-[9px] font-bold px-1.5 rounded">
                          {tr.sport === 'soccer' ? '축구부' : '양궁부'} {tr.name} {tr.position}
                        </span>
                        <h4 className="text-xs font-bold text-gray-900">{tr.purpose}</h4>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span>출장지: {tr.destination}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>기간: {tr.startDate} ~ {tr.endDate}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-crimson-700">
                      여비합계: {tr.expectedExpenses.total.toLocaleString()}원
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      onClick={() => handleRejectTripRequest(tr.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 text-[11px] px-3 py-1.5 rounded-lg border border-red-200 font-semibold cursor-pointer"
                    >
                      출장 반려
                    </button>
                    <button
                      onClick={() => handleApproveTripRequest(tr.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-3.5 py-1.5 rounded-lg font-semibold shadow-xs cursor-pointer"
                    >
                      출장 승인
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. Business Trip Reports (For Professor / Admin) */}
          {pendingTripReports.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-600 block">■ 지도자 출장 보고 결재 요청 ({pendingTripReports.length}건)</span>
              {pendingTripReports.map((rp) => (
                <div key={rp.id} className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 rounded">출장보고서 (방안A)</span>
                        <h4 className="text-xs font-bold text-gray-900">{rp.name} 지도자의 출장 결과 보고</h4>
                      </div>
                      <span className="text-[10px] text-gray-500 block mt-1">출장지: {rp.destination} | 기간: {rp.startDate} ~ {rp.endDate}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-crimson-700">
                      실정산액: {rp.expenses.reduce((sum, rx) => sum + rx.amount, 0).toLocaleString()}원
                    </span>
                  </div>

                  {/* Summary contents */}
                  <div className="bg-gray-50 p-2.5 rounded border border-gray-200 text-xs">
                    <div className="font-semibold text-gray-700 mb-0.5">핵심 활동 요약:</div>
                    <p className="text-gray-600 text-[11px] leading-relaxed whitespace-pre-line">{rp.activities}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => handleRejectTripReport(rp.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 text-[11px] px-3 py-1.5 rounded-lg border border-red-200 font-semibold cursor-pointer"
                    >
                      보고서 반려
                    </button>
                    <button
                      onClick={() => handleApproveTripReport(rp.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-3.5 py-1.5 rounded-lg font-semibold shadow-xs cursor-pointer"
                    >
                      최종 승인
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
