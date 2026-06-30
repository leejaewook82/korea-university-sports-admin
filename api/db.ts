import fs from 'fs';
import path from 'path';
import { DatabaseState, User, Athlete, ExpensePlan, TripRequest, TripReport, ApprovalLine } from '../types';

const DB_PATH = path.join(process.cwd(), 'db.json');

const INITIAL_USERS: User[] = [
  { id: '1', email: 'admin@ku.ac.kr', name: '이재욱 (시스템관리자)', role: 'admin', password: 'ku1234!' },
  { id: '2', email: 'soccer.dir@ku.ac.kr', name: '김태희 (여자축구부 감독)', role: 'director', sport: 'soccer' },
  { id: '3', email: 'archery.coach@ku.ac.kr', name: '이민우 (양궁부 코치)', role: 'coach', sport: 'archery' },
  { id: '4', email: 'professor@ku.ac.kr', name: '박지성 (체육부장 교수)', role: 'professor' },
];

const INITIAL_ATHLETES: Athlete[] = [
  // 여자축구부 (soccer)
  { id: 's1', sport: 'soccer', name: '김지현', studentId: '202111001', department: '국제스포츠학부', positionOrEvent: 'FW (공격수)', status: '재학' },
  { id: 's2', sport: 'soccer', name: '박예은', studentId: '202211024', department: '국제스포츠학부', positionOrEvent: 'MF (미드필더)', status: '재학' },
  { id: 's3', sport: 'soccer', name: '이소민', studentId: '202311085', department: '체육학과', positionOrEvent: 'DF (수비수)', status: '재학' },
  { id: 's4', sport: 'soccer', name: '최다빈', studentId: '202111043', department: '국제스포츠학부', positionOrEvent: 'GK (골키퍼)', status: '휴학' },
  { id: 's5', sport: 'soccer', name: '정주희', studentId: '202211099', department: '체육학과', positionOrEvent: 'MF (미드필더)', status: '재학' },
  
  // 양궁부 (archery)
  { id: 'a1', sport: 'archery', name: '정우재', studentId: '202112002', department: '체육학과', positionOrEvent: '리커브', status: '재학' },
  { id: 'a2', sport: 'archery', name: '한지수', studentId: '202212015', department: '국제스포츠학부', positionOrEvent: '컴파운드', status: '재학' },
  { id: 'a3', sport: 'archery', name: '윤준호', studentId: '202312008', department: '체육학과', positionOrEvent: '리커브', status: '휴학' },
  { id: 'a4', sport: 'archery', name: '강동원', studentId: '202212041', department: '체육학과', positionOrEvent: '리커브', status: '재학' },
];

const INITIAL_EXPENSES: ExpensePlan[] = [
  {
    id: 'exp1',
    type: '훈련',
    title: '여자축구부 하계 특별 강화훈련',
    startDate: '2026-07-01',
    endDate: '2026-07-10',
    location: '강원도 강릉 종합운동장 보조구장',
    purpose: '전술 이해도 증진 및 기초 체력 강화',
    budget: 3500000,
    createdBy: 'soccer.dir@ku.ac.kr',
    createdByName: '김태희 (여자축구부 감독)',
    sport: 'soccer',
    status: '기안',
    createdAt: '2026-06-25T10:00:00Z',
    receipts: [
      {
        id: 'rec1_1',
        imageUrl: '/placeholder_receipt.png',
        date: '2026-06-24',
        amount: 850000,
        merchant: '정동진 펜션식 리조트',
        paymentMethod: '하나법인(4215)',
        ocrStatus: 'success',
        manuallyEdited: false,
        memo: '훈련지 선납 예약 숙박비'
      },
      {
        id: 'rec1_2',
        imageUrl: '/placeholder_receipt.png',
        date: '2026-06-25',
        amount: 340000,
        merchant: '시골밥상 강릉점',
        paymentMethod: '하나법인(4215)',
        ocrStatus: 'success',
        manuallyEdited: false,
        memo: '사전 답사 식사비'
      }
    ]
  },
  {
    id: 'exp2',
    type: '대회',
    title: '양궁부 제45회 전국 남녀 양궁대회 참전',
    startDate: '2026-07-15',
    endDate: '2026-07-18',
    location: '경북 예천 진호국제양궁장',
    purpose: '전국 단위 양궁 대회 메달 획득 및 개인 랭킹전 점수 확보',
    budget: 1800000,
    createdBy: 'archery.coach@ku.ac.kr',
    createdByName: '이민우 (양궁부 코치)',
    sport: 'archery',
    status: '승인완료',
    createdAt: '2026-06-20T14:30:00Z',
    receipts: [
      {
        id: 'rec2_1',
        imageUrl: '/placeholder_receipt.png',
        date: '2026-06-20',
        amount: 450000,
        merchant: '예천 활체험센터 식당',
        paymentMethod: 'KB개인(7824)',
        ocrStatus: 'success',
        manuallyEdited: true,
        memo: '대회 참전용 공식 장비 점검 식대 소급 청구'
      }
    ]
  }
];

