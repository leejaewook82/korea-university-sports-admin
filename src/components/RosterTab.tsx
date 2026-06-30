import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Athlete, SportType, User } from '../types';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  ShieldAlert,
  ArrowUpDown,
  RefreshCw,
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Database
} from 'lucide-react';

interface RosterTabProps {
  athletes: Athlete[];
  activeSport: SportType;
  onSportChange: (sport: SportType) => void;
  currentUser: User;
  onAddAthlete: (athlete: Omit<Athlete, 'id'>) => Promise<void>;
  onAddAthletesBulk: (athletes: Omit<Athlete, 'id'>[]) => Promise<void>;
  onUpdateAthlete: (id: string, athlete: Omit<Athlete, 'id'>) => Promise<void>;
  onDeleteAthlete: (id: string) => Promise<void>;
}

export default function RosterTab({
  athletes,
  activeSport,
  onSportChange,
  currentUser,
  onAddAthlete,
  onAddAthletesBulk,
  onUpdateAthlete,
  onDeleteAthlete,
}: RosterTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | '재학' | '휴학'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);

  // Excel Bulk registration states
  const [regMode, setRegMode] = useState<'individual' | 'bulk'>('individual');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [uploadFileName, setUploadFileName] = useState('');
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [positionOrEvent, setPositionOrEvent] = useState('');
  const [status, setStatus] = useState<'재학' | '휴학'>('재학');
  const [errorMsg, setErrorMsg] = useState('');

  // Permission Check (Only admin, director, coach can modify)
  const canModify =
    currentUser.role === 'admin' ||
    ((currentUser.role === 'director' || currentUser.role === 'coach') && currentUser.sport === activeSport);

  const soccerCount = athletes.filter((a) => a.sport === 'soccer').length;
  const archeryCount = athletes.filter((a) => a.sport === 'archery').length;

  const handleSportTabChange = (sport: SportType) => {
    if (sport === activeSport) return;
    onSportChange(sport);
    setSearchTerm('');
    setStatusFilter('all');
    setIsFormOpen(false);
    setEditingAthlete(null);
  };

  // Filter and Search athletes
  const filteredAthletes = athletes.filter((a) => {
    if (a.sport !== activeSport) return false;
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.studentId.includes(searchTerm) ||
      a.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.positionOrEvent.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openAddForm = () => {
    setEditingAthlete(null);
    setName('');
    setStudentId('');
    setDepartment('국제스포츠학부');
    setPositionOrEvent(activeSport === 'soccer' ? 'FW (공격수)' : '리커브');
    setStatus('재학');
    setErrorMsg('');
    setRegMode('individual');
    setPreviewRows([]);
    setUploadFileName('');
    setIsFormOpen(true);
  };

  const downloadTemplate = () => {
    // Define headers and dynamic sample data based on activeSport
    const headers = ['이름', '학번', '학과', '포지션_또는_종목', '재학상태'];
    const sampleData = activeSport === 'soccer' 
      ? [
          { '이름': '김하늘', '학번': '202311001', '학과': '국제스포츠학부', '포지션_또는_종목': 'FW (공격수)', '재학상태': '재학' },
          { '이름': '박소율', '학번': '202411012', '학과': '체육학과', '포지션_또는_종목': 'MF (미드필더)', '재학상태': '재학' },
          { '이름': '이서연', '학번': '202211045', '학과': '국제스포츠학부', '포지션_또는_종목': 'DF (수비수)', '재학상태': '휴학' }
        ]
      : [
          { '이름': '정지우', '학번': '202312001', '학과': '국제스포츠학부', '포지션_또는_종목': '리커브', '재학상태': '재학' },
          { '이름': '한나래', '학번': '202412015', '학과': '체육학과', '포지션_또는_종목': '컴파운드', '재학상태': '재학' },
          { '이름': '최준서', '학번': '202212030', '학과': '체육학과', '포지션_또는_종목': '리커브', '재학상태': '휴학' }
        ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '선수등록_템플릿');
    
    XLSX.writeFile(workbook, `KU_Athletes_Template_${activeSport === 'soccer' ? 'Soccer' : 'Archery'}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Get JSON rows
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        if (jsonData.length === 0) {
          setErrorMsg('업로드한 엑셀 파일에 데이터가 없습니다.');
          return;
        }

        const parsed = jsonData.map((row, idx) => {
          // Normalize names
          const nameVal = (row['이름'] || row['성명'] || row['Name'] || '').toString().trim();
          const studentIdVal = (row['학번'] || row['학번(숫자만)'] || row['Student ID'] || row['ID'] || '').toString().trim();
          const deptVal = (row['학과'] || row['소속'] || row['소속학과'] || row['Department'] || '').toString().trim();
          
          let posVal = (row['포지션_또는_종목'] || row['포지션'] || row['세부종목'] || row['종목'] || row['Position'] || row['Event'] || '').toString().trim();
          if (!posVal) {
            posVal = activeSport === 'soccer' ? 'FW (공격수)' : '리커브';
          }

          let statusVal = (row['재학상태'] || row['상태'] || row['재학여부'] || row['Status'] || '재학').toString().trim();
          if (statusVal.includes('휴학')) {
            statusVal = '휴학';
          } else {
            statusVal = '재학';
          }

          // Validation
          const errors: string[] = [];
          if (!nameVal) errors.push('이름 누락');
          if (!studentIdVal) {
            errors.push('학번 누락');
          } else if (studentIdVal.length < 5) {
            errors.push('학번 형식 오류');
          }
          if (!deptVal) errors.push('학과 누락');

          // Normalize positionOrEvent based on activeSport
          let normalizedPos = posVal;
          if (activeSport === 'soccer') {
            if (posVal.toUpperCase().includes('FW') || posVal.includes('공격')) normalizedPos = 'FW (공격수)';
            else if (posVal.toUpperCase().includes('MF') || posVal.includes('미드') || posVal.includes('중원')) normalizedPos = 'MF (미드필더)';
            else if (posVal.toUpperCase().includes('DF') || posVal.includes('수비') || posVal.includes('백')) normalizedPos = 'DF (수비수)';
            else if (posVal.toUpperCase().includes('GK') || posVal.includes('키퍼') || posVal.includes('골')) normalizedPos = 'GK (골키퍼)';
            else normalizedPos = 'FW (공격수)'; // fallback
          } else {
            if (posVal.includes('컴파') || posVal.toUpperCase().includes('COM')) normalizedPos = '컴파운드';
            else normalizedPos = '리커브'; // fallback
          }

          return {
            rowNumber: idx + 2,
            name: nameVal,
            studentId: studentIdVal,
            department: deptVal,
            positionOrEvent: normalizedPos,
            status: statusVal as '재학' | '휴학',
            isValid: errors.length === 0,
            errorString: errors.join(', '),
          };
        });

        setPreviewRows(parsed);
        setErrorMsg('');
      } catch (err) {
        console.error(err);
        setErrorMsg('엑셀 파일을 파싱하는 데 실패했습니다. 파일 손상 여부를 확인하세요.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkSave = async () => {
    const validRows = previewRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setErrorMsg('등록할 수 있는 유효한 선수 데이터가 없습니다.');
      return;
    }

    try {
      setIsSavingBulk(true);
      setErrorMsg('');

      const payload = validRows.map((r) => ({
        sport: activeSport,
        name: r.name,
        studentId: r.studentId,
        department: r.department,
        positionOrEvent: r.positionOrEvent,
        status: r.status,
      }));

      await onAddAthletesBulk(payload);
      
      setIsFormOpen(false);
      setPreviewRows([]);
      setUploadFileName('');
      setErrorMsg('');
      // Give feedback
      alert(`총 ${payload.length}명의 선수가 성공적으로 일괄 등록되었습니다.`);
    } catch (err: any) {
      setErrorMsg(err.message || '일괄 등록 도중 오류가 발생했습니다.');
    } finally {
      setIsSavingBulk(false);
    }
  };

  const openEditForm = (a: Athlete) => {
    setEditingAthlete(a);
    setName(a.name);
    setStudentId(a.studentId);
    setDepartment(a.department);
    setPositionOrEvent(a.positionOrEvent);
    setStatus(a.status);
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErrorMsg('이름을 입력해 주세요.');
    if (!studentId.trim() || studentId.length < 5) return setErrorMsg('올바른 학번을 입력해 주세요.');
    if (!department.trim()) return setErrorMsg('학과를 입력해 주세요.');
    if (!positionOrEvent.trim()) {
      return setErrorMsg(activeSport === 'soccer' ? '포지션을 선택해 주세요.' : '종목을 입력해 주세요.');
    }

    try {
      const payload = {
        sport: activeSport,
        name: name.trim(),
        studentId: studentId.trim(),
        department: department.trim(),
        positionOrEvent: positionOrEvent.trim(),
        status,
      };

      if (editingAthlete) {
        await onUpdateAthlete(editingAthlete.id, payload);
      } else {
        await onAddAthlete(payload);
      }
      setIsFormOpen(false);
      setEditingAthlete(null);
    } catch (err: any) {
      setErrorMsg(err.message || '저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: string, athleteName: string) => {
    if (window.confirm(`정말로 ${athleteName} 학생 선수를 명단에서 삭제하시겠습니까?`)) {
      await onDeleteAthlete(id);
    }
  };

  const downloadRosterExcel = () => {
    if (filteredAthletes.length === 0) {
      alert('다운로드할 선수 명단이 없습니다.');
      return;
    }

    const sportName = activeSport === 'soccer' ? '여자축구부' : '양궁부';
    const rows = filteredAthletes.map((athlete) => ({
      종목: sportName,
      학과: athlete.department,
      학번: athlete.studentId,
      이름: athlete.name,
      포지션: athlete.positionOrEvent,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: ['종목', '학과', '학번', '이름', '포지션'],
    });
    worksheet['!cols'] = [
      { wch: 14 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '선수단 명단');
    const dateStamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `${sportName}_선수단_명단_${dateStamp}.xlsx`);
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
              {soccerCount}명
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
              {archeryCount}명
            </span>
          </button>
        </div>
      </div>

      {/* Header and Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5 font-display">
            <span>{activeSport === 'soccer' ? '⚽ 여자축구부 선수단' : '🏹 양궁부 선수단'}</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono font-normal">
              {filteredAthletes.length}명
            </span>
          </h2>
          <p className="text-xs text-gray-500">학생선수의 정보 및 학적 현황을 조회·관리합니다.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadRosterExcel}
            className="flex items-center gap-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs px-3 py-2 rounded-lg font-medium shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 다운로드</span>
          </button>

          {canModify && !isFormOpen && (
            <button
              onClick={openAddForm}
              className="flex items-center gap-1 bg-crimson-700 hover:bg-crimson-800 text-white text-xs px-3 py-2 rounded-lg font-medium shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>선수 등록</span>
            </button>
          )}
        </div>
      </div>

      {/* Registration & Edition Dialog Form */}
      {isFormOpen && (
        <div className="bg-crimson-50/50 border border-crimson-100 rounded-xl p-4 shadow-inner space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-crimson-100 pb-1.5">
            <h3 className="text-sm font-bold text-crimson-800">
              {editingAthlete ? '선수 정보 수정' : '신규 선수 등록'}
            </h3>
            <button
              onClick={() => setIsFormOpen(false)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Registration Mode Toggles (Hidden when editing a single athlete) */}
          {!editingAthlete && (
            <div className="flex border-b border-crimson-100 mb-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setRegMode('individual');
                  setErrorMsg('');
                }}
                className={`px-4 py-2 font-semibold border-b-2 transition-all cursor-pointer ${
                  regMode === 'individual'
                    ? 'border-crimson-700 text-crimson-800 font-bold'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                개별 선수 등록
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegMode('bulk');
                  setErrorMsg('');
                }}
                className={`px-4 py-2 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  regMode === 'bulk'
                    ? 'border-crimson-700 text-crimson-800 font-bold'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-crimson-600" />
                <span>엑셀 파일 일괄 등록</span>
              </button>
            </div>
          )}

          {regMode === 'individual' || editingAthlete ? (
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-3">
              <div className="col-span-1">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 김민수"
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
                />
              </div>

              <div className="col-span-1">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">학번</label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="예: 202211000"
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600 font-mono"
                />
              </div>

              <div className="col-span-1">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">소속 학과</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="예: 국제스포츠학부"
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
                />
              </div>

              <div className="col-span-1">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  {activeSport === 'soccer' ? '포지션' : '종목 구분'}
                </label>
                {activeSport === 'soccer' ? (
                  <select
                    value={positionOrEvent}
                    onChange={(e) => setPositionOrEvent(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
                  >
                    <option value="FW (공격수)">FW (공격수)</option>
                    <option value="MF (미드필더)">MF (미드필더)</option>
                    <option value="DF (수비수)">DF (수비수)</option>
                    <option value="GK (골키퍼)">GK (골키퍼)</option>
                  </select>
                ) : (
                  <select
                    value={positionOrEvent}
                    onChange={(e) => setPositionOrEvent(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
                  >
                    <option value="리커브">리커브 (Recurve)</option>
                    <option value="컴파운드">컴파운드 (Compound)</option>
                  </select>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">재학 상태</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={status === '재학'}
                      onChange={() => setStatus('재학')}
                      className="accent-crimson-700 w-3.5 h-3.5"
                    />
                    <span>재학</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={status === '휴학'}
                      onChange={() => setStatus('휴학')}
                      className="accent-crimson-700 w-3.5 h-3.5"
                    />
                    <span>휴학</span>
                  </label>
                </div>
              </div>

              {errorMsg && <div className="col-span-2 text-xs text-red-600 font-medium">{errorMsg}</div>}

              <div className="col-span-2 flex justify-end gap-1.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-crimson-700 hover:bg-crimson-800 text-white text-xs px-4 py-1.5 rounded-lg font-medium shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingAthlete ? '수정 완료' : '등록 완료'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-[11px] text-gray-600 leading-normal">
                  <p className="font-semibold text-gray-800">💡 엑셀 일괄 등록 방법:</p>
                  <ol className="list-decimal pl-4 mt-0.5 space-y-0.5">
                    <li>우측의 <b>[템플릿 양식 다운로드]</b>를 받아 선수 정보를 채워주세요.</li>
                    <li>이름, 학번, 학과는 <b>필수 항목</b>이며 포지션/종목, 재학상태 등도 기입 가능합니다.</li>
                    <li>작성이 완료된 파일을 업로드 후 하단의 <b>[일괄 등록 완료]</b>를 누르면 즉시 등록됩니다.</li>
                  </ol>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="shrink-0 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>템플릿 다운로드</span>
                </button>
              </div>

              {/* Drag and drop file area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    setUploadFileName(file.name);
                    const eventMock = { target: { files: [file] } } as any;
                    handleFileUpload(eventMock);
                  }
                }}
                onClick={() => document.getElementById('excel-file-input')?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  uploadFileName
                    ? 'border-crimson-300 bg-crimson-50/10'
                    : 'border-gray-300 hover:border-crimson-400 bg-white hover:bg-gray-50'
                }`}
              >
                <input
                  id="excel-file-input"
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadFileName(file.name);
                      handleFileUpload(e);
                    }
                  }}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center gap-1.5">
                  <FileSpreadsheet className={`w-8 h-8 ${uploadFileName ? 'text-crimson-700 animate-bounce' : 'text-gray-400'}`} />
                  <div>
                    {uploadFileName ? (
                      <div>
                        <p className="text-xs font-bold text-gray-900">{uploadFileName}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">파일 로드 성공! 아래 검증 현황을 확인한 후 저장해 주세요.</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-gray-700">여기에 엑셀 파일을 놓거나, 클릭하여 선택하세요</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">(.xlsx, .xls, .csv 지원)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview Rows Table */}
              {previewRows.length > 0 && (
                <div className="space-y-2 border border-gray-200 rounded-lg bg-white p-3 shadow-sm">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-800">
                      📋 가져온 데이터 검증 현황 ({previewRows.filter(r => r.isValid).length} / {previewRows.length}명 등록 가능)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewRows([]);
                        setUploadFileName('');
                        setErrorMsg('');
                      }}
                      className="text-[10px] text-red-600 hover:underline font-semibold cursor-pointer"
                    >
                      업로드 취소
                    </button>
                  </div>

                  <div className="max-h-44 overflow-y-auto border border-gray-200 rounded text-[11px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 sticky top-0 text-gray-600 border-b border-gray-200 font-semibold">
                        <tr>
                          <th className="p-1.5 border-r border-gray-100 text-center">행</th>
                          <th className="p-1.5 border-r border-gray-100">이름</th>
                          <th className="p-1.5 border-r border-gray-100">학번</th>
                          <th className="p-1.5 border-r border-gray-100">학과</th>
                          <th className="p-1.5 border-r border-gray-100">{activeSport === 'soccer' ? '포지션' : '종목'}</th>
                          <th className="p-1.5 border-r border-gray-100 text-center">상태</th>
                          <th className="p-1.5 text-center">결과</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {previewRows.map((row, idx) => (
                          <tr key={idx} className={row.isValid ? 'hover:bg-gray-50' : 'bg-red-50/50'}>
                            <td className="p-1.5 border-r border-gray-100 text-center font-mono text-gray-400">{row.rowNumber}</td>
                            <td className={`p-1.5 border-r border-gray-100 font-medium ${!row.name && 'text-red-600 font-bold'}`}>
                              {row.name || '(누락)'}
                            </td>
                            <td className={`p-1.5 border-r border-gray-100 font-mono ${!row.studentId && 'text-red-600 font-bold'}`}>
                              {row.studentId || '(누락)'}
                            </td>
                            <td className={`p-1.5 border-r border-gray-100 ${!row.department && 'text-red-600 font-bold'}`}>
                              {row.department || '(누락)'}
                            </td>
                            <td className="p-1.5 border-r border-gray-100 text-gray-500 text-[10px]">
                              {row.positionOrEvent}
                            </td>
                            <td className="p-1.5 border-r border-gray-100 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.status === '재학' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="p-1.5 text-center">
                              {row.isValid ? (
                                <span className="text-emerald-700 font-semibold text-[10px] flex items-center justify-center gap-0.5">
                                  <Check className="w-3 h-3" /> 정상
                                </span>
                              ) : (
                                <span className="text-red-600 font-bold text-[10px] flex items-center justify-center gap-0.5" title={row.errorString}>
                                  <AlertCircle className="w-3 h-3" /> {row.errorString}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {errorMsg && <div className="text-xs text-red-600 font-medium">{errorMsg}</div>}

              <div className="flex justify-end gap-1.5 pt-1.5 border-t border-crimson-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setPreviewRows([]);
                    setUploadFileName('');
                  }}
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleBulkSave}
                  disabled={isSavingBulk || previewRows.filter(r => r.isValid).length === 0}
                  className={`text-white text-xs px-4 py-1.5 rounded-lg font-medium shadow-sm flex items-center gap-1 cursor-pointer ${
                    isSavingBulk || previewRows.filter(r => r.isValid).length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-crimson-700 hover:bg-crimson-800'
                  }`}
                >
                  {isSavingBulk ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Database className="w-3.5 h-3.5" />
                  )}
                  <span>{previewRows.filter(r => r.isValid).length}명 일괄 등록 완료</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="선수 이름, 학번, 학과, 포지션 검색..."
            className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-crimson-600 focus:border-crimson-600"
          />
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              statusFilter === 'all'
                ? 'bg-gray-800 border-gray-800 text-white'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setStatusFilter('재학')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              statusFilter === '재학'
                ? 'bg-emerald-700 border-emerald-700 text-white'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            재학
          </button>
          <button
            onClick={() => setStatusFilter('휴학')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              statusFilter === '휴학'
                ? 'bg-amber-600 border-amber-600 text-white'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            휴학
          </button>
        </div>
      </div>

      {/* Athlete Listing (Desktop Grid / Mobile Flex-Card) */}
      {filteredAthletes.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl bg-gray-50 text-gray-400 text-xs">
          조건에 부합하는 학생선수 데이터가 존재하지 않습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredAthletes.map((a) => (
            <div
              key={a.id}
              className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:border-crimson-100 transition-all flex justify-between items-start"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">{a.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono font-medium">{a.studentId}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      a.status === '재학' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {a.status}
                  </span>
                </div>

                <div className="text-[11px] text-gray-500 space-y-0.5">
                  <div>학과: {a.department}</div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] bg-crimson-50 text-crimson-700 font-semibold px-1.5 py-0.5 rounded">
                      {a.positionOrEvent}
                    </span>
                  </div>
                </div>
              </div>

              {canModify && (
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditForm(a)}
                    className="p-1.5 text-gray-400 hover:text-crimson-700 hover:bg-crimson-50 rounded-lg transition-colors cursor-pointer"
                    title="선수 정보 수정"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id, a.name)}
                    className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="선수 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Manual Helper for non-authorizer view */}
      {!canModify && (
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-[11px] text-gray-500 p-3 rounded-lg">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            현재 <b>{currentUser.name}</b> 계정은 {activeSport === 'soccer' ? '여자축구부' : '양궁부'}에 대한 정보 수정 권한이 없습니다. 상단에서 감독 또는 코치로 역할을 변경하시면 신규 등록 및 수정이 가능합니다.
          </span>
        </div>
      )}
    </div>
  );
}
