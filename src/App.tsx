import React, { useState, useEffect } from 'react';
import { User, Athlete, ExpensePlan, TripRequest, TripReport, ApprovalLine, SportType } from './types';
import RoleSwitcher from './components/RoleSwitcher';
import RosterTab from './components/RosterTab';
import TrainingPlanTab from './components/TrainingPlanTab';
import BudgetTab from './components/BudgetTab';
import BusinessTripTab from './components/BusinessTripTab';
import ApprovalBox from './components/ApprovalBox';
import AdminTab from './components/AdminTab';
import {
  Users,
  Receipt,
  Plane,
  FileCheck,
  Settings,
  Bell,
  Clock,
  LogOut,
  Sparkles,
  Trophy,
  Shield,
  HelpCircle,
  UserCog,
  ClipboardList
} from 'lucide-react';

export default function App() {
  // Navigation
  type ActiveTab = 'account' | 'roster' | 'training' | 'budget' | 'trip' | 'inbox' | 'admin';
  const validTabs: ActiveTab[] = ['account', 'roster', 'training', 'budget', 'trip', 'inbox', 'admin'];
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const savedTab = window.sessionStorage.getItem('ku-active-tab') as ActiveTab | null;
    return savedTab && validTabs.includes(savedTab) ? savedTab : 'roster';
  });
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeSport, setActiveSport] = useState<SportType>('soccer');
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [expenses, setExpenses] = useState<ExpensePlan[]>([]);
  const [tripRequests, setTripRequests] = useState<TripRequest[]>([]);
  const [tripReports, setTripReports] = useState<TripReport[]>([]);
  const [approvalLines, setApprovalLines] = useState<ApprovalLine[]>([]);

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [uRes, aRes, eRes, trqRes, trpRes, appRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/athletes'),
        fetch('/api/expenses'),
        fetch('/api/trips/requests'),
        fetch('/api/trips/reports'),
        fetch('/api/admin/approval-lines'),
      ]);

      if (!uRes.ok || !aRes.ok || !eRes.ok || !trqRes.ok || !trpRes.ok || !appRes.ok) {
        throw new Error('데이터베이스 로드 중 통신 오류가 발생했습니다.');
      }

      const [usersData, athletesData, expensesData, trqData, trpData, appData] = await Promise.all([
        uRes.json(),
        aRes.json(),
        eRes.json(),
        trqRes.json(),
        trpRes.json(),
        appRes.json(),
      ]);

      setUsers(usersData);
      setAthletes(athletesData);
      setExpenses(expensesData);
      setTripRequests(trqData);
      setTripReports(trpData);
      setApprovalLines(appData);

      // Set default user if not selected
      if (!currentUser && usersData.length > 0) {
        // Default to admin for account management testing.
        const defaultUser = usersData.find((u: User) => u.role === 'admin') || usersData[0];
        setCurrentUser(defaultUser);
        if (defaultUser.sport) {
          setActiveSport(defaultUser.sport);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('서버 데이터를 불러오지 못했습니다. 개발 서버를 확인해 주세요: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem('ku-active-tab', activeTab);
  }, [activeTab]);

  const handleUserChange = (user: User) => {
    setCurrentUser(user);
    if (user.sport) {
      setActiveSport(user.sport);
    }
  };

  const handleSportChange = (sport: SportType) => {
    setActiveSport(sport);
  };

  // --- ATHLETES OPERATIONS ---
  const handleAddAthlete = async (athletePayload: Omit<Athlete, 'id'>) => {
    const res = await fetch('/api/athletes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(athletePayload),
    });
    if (!res.ok) throw new Error('선수 등록 실패');
    await fetchData(); // refresh
  };

  const handleBulkAddAthletes = async (athletesPayload: Omit<Athlete, 'id'>[]) => {
    const res = await fetch('/api/athletes/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athletes: athletesPayload }),
    });
    if (!res.ok) throw new Error('선수 일괄 등록 실패');
    await fetchData(); // refresh
  };

  const handleUpdateAthlete = async (id: string, athletePayload: Omit<Athlete, 'id'>) => {
    const res = await fetch(`/api/athletes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(athletePayload),
    });
    if (!res.ok) throw new Error('선수 정보 수정 실패');
    await fetchData();
  };

  const handleDeleteAthlete = async (id: string) => {
    const res = await fetch(`/api/athletes/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('선수 삭제 실패');
    await fetchData();
  };

  // --- EXPENSE PLANS OPERATIONS ---
  const handleAddExpense = async (expensePayload: Omit<ExpensePlan, 'id' | 'createdAt'>) => {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expensePayload),
    });
    if (!res.ok) throw new Error('경비 계획 생성 실패');
    await fetchData();
  };

  const handleUpdateExpense = async (id: string, expensePayload: Partial<ExpensePlan>) => {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expensePayload),
    });
    if (!res.ok) throw new Error('경비 정산 수정 실패');
    await fetchData();
  };

  const handleDeleteExpense = async (id: string) => {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('경비 계획 삭제 실패');
    await fetchData();
  };

  // --- TRIP REQUEST OPERATIONS ---
  const handleAddTripRequest = async (tripPayload: Omit<TripRequest, 'id' | 'createdAt'>) => {
    const res = await fetch('/api/trips/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tripPayload),
    });
    if (!res.ok) throw new Error('출장 계획 등록 실패');
    await fetchData();
  };

  const handleUpdateTripRequest = async (id: string, tripPayload: Partial<TripRequest>) => {
    const res = await fetch(`/api/trips/requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tripPayload),
    });
    if (!res.ok) throw new Error('출장 계획 수정 실패');
    await fetchData();
  };

  const handleDeleteTripRequest = async (id: string) => {
    const res = await fetch(`/api/trips/requests/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('출장 계획 삭제 실패');
    await fetchData();
  };

  // --- TRIP REPORT OPERATIONS ---
  const handleAddTripReport = async (reportPayload: Omit<TripReport, 'id' | 'createdAt'>) => {
    const res = await fetch('/api/trips/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportPayload),
    });
    if (!res.ok) throw new Error('출장 결과 보고 등록 실패');
    await fetchData();
  };

  const handleUpdateTripReport = async (id: string, reportPayload: Partial<TripReport>) => {
    const res = await fetch(`/api/trips/reports/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportPayload),
    });
    if (!res.ok) throw new Error('출장 결과 보고 수정 실패');
    await fetchData();
  };

  const handleDeleteTripReport = async (id: string) => {
    const res = await fetch(`/api/trips/reports/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('출장 보고 삭제 실패');
    await fetchData();
  };

  // --- ADMIN APPROVAL LINES POLICY ---
  const handleUpdateApprovalLines = async (newLines: ApprovalLine[]) => {
    const res = await fetch('/api/admin/approval-lines', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLines),
    });
    if (!res.ok) throw new Error('결재선 정책 저장 실패');
    await fetchData();
  };

  // --- USER OPERATIONS ---
  const handleAddUser = async (userPayload: Omit<User, 'id'>) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload),
    });
    if (!res.ok) throw new Error('계정 추가 실패');
    await fetchData();
  };

  const handleUpdateUser = async (id: string, userPayload: Partial<User>) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload),
    });
    if (!res.ok) throw new Error('계정 정보 수정 실패');
    await fetchData();
    
    // If the edited user is the current user, update state as well
    if (currentUser && currentUser.id === id) {
      const dbUsers = await fetch('/api/users').then(r => r.json());
      const updated = dbUsers.find((u: User) => u.id === id);
      if (updated) {
        setCurrentUser(updated);
        if (updated.sport) {
          setActiveSport(updated.sport);
        }
      }
    }
  };

  const handleDeleteUser = async (id: string) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('계정 삭제 실패');
    await fetchData();
    
    // If deleted user was current user, switch to another
    if (currentUser?.id === id) {
      const dbUsers = await fetch('/api/users').then(r => r.json());
      if (dbUsers.length > 0) {
        const fallbackUser = dbUsers.find((u: User) => u.role === 'director') || dbUsers[0];
        setCurrentUser(fallbackUser);
        if (fallbackUser.sport) {
          setActiveSport(fallbackUser.sport);
        }
      } else {
        setCurrentUser(null);
      }
    }
  };

  const handleReorderUsers = async (userIds: string[]) => {
    const res = await fetch('/api/users/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds }),
    });
    if (!res.ok) throw new Error('계정 순서 저장 실패');
    await fetchData();
  };

  // Total pending count for Badge
  const isDirector = currentUser?.role === 'director';
  const isProfessor = currentUser?.role === 'professor';
  const isAdmin = currentUser?.role === 'admin';

  const pendingExpCount = expenses.filter(
    (e) => e.status === '기안' && (isAdmin || (isDirector && e.sport === currentUser?.sport))
  ).length;

  const pendingTripReqCount = tripRequests.filter(
    (t) => t.status === '기안' && (isAdmin || isProfessor)
  ).length;

  const pendingTripRepCount = tripReports.filter(
    (r) => r.status === '기안' && (isAdmin || isProfessor)
  ).length;

  const totalPendingInInbox = pendingExpCount + pendingTripReqCount + pendingTripRepCount;

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="space-y-4 text-center">
          <Trophy className="w-10 h-10 animate-bounce text-crimson-700 mx-auto" />
          <div className="space-y-1.5">
            <h3 className="font-bold text-gray-900 text-sm">고려대학교 세종캠퍼스 운동부 통합 행정지원 시스템</h3>
            <p className="text-xs text-gray-400">데이터 보관소 및 AI 리소스를 동기화 중입니다...</p>
          </div>
          <div className="w-24 bg-gray-200 h-1 rounded-full overflow-hidden mx-auto">
            <div className="bg-crimson-700 h-full w-2/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-row font-sans overflow-hidden">
      
      {/* 1. Desktop Dark Sidebar */}
      <aside className="w-80 shrink-0 bg-gray-900 text-white flex flex-col justify-between border-r border-gray-800 p-5 print:hidden">
        <div className="space-y-6">
          
          {/* Brand Header */}
          <div className="flex items-center gap-3 pb-2 border-b border-gray-800">
            <div className="w-9 h-9 bg-crimson-700 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md shadow-crimson-900/30 shrink-0">
              KU
            </div>
            <div>
              <h1 className="text-xs font-black tracking-tight text-white leading-tight">
                고려대학교 세종캠퍼스
              </h1>
              <span className="text-[10px] text-crimson-400 font-bold block leading-none mt-0.5">
                운동부 통합 행정지원 시스템
              </span>
            </div>
          </div>

          {/* Account management entry point */}
          <button
            onClick={() => setActiveTab('account')}
            className={`w-full bg-gray-800/50 border border-gray-800 p-4 rounded-xl text-left transition-all cursor-pointer ${
              activeTab === 'account'
                ? 'ring-1 ring-crimson-500 bg-gray-800 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-crimson-700 flex items-center justify-center shrink-0">
                  <UserCog className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold">계정 관리</span>
                  <span className="block text-[10px] text-gray-400 truncate">
                    {currentUser.name} · {currentUser.role === 'admin' ? '관리자' : currentUser.role === 'professor' ? '교수' : currentUser.role === 'director' ? '감독' : '코치'}
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* Primary Navigation Menu */}
          <nav className="space-y-1">
            <span className="block text-[10px] text-gray-500 font-bold tracking-wider px-2.5 pb-2">
              MENU CATEGORIES
            </span>

            <button
              onClick={() => setActiveTab('roster')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'roster'
                  ? 'bg-crimson-800/95 text-white shadow-md'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>선수단 명단 관리</span>
            </button>

            <button
              onClick={() => setActiveTab('training')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'training'
                  ? 'bg-crimson-800/95 text-white shadow-md'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span>외부훈련(대회) 참가 계획서</span>
            </button>

            <button
              onClick={() => setActiveTab('budget')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'budget'
                  ? 'bg-crimson-800/95 text-white shadow-md'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Receipt className="w-4 h-4 shrink-0" />
              <span>경비 계획 및 지출 정산</span>
            </button>

            <button
              onClick={() => setActiveTab('trip')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'trip'
                  ? 'bg-crimson-800/95 text-white shadow-md'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Plane className="w-4 h-4 shrink-0" />
              <span>지도자 출장 관리</span>
            </button>

            <button
              onClick={() => setActiveTab('inbox')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'inbox'
                  ? 'bg-crimson-800/95 text-white shadow-md'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileCheck className="w-4 h-4 shrink-0" />
                <span>결재 대기 문서함</span>
              </div>
              {totalPendingInInbox > 0 && (
                <span className="bg-crimson-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold font-mono animate-pulse">
                  {totalPendingInInbox}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-crimson-800/95 text-white shadow-md'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>시스템 설정 및 관리</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Metadata Card */}
        <div className="bg-gray-800/30 border border-gray-800/50 p-3 rounded-lg text-[10px] text-gray-500 space-y-1">
          <div>• 접속자: {currentUser.name} 님 ({currentUser.role === 'admin' ? '관리자' : currentUser.role === 'professor' ? '체육부장 교수' : currentUser.role === 'director' ? '감독' : '코치'})</div>
          <div>• 활성부서: {activeSport === 'soccer' ? '여자축구부' : '양궁부'}</div>
          <div>• 시스템 상태: Standalone MVP</div>
        </div>
      </aside>

      {/* 2. Main Content & Stage Area */}
      <div className="flex-1 min-h-screen flex flex-col overflow-y-auto">
        
        {/* Top Header Bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-crimson-700" />
            <h2 className="font-bold text-gray-900 text-sm">
              고려대학교 세종캠퍼스 운동부 통합 행정지원 시스템
            </h2>
          </div>

          {/* User profile widget */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-gray-800 block leading-tight">{currentUser.name} 님</span>
              <span className="text-[10px] text-crimson-700 font-bold">
                {currentUser.role === 'admin' ? '시스템 관리자' : currentUser.role === 'professor' ? '체육부장 교수' : currentUser.role === 'director' ? '소속 감독' : '소속 코치'}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-crimson-50 border border-crimson-200 flex items-center justify-center font-bold text-crimson-800 text-xs">
              {currentUser.name.substring(0, 2)}
            </div>
          </div>
        </header>

        {/* Real workspace content wrapper */}
        <main className="p-8 max-w-7xl w-full mx-auto flex-1 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-start gap-1.5">
              <HelpCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* Dynamic view switcher */}
          <div className="space-y-4 animate-fadeIn">
            {activeTab === 'account' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 font-display">계정 관리</h2>
                  <p className="text-xs text-gray-500">사용자 계정, 역할, 담당 운동부를 메인 화면에서 관리합니다.</p>
                </div>
                <RoleSwitcher
                  currentUser={currentUser}
                  onUserChange={handleUserChange}
                  users={users}
                  activeSport={activeSport}
                  onSportChange={handleSportChange}
                  onAddUser={handleAddUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                  onReorderUsers={handleReorderUsers}
                  variant="light"
                />
              </div>
            )}

            {activeTab === 'roster' && (
              <RosterTab
                athletes={athletes}
                activeSport={activeSport}
                onSportChange={handleSportChange}
                currentUser={currentUser}
                onAddAthlete={handleAddAthlete}
                onAddAthletesBulk={handleBulkAddAthletes}
                onUpdateAthlete={handleUpdateAthlete}
                onDeleteAthlete={handleDeleteAthlete}
              />
            )}

            {activeTab === 'training' && (
              <TrainingPlanTab
                activeSport={activeSport}
                onSportChange={handleSportChange}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'budget' && (
              <BudgetTab
                expenses={expenses}
                activeSport={activeSport}
                currentUser={currentUser}
                onAddExpense={handleAddExpense}
                onUpdateExpense={handleUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {activeTab === 'trip' && (
              <BusinessTripTab
                tripRequests={tripRequests}
                tripReports={tripReports}
                activeSport={activeSport}
                currentUser={currentUser}
                onAddTripRequest={handleAddTripRequest}
                onUpdateTripRequest={handleUpdateTripRequest}
                onDeleteTripRequest={handleDeleteTripRequest}
                onAddTripReport={handleAddTripReport}
                onUpdateTripReport={handleUpdateTripReport}
                onDeleteTripReport={handleDeleteTripReport}
              />
            )}

            {activeTab === 'inbox' && (
              <ApprovalBox
                expenses={expenses}
                tripRequests={tripRequests}
                tripReports={tripReports}
                currentUser={currentUser}
                onUpdateExpense={handleUpdateExpense}
                onUpdateTripRequest={handleUpdateTripRequest}
                onUpdateTripReport={handleUpdateTripReport}
              />
            )}

            {activeTab === 'admin' && (
              <AdminTab
                approvalLines={approvalLines}
                onUpdateApprovalLines={handleUpdateApprovalLines}
                currentUser={currentUser}
                athletesCount={athletes.filter((a) => a.sport === activeSport).length}
                expensesCount={expenses.filter((e) => e.sport === activeSport && e.status === '승인완료').length}
                tripsCount={
                  tripRequests.filter((t) => t.sport === activeSport).length +
                  tripReports.filter((r) => r.sport === activeSport).length
                }
              />
            )}
          </div>
        </main>
      </div>

      {/* Print-only statistics summary page layout */}
      <div className="hidden print:block bg-white p-8 text-black text-xs space-y-6">
        <div className="text-center pb-4 border-b border-gray-300">
          <h1 className="text-xl font-bold">고려대학교 세종캠퍼스 운동부 통합 행정지원 시스템 - 보고서</h1>
          <p className="text-gray-500 mt-1">인쇄 일자: {new Date().toLocaleString()}</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold border-l-4 border-crimson-700 pl-2">1. 운동부 종합 현황 ({activeSport === 'soccer' ? '여자축구부' : '양궁부'})</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="border p-3 rounded">
              <span className="font-bold block text-gray-600">등록 선수 인원</span>
              <span className="text-lg font-bold">{athletes.filter((a) => a.sport === activeSport).length}명</span>
            </div>
            <div className="border p-3 rounded">
              <span className="font-bold block text-gray-600">지출 영수증 건수</span>
              <span className="text-lg font-bold">
                {expenses.filter((e) => e.sport === activeSport).reduce((sum, e) => sum + e.receipts.length, 0)}건
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold border-l-4 border-crimson-700 pl-2">2. 누적 경비 정산 내역</h2>
          <table className="w-full border-collapse border border-gray-300 text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-1.5 text-left">구분</th>
                <th className="border border-gray-300 p-1.5 text-left">계획명</th>
                <th className="border border-gray-300 p-1.5 text-left">실시지</th>
                <th className="border border-gray-300 p-1.5 text-right">예상예산</th>
                <th className="border border-gray-300 p-1.5 text-right">실제 정산액</th>
                <th className="border border-gray-300 p-1.5 text-center">결재상태</th>
              </tr>
            </thead>
            <tbody>
              {expenses
                .filter((e) => e.sport === activeSport)
                .map((e) => (
                  <tr key={e.id}>
                    <td className="border border-gray-300 p-1.5">{e.type}</td>
                    <td className="border border-gray-300 p-1.5 font-bold">{e.title}</td>
                    <td className="border border-gray-300 p-1.5">{e.location}</td>
                    <td className="border border-gray-300 p-1.5 text-right font-mono">{e.budget.toLocaleString()}원</td>
                    <td className="border border-gray-300 p-1.5 text-right font-mono text-crimson-700 font-bold">
                      {e.receipts.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}원
                    </td>
                    <td className="border border-gray-300 p-1.5 text-center">{e.status}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="text-center pt-12 text-gray-400 text-[9px] border-t border-gray-200">
          본 보고서는 고려대학교 세종캠퍼스 운동부 통합 행정지원 시스템 단독 웹 브라우저 출력을 통해 인쇄되었습니다.
        </div>
      </div>
    </div>
  );
}
