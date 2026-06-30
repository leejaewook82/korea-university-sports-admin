import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import { getDatabase, saveDatabase } from './server/db';
import { Athlete, ExpensePlan, TripRequest, TripReport, User } from '../types';

const app = express();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 환경 변수에 설정되어 있지 않습니다.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });
  }
  return aiClient;
}

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));

// --- API Routes ---

app.get('/api/users', (req, res) => {
  const db = getDatabase();
  res.json(db.users);
});

app.post('/api/users', (req, res) => {
  const db = getDatabase();
  const { email, name, role, sport, password, note } = req.body;
  if (!email || !name || !role) {
    return res.status(400).json({ error: '이메일, 이름, 역할은 필수 입력 항목입니다.' });
  }
  const newUser: User = {
    id: 'usr_' + Date.now().toString(),
    email: email.trim(),
    name: name.trim(),
    role: role,
    sport: (role === 'director' || role === 'coach') ? sport : undefined,
    password: password?.trim() || 'ku1234!',
    note: note?.trim() || '',
  };
  db.users.push(newUser);
  saveDatabase(db);
  res.status(201).json(newUser);
});

app.put('/api/users/reorder', (req, res) => {
  const db = getDatabase();
  const { userIds } = req.body;
  if (!Array.isArray(userIds)) {
    return res.status(400).json({ error: '계정 순서 정보가 올바르지 않습니다.' });
  }
  const orderedUsers = userIds
    .map((id: string) => db.users.find((user) => user.id === id))
    .filter(Boolean) as User[];
  const remainingUsers = db.users.filter((user) => !userIds.includes(user.id));
  db.users = [...orderedUsers, ...remainingUsers];
  saveDatabase(db);
  res.json(db.users);
});

app.put('/api/users/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { email, name, role, sport, password, note } = req.body;
  const userIndex = db.users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  }
  const nextRole = role || db.users[userIndex].role;
  const updatedUser = {
    ...db.users[userIndex],
    email: email ? email.trim() : db.users[userIndex].email,
    name: name ? name.trim() : db.users[userIndex].name,
    role: nextRole,
    sport: (nextRole === 'director' || nextRole === 'coach') ? (sport || db.users[userIndex].sport) : undefined,
    password: password !== undefined ? password.trim() : db.users[userIndex].password,
    note: note !== undefined ? note.trim() : db.users[userIndex].note,
  };
  db.users[userIndex] = updatedUser;
  saveDatabase(db);
  res.json(updatedUser);
});

app.delete('/api/users/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const userIndex = db.users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  }
  const deletedUser = db.users[userIndex];
  db.users.splice(userIndex, 1);
  saveDatabase(db);
  res.json({ success: true, deletedUser });
});

app.get('/api/athletes', (req, res) => {
  const db = getDatabase();
  const { sport } = req.query;
  if (sport) {
    res.json(db.athletes.filter((a) => a.sport === sport));
  } else {
    res.json(db.athletes);
  }
});

app.post('/api/athletes', (req, res) => {
  const db = getDatabase();
  const newAthlete: Athlete = {
    id: 'ath_' + Date.now().toString(),
    sport: req.body.sport,
    name: req.body.name,
    studentId: req.body.studentId,
    department: req.body.department,
    positionOrEvent: req.body.positionOrEvent,
    status: req.body.status || '재학',
  };
  db.athletes.push(newAthlete);
  saveDatabase(db);
  res.status(201).json(newAthlete);
});

app.post('/api/athletes/bulk', (req, res) => {
  const db = getDatabase();
  const athletesList = req.body.athletes;
  if (!Array.isArray(athletesList)) {
    return res.status(400).json({ error: '올바른 선수 데이터 배열이 아닙니다.' });
  }
  const addedAthletes: Athlete[] = [];
  const timestamp = Date.now();
  for (let i = 0; i < athletesList.length; i++) {
    const item = athletesList[i];
    if (!item.name || !item.studentId || !item.department || !item.positionOrEvent) {
      continue;
    }
    const newAthlete: Athlete = {
      id: 'ath_' + (timestamp + i).toString() + '_' + Math.random().toString(36).substring(2, 5),
      sport: item.sport || 'soccer',
      name: item.name.toString().trim(),
      studentId: item.studentId.toString().trim(),
      department: item.department.toString().trim(),
      positionOrEvent: item.positionOrEvent.toString().trim(),
      status: item.status === '휴학' ? '휴학' : '재학',
    };
    db.athletes.push(newAthlete);
    addedAthletes.push(newAthlete);
  }
  saveDatabase(db);
  res.status(201).json(addedAthletes);
});

