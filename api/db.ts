import fs from 'fs';
import path from 'path';
import { DatabaseState } from './types';

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.DATA_DIR || process.cwd();
const DB_PATH = path.join(DATA_DIR, 'db.json');
const SEED_DB_PATH = path.join(process.cwd(), 'db.json');

const EMPTY_DATABASE: DatabaseState = {
  users: [],
  athletes: [],
  expenses: [],
  tripRequests: [],
  tripReports: [],
  approvalLines: [],
};

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function normalizeDatabase(raw: Partial<DatabaseState>): DatabaseState {
  return {
    users: Array.isArray(raw.users) ? raw.users : [],
    athletes: Array.isArray(raw.athletes) ? raw.athletes : [],
    expenses: Array.isArray(raw.expenses) ? raw.expenses : [],
    tripRequests: Array.isArray(raw.tripRequests) ? raw.tripRequests : [],
    tripReports: Array.isArray(raw.tripReports) ? raw.tripReports : [],
    approvalLines: Array.isArray(raw.approvalLines) ? raw.approvalLines : [],
  };
}

function seedDatabaseIfNeeded() {
  ensureDataDirectory();

  if (fs.existsSync(DB_PATH)) return;

  if (SEED_DB_PATH !== DB_PATH && fs.existsSync(SEED_DB_PATH)) {
    fs.copyFileSync(SEED_DB_PATH, DB_PATH);
    return;
  }

  saveDatabase(EMPTY_DATABASE);
}

export function getDatabase(): DatabaseState {
  seedDatabaseIfNeeded();

  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return normalizeDatabase(JSON.parse(data));
  } catch (error) {
    console.error(`Failed to read database at ${DB_PATH}. Resetting to empty state.`, error);
    saveDatabase(EMPTY_DATABASE);
    return EMPTY_DATABASE;
  }
}

export function saveDatabase(state: DatabaseState): void {
  ensureDataDirectory();
  fs.writeFileSync(DB_PATH, JSON.stringify(normalizeDatabase(state), null, 2), 'utf-8');
}

export function getDatabasePath(): string {
  return DB_PATH;
}
