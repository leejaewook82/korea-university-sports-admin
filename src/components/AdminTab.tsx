import React, { useState } from 'react';
import { ApprovalLine, SportType, User, UserRole } from '../types';
import {
  Settings,
  Download,
  Sliders,
  Check,
  Plus,
  Trash2,
  Users,
  CreditCard,
  Briefcase,
  AlertCircle,
  TrendingUp,
  Printer
} from 'lucide-react';

interface AdminTabProps {
  approvalLines: ApprovalLine[];
  onUpdateApprovalLines: (lines: ApprovalLine[]) => Promise<void>;
  currentUser: User;
  athletesCount: number;
  expensesCount: number;
  tripsCount: number;
}

export default function AdminTab({
  approvalLines,
  onUpdateApprovalLines,
  currentUser,
  athletesCount,
  expensesCount,
  tripsCount,
}: AdminTabProps) {
  const [lines, setLines] = useState<ApprovalLine[]>(approvalLines);
  const [successMsg, setSuccessMsg] = useState('');

  const isAdmin = currentUser.role === 'admin';

  const handleAddStep = (lineId: string) => {
    const updated = lines.map((l) => {
      if (l.id === lineId) {
        return {
          ...l,
          steps: [...l.steps, { role: 'professor' as UserRole, name: '체육부장 교수' }]
        };
      }
      return l;
    });
    setLines(updated);
  };

  const handleRemoveStep = (lineId: string, stepIdx: number) => {
    const updated = lines.map((l) => {
      if (l.id === lineId) {
        return {
          ...l,
          steps: l.steps.filter((_, idx) => idx !== stepIdx)
        };
      }
      return l;
    });
    setLines(updated);
  };

  const handleStepRoleChange = (lineId: string, stepIdx: number, role: UserRole) => {
    const roleNames: Record<UserRole, string> = {
      admin: '시스템 관리자',
      director: '운동부 감독',
      coach: '운동부 코치',
      professor: '체육부장 교수'
    };

    const updated = lines.map((l) => {
      if (l.id === lineId) {
        const copySteps = [...l.steps];
        copySteps[stepIdx] = {
          role,
          name: roleNames[role]
        };
        return { ...l, steps: copySteps };
      }
      return l;
    });
    setLines(updated);
  };

  const handleMinAmountChange = (lineId: string, amt: number) => {
    const updated = lines.map((l) => {
      if (l.id === lineId) {
        return { ...l, minAmount: amt };
      }
      return l;
    });
    setLines(updated);
  };

  const handleSaveApprovalLines = async () => {
    try {
      await onUpdateApprovalLines(lines);
      setSuccessMsg('결재선 조건 설정이 안전하게 데이터베이스에 반영되었습니다.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('결재선 설정 저장 중 실패했습니다.');
    }
  };

  const handleDownloadCsv = (type: 'expenses' | 'trips') => {
    window.open(`/api/export/${type}`, '_blank');
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5 font-display">
          <Settings className="w-5 h-5 text-crimson-700" />
          <span>시스템 관리자 설정 및 데이터 제어</span>
        </h2>
        <p className="text-xs text-gray-500">결재 조건 및 데이터 보관소 다운로드를 제어합니다.</p>
      </div>

      {/* Overview Stats Bento Box */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] text-gray-500 font-bold block">전체 선수단</span>
          <span className="text-xl font-bold text-gray-950 font-mono mt-1">{athletesCount}명</span>
          <span className="text-[9px] text-gray-400 mt-0.5">등록 기준</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] text-gray-500 font-bold block">정산 완료 경비</span>
          <span className="text-xl font-bold text-gray-950 font-mono mt-1">{expensesCount}건</span>
          <span className="text-[9px] text-gray-400 mt-0.5">훈련/대회 종합</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] text-gray-500 font-bold block">신청 여비 내역</span>
          <span className="text-xl font-bold text-gray-950 font-mono mt-1">{tripsCount}건</span>
          <span className="text-[9px] text-gray-400 mt-0.5">계획/보고서 포함</span>
        </div>
      </div>

      {/* CSV Export & Print Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1">
          <Download className="w-4 h-4 text-crimson-700" />
          <span>통합 행정 보고서 및 백업 다운로드</span>
        </h3>
        <p className="text-[11px] text-gray-500">엑셀과 즉시 호환되는 UTF-8 BOM CSV 파일로 운동부 데이터 내보내기를 수행합니다.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1.5">
          <button
            onClick={() => handleDownloadCsv('expenses')}
            className="flex items-center justify-center gap-1.5 bg-gray-900 text-white hover:bg-gray-800 text-xs px-3 py-2 rounded-lg font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>경비 지출 내역 (CSV)</span>
          </button>
          
          <button
            onClick={() => handleDownloadCsv('trips')}
            className="flex items-center justify-center gap-1.5 bg-gray-900 text-white hover:bg-gray-800 text-xs px-3 py-2 rounded-lg font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>지도자 출장 내역 (CSV)</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="flex items-center justify-center gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs px-3 py-2 rounded-lg font-medium cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>화면 출력 (PDF 인쇄)</span>
          </button>
        </div>
      </div>

      {/* Interactive Approval Line Configuration */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1">
          <Sliders className="w-4 h-4 text-crimson-700" />
          <span>조건부 결재선 및 전결 설정 (관리자 기능)</span>
        </h3>
        <p className="text-[11px] text-gray-500">지출액 한도 및 보고서 구분에 따라 최종 결재 라인을 유연하게 가감합니다.</p>

        {isAdmin ? (
          <div className="space-y-4 pt-1">
            {lines.map((line) => (
              <div key={line.id} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-1 border-b border-gray-200 pb-2">
                  <span className="font-bold text-xs text-gray-900">{line.name}</span>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span>최소 기안액 기준:</span>
                    <input
                      type="number"
                      value={line.minAmount}
                      onChange={(e) => handleMinAmountChange(line.id, Number(e.target.value))}
                      className="w-20 bg-white border border-gray-300 rounded px-1.5 py-0.5 text-center font-mono font-semibold"
                    />
                    <span>원</span>
                  </div>
                </div>

                {/* Steps mapping */}
                <div className="space-y-2">
                  <span className="block text-[10px] text-gray-400 font-bold">결재선 결재 단계 (순차적 승인):</span>
                  <div className="flex flex-col gap-2">
                    {line.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200 text-xs">
                        <span className="bg-crimson-700 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold font-mono text-[10px]">
                          {idx + 1}
                        </span>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="font-semibold text-gray-700">결재자 역할:</span>
                          <select
                            value={step.role}
                            onChange={(e) => handleStepRoleChange(line.id, idx, e.target.value as UserRole)}
                            className="bg-gray-50 border border-gray-300 rounded px-2 py-0.5"
                          >
                            <option value="director">소속 운동부 감독 (최종 결재)</option>
                            <option value="coach">코치 (실무 검토)</option>
                            <option value="professor">체육부장 교수 (최종 승인)</option>
                            <option value="admin">시스템 관리자</option>
                          </select>
                        </div>
                        {line.steps.length > 1 && (
                          <button
                            onClick={() => handleRemoveStep(line.id, idx)}
                            className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                            title="결재자 단계 제거"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleAddStep(line.id)}
                    className="flex items-center gap-0.5 text-crimson-700 hover:underline text-[11px] font-semibold pt-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>결재선 승인자 추가</span>
                  </button>
                </div>
              </div>
            ))}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-2.5 rounded-lg font-medium flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleSaveApprovalLines}
                className="bg-crimson-700 hover:bg-crimson-800 text-white text-xs px-4 py-2 rounded-lg font-bold shadow-md cursor-pointer"
              >
                결재선 정책 저장하기
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              이 부분은 <b>시스템 관리자 (Admin)</b> 계정 전용 설정 영역입니다. 상단 시뮬레이터에서 역할 권한을 '시스템 관리자'로 설정해 주시면 직접 결재 단계를 조작하고 저장할 수 있습니다.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