app.put('/api/athletes/:id', (req, res) => {
  const db = getDatabase();
  const index = db.athletes.findIndex((a) => a.id === req.params.id);
  if (index !== -1) {
    db.athletes[index] = {
      ...db.athletes[index],
      sport: req.body.sport,
      name: req.body.name,
      studentId: req.body.studentId,
      department: req.body.department,
      positionOrEvent: req.body.positionOrEvent,
      status: req.body.status,
    };
    saveDatabase(db);
    res.json(db.athletes[index]);
  } else {
    res.status(404).json({ error: '선수를 찾을 수 없습니다.' });
  }
});

app.delete('/api/athletes/:id', (req, res) => {
  const db = getDatabase();
  const initialLength = db.athletes.length;
  db.athletes = db.athletes.filter((a) => a.id !== req.params.id);
  if (db.athletes.length < initialLength) {
    saveDatabase(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: '선수를 찾을 수 없습니다.' });
  }
});

app.get('/api/expenses', (req, res) => {
  const db = getDatabase();
  const { sport } = req.query;
  if (sport) {
    res.json(db.expenses.filter((e) => e.sport === sport));
  } else {
    res.json(db.expenses);
  }
});

app.post('/api/expenses', (req, res) => {
  const db = getDatabase();
  const newPlan: ExpensePlan = {
    id: 'exp_' + Date.now().toString(),
    type: req.body.type,
    title: req.body.title,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    location: req.body.location,
    purpose: req.body.purpose,
    budget: Number(req.body.budget) || 0,
    receipts: req.body.receipts || [],
    status: req.body.status || '기안',
    createdBy: req.body.createdBy,
    createdByName: req.body.createdByName || req.body.createdBy,
    sport: req.body.sport,
    createdAt: new Date().toISOString(),
  };
  db.expenses.push(newPlan);
  saveDatabase(db);
  res.status(201).json(newPlan);
});

app.put('/api/expenses/:id', (req, res) => {
  const db = getDatabase();
  const index = db.expenses.findIndex((e) => e.id === req.params.id);
  if (index !== -1) {
    db.expenses[index] = {
      ...db.expenses[index],
      type: req.body.type,
      title: req.body.title,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      location: req.body.location,
      purpose: req.body.purpose,
      budget: Number(req.body.budget) || 0,
      receipts: req.body.receipts || db.expenses[index].receipts,
      status: req.body.status || db.expenses[index].status,
      rejectReason: req.body.rejectReason !== undefined ? req.body.rejectReason : db.expenses[index].rejectReason,
    };
    saveDatabase(db);
    res.json(db.expenses[index]);
  } else {
    res.status(404).json({ error: '경비 계획을 찾을 수 없습니다.' });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  const db = getDatabase();
  const initialLength = db.expenses.length;
  db.expenses = db.expenses.filter((e) => e.id !== req.params.id);
  if (db.expenses.length < initialLength) {
    saveDatabase(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: '경비 계획을 찾을 수 없습니다.' });
  }
});

app.get('/api/trips/requests', (req, res) => {
  const db = getDatabase();
  const { sport } = req.query;
  if (sport) {
    res.json(db.tripRequests.filter((t) => t.sport === sport));
  } else {
    res.json(db.tripRequests);
  }
});

app.post('/api/trips/requests', (req, res) => {
  const db = getDatabase();
  const newRequest: TripRequest = {
    id: 'trq_' + Date.now().toString(),
    department: req.body.department,
    name: req.body.name,
    position: req.body.position,
    destination: req.body.destination,
    purpose: req.body.purpose,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    schedule: req.body.schedule || [],
    expectedExpenses: req.body.expectedExpenses || {
      dailyAllowanceRate: 0, dailyAllowanceDays: 0, dailyAllowanceTotal: 0,
      foodRate: 0, foodDays: 0, foodTotal: 0,
      lodgingRate: 0, lodgingDays: 0, lodgingTotal: 0, total: 0,
    },
    account: req.body.account || { bank: '', number: '', holder: '' },
    attachments: req.body.attachments || [],
    status: req.body.status || '기안',
    createdBy: req.body.createdBy,
    sport: req.body.sport,
    createdAt: new Date().toISOString(),
  };
  db.tripRequests.push(newRequest);
  saveDatabase(db);
  res.status(201).json(newRequest);
});

