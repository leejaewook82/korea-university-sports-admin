export type SportType = 'soccer' | 'archery';

export type UserRole = 'admin' | 'director' | 'coach' | 'professor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  sport?: SportType;
  password?: string;
  note?: string;
}

export interface Athlete {
  id: string;
  sport: SportType;
  name: string;
  studentId: string; // 학번
  department: string; // 학과
  positionOrEvent: string; // 포지션 (축구) 또는 세부종목 (양궁)
  status: '재학' | '휴학';
}

export interface Receipt {
  id: string;
  imageUrl: string;
  date: string; // YYYY-MM-DD
  amount: number;
  merchant: string; // 사용처
  paymentMethod: string; // 결제 수단
  ocrStatus: 'pending' | 'success' | 'failed';
  manuallyEdited: boolean;
  memo?: string;
}

export interface ExpensePlan {
  id: string;
  type: '훈련' | '대회';
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  purpose: string;
  budget: number;
  receipts: Receipt[];
  status: '기안' | '승인완료' | '반려';
  rejectReason?: string;
  createdBy: string; // User email
  createdByName: string;
  sport: SportType;
  createdAt: string;
}

export interface TripSchedule {
  date: string;
  time: string;
  description: string;
}

export interface TripExpenses {
  dailyAllowanceRate: number;
  dailyAllowanceDays: number;
  dailyAllowanceTotal: number;
  foodRate: number;
  foodDays: number;
  foodTotal: number;
  lodgingRate: number;
  lodgingDays: number;
  lodgingTotal: number;
  total: number;
}

export interface BankAccount {
  bank: string;
  number: string;
  holder: string;
}

export interface TripRequest {
  id: string;
  department: string;
  name: string;
  position: string;
  destination: string;
  purpose: string;
  startDate: string;
  endDate: string;
  schedule: TripSchedule[];
  expectedExpenses: TripExpenses;
  account: BankAccount;
  attachments: string[]; // URLs
  status: '기안' | '최종승인' | '반려';
  rejectReason?: string;
  createdBy: string; // User email
  sport: SportType;
  createdAt: string;
}

export interface TripReportReceipt {
  id: string;
  date: string;
  amount: number;
  paymentMethod: string;
  receiptUrl: string;
  memo: string;
}

export interface TripReport {
  id: string;
  tripRequestId?: string; // 연동된 출장 계획서 ID
  name: string;
  department: string;
  position: string; // 직위/직책
  startDate: string;
  endDate: string;
  destination: string;
  activities: string; // 주요 활동 내용
  expenses: TripReportReceipt[];
  attachments: string[]; // 증빙 사진 (최대 10장)
  status: '기안' | '최종승인' | '반려';
  rejectReason?: string;
  createdBy: string; // User email
  sport: SportType;
  createdAt: string;
}

export interface ApprovalLine {
  id: string;
  name: string;
  minAmount: number; // 기준 최소금액
  steps: {
    role: UserRole;
    name: string;
  }[];
}

export interface DatabaseState {
  users: User[];
  athletes: Athlete[];
  expenses: ExpensePlan[];
  tripRequests: TripRequest[];
  tripReports: TripReport[];
  approvalLines: ApprovalLine[];
}
