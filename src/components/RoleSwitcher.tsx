import React, { useState } from 'react';
import { User, UserRole, SportType } from '../types';
import { Check, ChevronDown, ChevronUp, Edit2, Plus, Trash2, UserCog, X } from 'lucide-react';

interface RoleSwitcherProps {
  currentUser: User;
  onUserChange: (user: User) => void;
  users: User[];
  activeSport: SportType;
  onSportChange: (sport: SportType) => void;
  onAddUser: (user: Omit<User, 'id'>) => Promise<void>;
  onUpdateUser: (id: string, user: Partial<User>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onReorderUsers: (userIds: string[]) => Promise<void>;
  variant?: 'dark' | 'light';
}

const roleLabels: Record<UserRole, string> = {
  admin: '관리자',
  professor: '체육부장',
  director: '감독',
  coach: '코치',
};

const sportLabels: Record<'common' | SportType, string> = {
  common: '공통',
  soccer: '여자축구',
  archery: '양궁',
};

const defaultPassword = 'ku1234!';

export default function RoleSwitcher({
  currentUser,
  onUserChange,
  users,
  activeSport,
  onSportChange,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onReorderUsers,
}: RoleSwitcherProps) {
  const isAdmin = currentUser.role === 'admin';
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('coach');
  const [formName, setFormName] = useState('');
  const [formSport, setFormSport] = useState<SportType>('soccer');
  const [formPassword, setFormPassword] = useState(defaultPassword);
  const [errorMsg, setErrorMsg] = useState('');

  const resetForm = () => {
    setEditingUser(null);
    setFormEmail('');
    setFormRole('coach');
    setFormName('');
    setFormSport('soccer');
    setFormPassword(defaultPassword);
    setErrorMsg('');
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormName(user.name);
    setFormSport(user.sport || 'soccer');
    setFormPassword(user.password || defaultPassword);
    setErrorMsg('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formEmail.trim()) return setErrorMsg('아이디를 입력해 주세요.');
    if (!formEmail.includes('@')) return setErrorMsg('아이디는 이메일 형식으로 입력해 주세요.');
    if (!formName.trim()) return setErrorMsg('이름을 입력해 주세요.');
    if (!formPassword.trim()) return setErrorMsg('비밀번호를 입력해 주세요.');

    const payload = {
      email: formEmail.trim(),
      role: formRole,
      name: formName.trim(),
      sport: formRole === 'director' || formRole === 'coach' ? formSport : undefined,
      password: formPassword.trim(),
    };

    try {
      if (editingUser) {
        await onUpdateUser(editingUser.id, payload);
      } else {
        await onAddUser(payload);
      }
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || '계정 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (user: User) => {
    if (user.id === currentUser.id) {
      setErrorMsg('현재 접속 중인 계정은 삭제할 수 없습니다.');
      return;
    }
    if (!window.confirm(`${user.name} 계정을 삭제하시겠습니까?`)) return;
    try {
      await onDeleteUser(user.id);
      if (editingUser?.id === user.id) resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || '계정 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= users.length) return;
    const nextUsers = [...users];
    [nextUsers[index], nextUsers[targetIndex]] = [nextUsers[targetIndex], nextUsers[index]];
    try {
      await onReorderUsers(nextUsers.map((user) => user.id));
    } catch (err: any) {
      setErrorMsg(err.message || '계정 순서 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-crimson-50 text-crimson-700 flex items-center justify-center">
                <UserCog className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{editingUser ? '계정 수정' : '계정 추가'}</h3>
                <p className="text-[11px] text-gray-500">종목은 감독/코치 계정에서 선택하며 표에 별도 표시됩니다.</p>
              </div>
            </div>
            {editingUser && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 px-2.5 py-1.5 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
                신규 입력
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <label className="space-y-1 md:col-span-2">
              <span className="block text-[11px] font-semibold text-gray-600">아이디</span>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="user@ku.ac.kr"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:ring-1 focus:ring-crimson-600 focus:outline-none"
              />
            </label>

            <label className="space-y-1">
              <span className="block text-[11px] font-semibold text-gray-600">직책</span>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as UserRole)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:ring-1 focus:ring-crimson-600 focus:outline-none"
              >
                <option value="admin">관리자</option>
                <option value="professor">체육부장</option>
                <option value="director">감독</option>
                <option value="coach">코치</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="block text-[11px] font-semibold text-gray-600">이름</span>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="홍길동"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:ring-1 focus:ring-crimson-600 focus:outline-none"
              />
            </label>

            <label className="space-y-1">
              <span className="block text-[11px] font-semibold text-gray-600">종목</span>
              <select
                value={formRole === 'director' || formRole === 'coach' ? formSport : 'common'}
                onChange={(e) => setFormSport(e.target.value as SportType)}
                disabled={formRole === 'admin' || formRole === 'professor'}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 focus:ring-1 focus:ring-crimson-600 focus:outline-none"
              >
                <option value="common">공통</option>
                <option value="soccer">여자축구</option>
                <option value="archery">양궁</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="block text-[11px] font-semibold text-gray-600">비밀번호</span>
              <input
                type="text"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:ring-1 focus:ring-crimson-600 focus:outline-none"
              />
            </label>

            <div className="flex items-end md:col-span-1">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 bg-crimson-700 hover:bg-crimson-800 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm"
              >
                {editingUser ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {editingUser ? '수정 저장' : '계정 추가'}
              </button>
            </div>
          </div>

          {errorMsg && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</div>}
        </form>
      )}

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs">
          계정 추가, 수정, 삭제는 관리자 계정에서만 가능합니다. 행을 선택하면 해당 계정으로 화면을 전환할 수 있습니다.
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">계정 목록</h3>
            <p className="text-[11px] text-gray-500">행을 클릭하면 접속 계정이 전환됩니다.</p>
          </div>
          <span className="text-[11px] font-semibold text-crimson-700 bg-crimson-50 px-2 py-1 rounded">
            총 {users.length}개
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed text-xs">
            <colgroup>
              <col className="w-[27%]" />
              <col className="w-[11%]" />
              <col className="w-[16%]" />
              <col className="w-[11%]" />
              <col className="w-[14%]" />
              <col className="w-[21%]" />
            </colgroup>
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="text-left font-semibold px-3 py-2.5 whitespace-nowrap">아이디</th>
                <th className="text-left font-semibold px-3 py-2.5 whitespace-nowrap">직책</th>
                <th className="text-left font-semibold px-3 py-2.5 whitespace-nowrap">이름</th>
                <th className="text-left font-semibold px-3 py-2.5 whitespace-nowrap">종목</th>
                <th className="text-left font-semibold px-3 py-2.5 whitespace-nowrap">비밀번호</th>
                <th className="text-right font-semibold px-3 py-2.5 whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user, index) => {
                const isSelected = user.id === currentUser.id;
                const sportKey = user.sport || 'common';
                return (
                  <tr
                    key={user.id}
                    onClick={() => {
                      onUserChange(user);
                      if (user.sport) onSportChange(user.sport);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-crimson-50/80' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-3 font-mono text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{user.email}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 rounded text-[11px] font-bold ${
                        isSelected ? 'bg-crimson-700 text-white' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-900 font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{user.name}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 rounded bg-blue-50 text-blue-800 text-[11px] font-semibold">
                        {sportLabels[sportKey]}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-gray-700 whitespace-nowrap">{user.password || defaultPassword}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMove(index, -1);
                              }}
                              disabled={index === 0}
                              className="p-1.5 rounded border border-gray-200 text-gray-600 hover:text-crimson-700 hover:bg-crimson-50 disabled:opacity-40 disabled:cursor-not-allowed"
                              title="위로 이동"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMove(index, 1);
                              }}
                              disabled={index === users.length - 1}
                              className="p-1.5 rounded border border-gray-200 text-gray-600 hover:text-crimson-700 hover:bg-crimson-50 disabled:opacity-40 disabled:cursor-not-allowed"
                              title="아래로 이동"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(user);
                              }}
                              className="p-1.5 rounded border border-gray-200 text-gray-600 hover:text-amber-700 hover:bg-amber-50"
                              title="계정 수정"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(user);
                              }}
                              disabled={user.id === currentUser.id}
                              className="p-1.5 rounded border border-gray-200 text-gray-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                              title="계정 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 text-[11px] text-gray-500">
          현재 선택 계정: <b className="text-gray-900">{currentUser.name}</b> · 활성 종목: <b className="text-crimson-700">{sportLabels[activeSport]}</b>
        </div>
      </div>
    </div>
  );
}