app.put('/api/trips/requests/:id', (req, res) => {
  const db = getDatabase();
  const index = db.tripRequests.findIndex((t) => t.id === req.params.id);
  if (index !== -1) {
    db.tripRequests[index] = {
      ...db.tripRequests[index],
      department: req.body.department,
      name: req.body.name,
      position: req.body.position,
      destination: req.body.destination,
      purpose: req.body.purpose,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      schedule: req.body.schedule || db.tripRequests[index].schedule,
      expectedExpenses: req.body.expectedExpenses || db.tripRequests[index].expectedExpenses,
      account: req.body.account || db.tripRequests[index].account,
      attachments: req.body.attachments || db.tripRequests[index].attachments,
      status: req.body.status || db.tripRequests[index].status,
      rejectReason: req.body.rejectReason !== undefined ? req.body.rejectReason : db.tripRequests[index].rejectReason,
    };
    saveDatabase(db);
    res.json(db.tripRequests[index]);
  } else {
    res.status(404).json({ error: '출장 계획을 찾을 수 없습니다.' });
  }
});

app.delete('/api/trips/requests/:id', (req, res) => {
  const db = getDatabase();
  const initialLength = db.tripRequests.length;
  db.tripRequests = db.tripRequests.filter((t) => t.id !== req.params.id);
  if (db.tripRequests.length < initialLength) {
    saveDatabase(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: '출장 계획을 찾을 수 없습니다.' });
  }
});

app.get('/api/trips/reports', (req, res) => {
  const db = getDatabase();
  const { sport } = req.query;
  if (sport) {
    res.json(db.tripReports.filter((r) => r.sport === sport));
  } else {
    res.json(db.tripReports);
  }
});

app.post('/api/trips/reports', (req, res) => {
  const db = getDatabase();
  const newReport: TripReport = {
    id: 'trp_' + Date.now().toString(),
    tripRequestId: req.body.tripRequestId,
    name: req.body.name,
    department: req.body.department,
    position: req.body.position,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    destination: req.body.destination,
    activities: req.body.activities,
    expenses: req.body.expenses || [],
    attachments: req.body.attachments || [],
    status: req.body.status || '기안',
    createdBy: req.body.createdBy,
    sport: req.body.sport,
    createdAt: new Date().toISOString(),
  };
  db.tripReports.push(newReport);
  saveDatabase(db);
  res.status(201).json(newReport);
});

app.put('/api/trips/reports/:id', (req, res) => {
  const db = getDatabase();
  const index = db.tripReports.findIndex((r) => r.id === req.params.id);
  if (index !== -1) {
    db.tripReports[index] = {
      ...db.tripReports[index],
      tripRequestId: req.body.tripRequestId !== undefined ? req.body.tripRequestId : db.tripReports[index].tripRequestId,
      name: req.body.name,
      department: req.body.department,
      position: req.body.position,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      destination: req.body.destination,
      activities: req.body.activities,
      expenses: req.body.expenses || db.tripReports[index].expenses,
      attachments: req.body.attachments || db.tripReports[index].attachments,
      status: req.body.status || db.tripReports[index].status,
      rejectReason: req.body.rejectReason !== undefined ? req.body.rejectReason : db.tripReports[index].rejectReason,
    };
    saveDatabase(db);
    res.json(db.tripReports[index]);
  } else {
    res.status(404).json({ error: '출장 보고서를 찾을 수 없습니다.' });
  }
});

app.delete('/api/trips/reports/:id', (req, res) => {
  const db = getDatabase();
  const initialLength = db.tripReports.length;
  db.tripReports = db.tripReports.filter((r) => r.id !== req.params.id);
  if (db.tripReports.length < initialLength) {
    saveDatabase(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: '출장 보고서를 찾을 수 없습니다.' });
  }
});

app.get('/api/admin/approval-lines', (req, res) => {
  const db = getDatabase();
  res.json(db.approvalLines);
});

app.put('/api/admin/approval-lines', (req, res) => {
  const db = getDatabase();
  if (Array.isArray(req.body)) {
    db.approvalLines = req.body;
    saveDatabase(db);
    res.json(db.approvalLines);
  } else {
    res.status(400).json({ error: '올바르지 않은 결재선 형식입니다.' });
  }
});