const INITIAL_TRIP_REQUESTS: TripRequest[] = [
  {
    id: 'trip1',
    department: '고려대학교 세종캠퍼스 체육부 (여자축구부)',
    name: '김태희',
    position: '감독',
    destination: '강원도 강릉시 일대',
    purpose: '하계 전지훈련 사전 답사 및 경기장 컨디션 체크',
    startDate: '2026-06-29',
    endDate: '2026-06-30',
    schedule: [
      { date: '2026-06-29', time: '10:00', description: '세종캠퍼스 출발 및 강릉 이동' },
      { date: '2026-06-29', time: '14:00', description: '강릉 종합운동장 시설 미팅 및 대관 서류 제출' },
      { date: '2026-06-30', time: '09:00', description: '선수단 숙소 예정지 후보군 방문 실사' },
      { date: '2026-06-30', time: '16:00', description: '세종캠퍼스 복귀 및 답사보고 정리' }
    ],
    expectedExpenses: {
      dailyAllowanceRate: 20000,
      dailyAllowanceDays: 2,
      dailyAllowanceTotal: 40000,
      foodRate: 25000,
      foodDays: 2,
      foodTotal: 50000,
      lodgingRate: 60000,
      lodgingDays: 1,
      lodgingTotal: 60000,
      total: 150000
    },
    account: {
      bank: '하나은행',
      number: '102-910243-98407',
      holder: '김태희'
    },
    attachments: [],
    status: '기안',
    createdBy: 'soccer.dir@ku.ac.kr',
    sport: 'soccer',
    createdAt: '2026-06-28T09:00:00Z'
  },
  {
    id: 'trip2',
    department: '고려대학교 세종캠퍼스 체육부 (양궁부)',
    name: '이민우',
    position: '코치',
    destination: '경북 예천 진호국제양궁장',
    purpose: '전국양궁대회 시설 확인 및 대진표 추첨 참석',
    startDate: '2026-06-22',
    endDate: '2026-06-23',
    schedule: [
      { date: '2026-06-22', time: '13:00', description: '경북 예천 양궁장 도착 및 대진 회의 참석' },
      { date: '2026-06-23', time: '10:00', description: '공식 경기 필드 잔디 상태 확인 및 장비 컨테이너 조율' }
    ],
    expectedExpenses: {
      dailyAllowanceRate: 20000,
      dailyAllowanceDays: 2,
      dailyAllowanceTotal: 40000,
      foodRate: 25000,
      foodDays: 2,
      foodTotal: 50000,
      lodgingRate: 50000,
      lodgingDays: 1,
      lodgingTotal: 50000,
      total: 140000
    },
    account: {
      bank: '국민은행',
      number: '423102-04-192847',
      holder: '이민우'
    },
    attachments: [],
    status: '최종승인',
    createdBy: 'archery.coach@ku.ac.kr',
    sport: 'archery',
    createdAt: '2026-06-18T10:00:00Z'
  }
];

const INITIAL_TRIP_REPORTS: TripReport[] = [
  {
    id: 'report1',
    tripRequestId: 'trip2',
    name: '이민우',
    department: '고려대학교 세종캠퍼스 체육부 (양궁부)',
    position: '코치',
    startDate: '2026-06-22',
    endDate: '2026-06-23',
    destination: '경북 예천 진호국제양궁장',
    activities: '대회 조직위와 면담을 진행하여 선수 대진표를 추첨하였습니다. 리커브 전 종목에서 우리 선수단 4인의 조 편성을 완료하고 장비 보관 가건물 배정 협의를 완료하였습니다.',
    expenses: [
      {
        id: 'tr_rec1',
        date: '2026-06-22',
        amount: 28400,
        paymentMethod: '국인법인(4821)',
        receiptUrl: '/placeholder_receipt.png',
        memo: 'KTX 서울->김천구미 편도 열차권'
      },
      {
        id: 'tr_rec2',
        date: '2026-06-22',
        amount: 65000,
        merchant: '예천 파크모텔',
        paymentMethod: '국인법인(4821)',
        receiptUrl: '/placeholder_receipt.png',
        memo: '1박 숙박 영수증 (승인 금액 한도 준수)'
      }
    ] as any, // dynamic schema compatibility
    attachments: [],
    status: '기안',
    createdBy: 'archery.coach@ku.ac.kr',
    sport: 'archery',
    createdAt: '2026-06-24T11:00:00Z'
  }
];

const INITIAL_APPROVAL_LINES: ApprovalLine[] = [
  {
    id: 'app_line_1',
    name: '기본 경비 승인 (감독 전결)',
    minAmount: 0,
    steps: [
      { role: 'director', name: '해당 운동부 감독' }
    ]
  },
  {
    id: 'app_line_2',
    name: '지도자 출장 승인 (체육부장 전결)',
    minAmount: 0,
    steps: [
      { role: 'professor', name: '체육부장 교수' }
    ]
  }
];

export function getDatabase(): DatabaseState {
  if (!fs.existsSync(DB_PATH)) {
    const initialState: DatabaseState = {
      users: INITIAL_USERS,
      athletes: INITIAL_ATHLETES,
      expenses: INITIAL_EXPENSES,
      tripRequests: INITIAL_TRIP_REQUESTS,
      tripReports: INITIAL_TRIP_REPORTS,
      approvalLines: INITIAL_APPROVAL_LINES,
    };
    saveDatabase(initialState);
    return initialState;
  }

  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse database, resetting to initial state', e);
    const initialState: DatabaseState = {
      users: INITIAL_USERS,
      athletes: INITIAL_ATHLETES,
      expenses: INITIAL_EXPENSES,
      tripRequests: INITIAL_TRIP_REQUESTS,
      tripReports: INITIAL_TRIP_REPORTS,
      approvalLines: INITIAL_APPROVAL_LINES,
    };
    saveDatabase(initialState);
    return initialState;
  }
}

export function saveDatabase(state: DatabaseState): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf-8');
}