app.get('/api/export/:type', (req, res) => {
  const { type } = req.params;
  const db = getDatabase();
  if (type === 'expenses') {
    let csv = '\uFEFFID,구분,운동부,계획명,기간,장소,예산(원),기안자,상태,영수증수\n';
    db.expenses.forEach((e) => {
      const sportStr = e.sport === 'soccer' ? '여자축구부' : '양궁부';
      csv += `"${e.id}","${e.type}","${sportStr}","${e.title.replace(/"/g, '""')}","${e.startDate} ~ ${e.endDate}","${e.location.replace(/"/g, '""')}","${e.budget}","${e.createdByName || e.createdBy}","${e.status}","${e.receipts.length}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sports_expenses_export.csv"');
    return res.send(csv);
  }
  if (type === 'trips') {
    let csv = '\uFEFFID,구분,운동부,지도자,출장지,기간,출장목적,경비합계(원),상태\n';
    db.tripRequests.forEach((t) => {
      const sportStr = t.sport === 'soccer' ? '여자축구부' : '양궁부';
      csv += `"${t.id}","출장계획","${sportStr}","${t.name} ${t.position}","${t.destination.replace(/"/g, '""')}","${t.startDate} ~ ${t.endDate}","${t.purpose.replace(/"/g, '""')}","${t.expectedExpenses.total}","${t.status}"\n`;
    });
    db.tripReports.forEach((r) => {
      const sportStr = r.sport === 'soccer' ? '여자축구부' : '양궁부';
      const totalExp = r.expenses.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
      csv += `"${r.id}","출장보고","${sportStr}","${r.name} ${r.position}","${r.destination.replace(/"/g, '""')}","${r.startDate} ~ ${r.endDate}","${r.activities.substring(0, 30).replace(/"/g, '""')}...","${totalExp}","${r.status}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sports_trips_export.csv"');
    return res.send(csv);
  }
  res.status(400).json({ error: '올바르지 않은 타입입니다.' });
});

app.post('/api/upload', (req, res) => {
  const { filename, fileType, base64Data } = req.body;
  if (!filename || !base64Data) {
    return res.status(400).json({ error: '파일명과 base64 데이터가 필요합니다.' });
  }
  try {
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);
    fs.writeFileSync(filePath, buffer);
    const fileUrl = `/uploads/${safeFilename}`;
    res.json({ success: true, url: fileUrl });
  } catch (err: any) {
    console.error('File upload failed:', err);
    res.status(500).json({ error: '파일 저장 중 요류 발생: ' + err.message });
  }
});

app.post('/api/ocr', async (req, res) => {
  const { base64Data, mimeType } = req.body;
  if (!base64Data) {
    return res.status(400).json({ error: '영수증 이미지 base64 데이터가 필요합니다.' });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      success: true,
      data: {
        date: '2026-06-29',
        amount: 74500,
        merchant: '세종스포츠용품점',
        paymentMethod: '하나법인카드(4215)',
      },
      mock: true,
    });
  }
  try {
    const ai = getGeminiClient();
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/png',
        data: cleanBase64,
      },
    };
    const promptPart = {
      text: `고려대학교 세종캠퍼스 운동부 경비 증빙 영수증 이미지입니다. 다음 항목들을 정교하게 인식하여 JSON 형식으로만 응답해주세요:
1. date (거래일자, 형식은 반드시 'YYYY-MM-DD'로 맞춰주세요. 만약 년도가 애매하면 2026년으로 설정)
2. amount (이용금액, 숫자 정수)
3. merchant (사용처/상호명, 문자열, 예: '강릉한우촌')
4. paymentMethod (결제 수단, 카드 종류나 카드번호 네자리를 파악하여 작성, 예: '하나카드(4215)' 또는 '개인카드' 등)

영수증의 글씨가 뭉개져서 읽지 못한 필드가 있다면 빈 문자열("") 또는 0(금액의 경우)으로 전달해 주세요.`,
    };
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts: [imagePart, promptPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            amount: { type: Type.INTEGER },
            merchant: { type: Type.STRING },
            paymentMethod: { type: Type.STRING },
          },
          required: ['date', 'amount', 'merchant', 'paymentMethod'],
        },
      },
    });
    const textResult = response.text;
    if (!textResult) {
      throw new Error('Gemini OCR 결과가 비어 있습니다.');
    }
    const parsed = JSON.parse(textResult.trim());
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error('Gemini OCR processing failed:', err);
    res.status(500).json({ error: 'OCR 인식 중 오류 발생: ' + err.message });
  }
});

export default app;
