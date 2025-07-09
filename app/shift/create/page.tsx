'use client';

import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Shift, User, ShiftPattern, Store } from '@/lib/types';

interface ShiftModalData {
  date: string;
  timeSlot: string;
  dayIndex: number;
}

// APIから取得するデータ用の型（User型を上書き）
interface ApiUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'manager' | 'staff';
  skillLevel: 'training' | 'regular' | 'veteran';
  memo?: string;
  stores: string[];
}

// APIから取得するデータ用の型（Store型を上書き）
interface ApiStore {
  id: string;
  name: string;
  requiredStaff: {
    [day: string]: {
      [timeSlot: string]: number;
    };
  };
  flexibleStaff: string[];
}

export default function ShiftCreatePage() {
  // データベースから取得するstate
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [shiftPatterns, setShiftPatterns] = useState<ShiftPattern[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  
  // UI state
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('2024-12-30'); // 今週
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<ShiftModalData | null>(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPattern, setSelectedPattern] = useState('');

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // データ取得関数
  const fetchStores = async () => {
    try {
      const response = await fetch('/api/stores');
      if (!response.ok) throw new Error('店舗データの取得に失敗しました');
      const result = await response.json();
      
      // API responseをApiStore型に変換し、必要な構造を確保
      const storesData = result.data?.map((store: any) => ({
        id: store.id,
        name: store.name,
        requiredStaff: store.required_staff || {},
        flexibleStaff: store.user_stores?.filter((us: any) => us.is_flexible).map((us: any) => us.user_id) || []
      })) || [];
      
      return storesData;
    } catch (error) {
      console.error('Error fetching stores:', error);
      throw error;
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('ユーザーデータの取得に失敗しました');
      const result = await response.json();
      
      // ユーザーに所属店舗情報を追加
      const usersWithStores = result.data?.map((user: any) => ({
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        skillLevel: user.skill_level,
        memo: user.memo,
        stores: user.user_stores?.map((us: any) => us.store_id) || []
      })) || [];
      
      return usersWithStores;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  };

  const fetchShiftPatterns = async () => {
    try {
      const response = await fetch('/api/shift-patterns');
      if (!response.ok) throw new Error('シフトパターンの取得に失敗しました');
      const result = await response.json();
      
      // API response を ShiftPattern 型に変換
      const patterns = result.data?.map((pattern: any) => ({
        id: pattern.id,
        name: pattern.name,
        startTime: pattern.start_time,
        endTime: pattern.end_time,
        color: pattern.color,
        breakTime: pattern.break_time
      })) || [];
      
      return patterns;
    } catch (error) {
      console.error('Error fetching shift patterns:', error);
      throw error;
    }
  };

  const fetchShifts = async (storeId: string, weekStart: string) => {
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const response = await fetch(
        `/api/shifts?storeId=${storeId}&startDate=${weekStart}&endDate=${weekEnd.toISOString().split('T')[0]}`
      );
      if (!response.ok) throw new Error('シフトデータの取得に失敗しました');
      const result = await response.json();
      
      // API response を Shift 型に変換
      const shifts = result.data?.map((shift: any) => ({
        id: shift.id,
        userId: shift.user_id,
        storeId: shift.store_id,
        date: shift.date,
        patternId: shift.pattern_id,
        status: shift.status,
        notes: shift.notes
      })) || [];
      
      return shifts;
    } catch (error) {
      console.error('Error fetching shifts:', error);
      throw error;
    }
  };

  // 初期データ読み込み
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [storesData, usersData, patternsData] = await Promise.all([
          fetchStores(),
          fetchUsers(),
          fetchShiftPatterns()
        ]);
        
        setStores(storesData);
        setUsers(usersData);
        setShiftPatterns(patternsData);
        
        // デフォルト店舗選択
        if (storesData.length > 0) {
          setSelectedStore(storesData[0].id);
        }
        
      } catch (error) {
        setError(error instanceof Error ? error.message : '初期データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // 選択された店舗または週が変更された時にシフトデータを取得
  useEffect(() => {
    if (selectedStore && selectedWeek) {
      const loadShifts = async () => {
        try {
          setError(null); // 前のエラーをクリア
          const shiftsData = await fetchShifts(selectedStore, selectedWeek);
          setShifts(shiftsData);
        } catch (error) {
          setError(error instanceof Error ? error.message : 'シフトデータの読み込みに失敗しました');
        }
      };

      loadShifts();
    } else if (!selectedStore && stores.length > 0) {
      // 店舗が選択されていない場合はシフトをクリア
      setShifts([]);
    }
  }, [selectedStore, selectedWeek, stores]);

  // 週の日付を生成
  const getWeekDates = (startDate: string) => {
    const start = new Date(startDate);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates(selectedWeek);
  const selectedStoreData = stores.find(store => store.id === selectedStore);

  const timeSlots = [
    { id: 'morning', name: 'モーニング', time: '8:00-13:00' },
    { id: 'lunch', name: 'ランチ', time: '11:00-16:00' },
    { id: 'evening', name: 'イブニング', time: '17:00-22:00' },
  ];

  // 必要人数を取得
  const getRequiredStaff = (dayIndex: number, timeSlot: string) => {
    try {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayIndex];
      
      if (!selectedStoreData || !selectedStoreData.requiredStaff) {
        return 0;
      }
      
      const dayRequiredStaff = selectedStoreData.requiredStaff[dayName];
      if (!dayRequiredStaff || typeof dayRequiredStaff !== 'object') {
        return 0;
      }
      
      const slotRequiredStaff = dayRequiredStaff[timeSlot];
      return typeof slotRequiredStaff === 'number' ? slotRequiredStaff : 0;
    } catch (error) {
      console.error('Error in getRequiredStaff:', error);
      return 0;
    }
  };

  // 特定の日付・時間帯のシフトを取得
  const getShiftForSlot = (date: string, timeSlot: string) => {
    try {
      if (!shifts || !selectedStore || !shiftPatterns) {
        return [];
      }

      return shifts.filter(shift => {
        if (shift.date !== date || shift.storeId !== selectedStore) return false;
        
        const pattern = shiftPatterns.find(p => p.id === shift.patternId);
        if (!pattern || !pattern.startTime) return false;

        // パターンが時間帯に含まれるかチェック
        const patternTime = pattern.startTime.split(':').map(Number);
        if (patternTime.length < 2 || isNaN(patternTime[0]) || isNaN(patternTime[1])) {
          return false;
        }

        const slotTimeRanges = {
          morning: { start: [8, 0], end: [13, 0] },
          lunch: { start: [11, 0], end: [16, 0] },
          evening: { start: [17, 0], end: [22, 0] }
        };

        const range = slotTimeRanges[timeSlot as keyof typeof slotTimeRanges];
        if (!range) return false;

        const patternStartMinutes = patternTime[0] * 60 + patternTime[1];
        const slotStartMinutes = range.start[0] * 60 + range.start[1];
        const slotEndMinutes = range.end[0] * 60 + range.end[1];

        return patternStartMinutes >= slotStartMinutes && patternStartMinutes < slotEndMinutes;
      });
    } catch (error) {
      console.error('Error in getShiftForSlot:', error);
      return [];
    }
  };

  // セルクリックでモーダル開く
  const handleCellClick = (date: string, timeSlot: string, dayIndex: number) => {
    if (!selectedStore) {
      setError('店舗を選択してください');
      return;
    }
    
    setModalData({ date, timeSlot, dayIndex });
    setSelectedUser('');
    setSelectedPattern('');
    setIsModalOpen(true);
  };

  // シフト追加
  const handleAddShift = async () => {
    if (!modalData || !selectedUser || !selectedPattern || !selectedStore) {
      setError('必要な情報がすべて選択されていません');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const newShiftData = {
        user_id: selectedUser,
        store_id: selectedStore,
        date: modalData.date,
        pattern_id: selectedPattern,
        status: 'draft'
      };

      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newShiftData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'シフトの追加に失敗しました');
      }

      const result = await response.json();
      
      // 新しいシフトをローカル状態に追加
      const newShift: Shift = {
        id: result.data.id,
        userId: result.data.user_id,
        storeId: result.data.store_id,
        date: result.data.date,
        patternId: result.data.pattern_id,
        status: result.data.status
      };

      setShifts([...shifts, newShift]);
      setIsModalOpen(false);
      setSelectedUser('');
      setSelectedPattern('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'シフトの追加に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // シフト削除
  const handleDeleteShift = async (shiftId: string) => {
    try {
      const response = await fetch(`/api/shifts?id=${shiftId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'シフトの削除に失敗しました');
      }

      setShifts(shifts.filter(s => s.id !== shiftId));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'シフトの削除に失敗しました');
    }
  };

  // 店舗所属スタッフのみフィルタ
  const availableStaff = selectedStore ? users.filter(user => user.stores.includes(selectedStore)) : [];

  // 時給計算（仮）
  const calculateHourlyWage = (skillLevel: string) => {
    const wages = {
      training: 1000,
      regular: 1200,
      veteran: 1500
    };
    return wages[skillLevel as keyof typeof wages] || 1000;
  };

  // 週の統計計算
  const calculateWeeklyStats = () => {
    try {
      if (!shifts || !selectedStore || !shiftPatterns || !users) {
        return {
          totalHours: 0,
          totalWage: 0,
          uniqueStaff: 0,
          averageHours: 0
        };
      }

      const weekShifts = shifts.filter(shift => {
        try {
          const shiftDate = new Date(shift.date);
          const weekStart = new Date(selectedWeek);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return shiftDate >= weekStart && shiftDate <= weekEnd && shift.storeId === selectedStore;
        } catch (error) {
          console.error('Error filtering week shifts:', error);
          return false;
        }
      });

      let totalHours = 0;
      let totalWage = 0;
      let staffCount = new Set();

      weekShifts.forEach(shift => {
        try {
          const pattern = shiftPatterns.find(p => p.id === shift.patternId);
          const user = users.find(u => u.id === shift.userId);
          
          if (pattern && user && pattern.startTime && pattern.endTime) {
            const startTime = pattern.startTime.split(':').map(Number);
            const endTime = pattern.endTime.split(':').map(Number);
            
            if (startTime.length >= 2 && endTime.length >= 2 && 
                !isNaN(startTime[0]) && !isNaN(startTime[1]) && 
                !isNaN(endTime[0]) && !isNaN(endTime[1])) {
              
              const hours = (endTime[0] * 60 + endTime[1] - startTime[0] * 60 - startTime[1]) / 60;
              const workHours = hours - (pattern.breakTime || 0) / 60;
              
              if (workHours > 0) {
                totalHours += workHours;
                totalWage += workHours * calculateHourlyWage(user.skillLevel);
                staffCount.add(shift.userId);
              }
            }
          }
        } catch (error) {
          console.error('Error calculating shift stats:', error);
        }
      });

      return {
        totalHours: Math.round(totalHours * 10) / 10,
        totalWage: Math.round(totalWage),
        uniqueStaff: staffCount.size,
        averageHours: staffCount.size > 0 ? Math.round((totalHours / staffCount.size) * 10) / 10 : 0
      };
    } catch (error) {
      console.error('Error in calculateWeeklyStats:', error);
      return {
        totalHours: 0,
        totalWage: 0,
        uniqueStaff: 0,
        averageHours: 0
      };
    }
  };

  const weeklyStats = calculateWeeklyStats();

  // ローディング表示
  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">データを読み込んでいます...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  // エラー表示
  if (error) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">エラーが発生しました</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                再読み込み
              </Button>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  // データが空の場合
  if (stores.length === 0) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">店舗データがありません</h3>
              <p className="text-gray-600 mb-4">
                シフトを作成するには、まず店舗を登録してください。
              </p>
              <Button onClick={() => window.location.href = '/settings/store'}>
                店舗設定へ
              </Button>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* エラー表示バー */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">シフト作成</h1>
            <p className="text-gray-600 mt-2">週単位でシフトを作成・編集できます</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" disabled={saving}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              下書き保存
            </Button>
            <Button disabled={saving}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              シフト確定
            </Button>
          </div>
        </div>

        {/* 統計サマリー */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{weeklyStats.totalHours}h</div>
              <p className="text-sm text-gray-500 mt-1">総勤務時間</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">¥{weeklyStats.totalWage.toLocaleString()}</div>
              <p className="text-sm text-gray-500 mt-1">人件費概算</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{weeklyStats.uniqueStaff}人</div>
              <p className="text-sm text-gray-500 mt-1">勤務スタッフ数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">{weeklyStats.averageHours}h</div>
              <p className="text-sm text-gray-500 mt-1">平均勤務時間</p>
            </CardContent>
          </Card>
        </div>

        {/* 店舗・週選択 */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  店舗選択
                </label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  {stores.length === 0 ? (
                    <option value="">店舗を読み込み中...</option>
                  ) : (
                    stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  週選択（月曜日開始）
                </label>
                <input
                  type="date"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <div className="flex items-end">
                <Button variant="secondary" fullWidth disabled={loading || saving}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  前週コピー
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* シフト表 */}
        <Card>
          <CardHeader>
            <CardTitle>{selectedStoreData?.name} - シフト表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-yellow-50 rounded-xl">
              <h4 className="font-medium text-yellow-900 mb-1">操作方法</h4>
              <p className="text-sm text-yellow-800">各セルをクリックしてシフトを追加・編集できます。色分け：🔴不足 / 🟢適正 / 🔵過剰</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10">時間帯</th>
                    {weekDates.map((date, index) => (
                      <th key={index} className="text-center p-3 font-medium text-gray-900 bg-gray-50 min-w-36">
                        <div>
                          {date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {date.toLocaleDateString('ja-JP', { weekday: 'short' })}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((timeSlot) => (
                    <tr key={timeSlot.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 bg-gray-50 sticky left-0 z-10">
                        <div className="font-medium text-gray-900">{timeSlot.name}</div>
                        <div className="text-xs text-gray-500">{timeSlot.time}</div>
                      </td>
                      {weekDates.map((date, dayIndex) => {
                        try {
                          const dateString = date.toISOString().split('T')[0];
                          const dayShifts = getShiftForSlot(dateString, timeSlot.id);
                          const required = getRequiredStaff(date.getDay(), timeSlot.id);
                          const current = dayShifts ? dayShifts.length : 0;
                          
                          // 人数過不足による色分け
                          let cellStyle = '';
                          if (current < required) {
                            cellStyle = 'border-red-300 bg-red-50';
                          } else if (current > required) {
                            cellStyle = 'border-blue-300 bg-blue-50';
                          } else if (current === required && required > 0) {
                            cellStyle = 'border-green-300 bg-green-50';
                          } else {
                            cellStyle = 'border-gray-200 bg-gray-50';
                          }
                          
                          return (
                            <td key={dayIndex} className="p-2">
                              <div 
                                className={`min-h-28 border-2 rounded-xl p-2 cursor-pointer hover:shadow-md transition-all ${cellStyle}`}
                                onClick={() => handleCellClick(dateString, timeSlot.id, date.getDay())}
                              >
                                {/* 必要人数表示 */}
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-gray-600">
                                    {current}/{required}人
                                  </span>
                                  {current !== required && (
                                    <span className="text-xs">
                                      {current < required ? '🔴' : '🔵'}
                                    </span>
                                  )}
                                </div>
                                
                                {/* スタッフ表示 */}
                                <div className="space-y-1">
                                  {dayShifts && dayShifts.map((shift) => {
                                    try {
                                      const user = users.find(u => u.id === shift.userId);
                                      const pattern = shiftPatterns.find(p => p.id === shift.patternId);
                                      
                                      if (!user || !pattern) {
                                        return null;
                                      }
                                      
                                      return (
                                        <div key={shift.id} className="relative group">
                                          <div
                                            className="text-xs p-1.5 rounded-lg text-white font-medium flex items-center justify-between"
                                            style={{ backgroundColor: pattern.color || '#6B7280' }}
                                          >
                                            <span className="truncate">{user.name || '不明'}</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteShift(shift.id);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:bg-black hover:bg-opacity-20 rounded"
                                            >
                                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                              </svg>
                                            </button>
                                          </div>
                                          <div className="text-xs text-gray-500 mt-0.5">
                                            {pattern.startTime || '00:00'}-{pattern.endTime || '00:00'}
                                          </div>
                                        </div>
                                      );
                                    } catch (error) {
                                      console.error('Error rendering shift:', error);
                                      return null;
                                    }
                                  })}
                                </div>
                                
                                {/* 追加ボタン */}
                                <div className="mt-2">
                                  <div className="w-full text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg py-2 text-center hover:border-gray-400 hover:text-gray-600 transition-colors">
                                    + スタッフ追加
                                  </div>
                                </div>
                              </div>
                            </td>
                          );
                        } catch (error) {
                          console.error('Error rendering table cell:', error);
                          return (
                            <td key={dayIndex} className="p-2">
                              <div className="min-h-28 border-2 rounded-xl p-2 bg-gray-100">
                                <div className="text-xs text-red-500">エラー</div>
                              </div>
                            </td>
                          );
                        }
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* シフトパターン凡例 */}
        <Card>
          <CardHeader>
            <CardTitle>シフトパターン凡例</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {shiftPatterns.map((pattern) => (
                <div key={pattern.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-xl">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: pattern.color }}
                  />
                  <div>
                    <div className="font-medium text-gray-900">{pattern.name}</div>
                    <div className="text-xs text-gray-500">
                      {pattern.startTime}-{pattern.endTime}
                      {pattern.breakTime && ` (休憩${pattern.breakTime}分)`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* シフト追加モーダル */}
        {isModalOpen && modalData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">シフト追加</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      {new Date(modalData.date).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {timeSlots.find(ts => ts.id === modalData.timeSlot)?.name} 
                      ({timeSlots.find(ts => ts.id === modalData.timeSlot)?.time})
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      スタッフ選択 *
                    </label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">スタッフを選択してください</option>
                      {availableStaff.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.skillLevel === 'veteran' ? 'ベテラン' : user.skillLevel === 'regular' ? '一般' : '研修中'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      シフトパターン *
                    </label>
                    <select
                      value={selectedPattern}
                      onChange={(e) => setSelectedPattern(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">パターンを選択してください</option>
                      {shiftPatterns.map(pattern => (
                        <option key={pattern.id} value={pattern.id}>
                          {pattern.name} ({pattern.startTime}-{pattern.endTime})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedUser && selectedPattern && (
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <h4 className="font-medium text-blue-900 mb-1">プレビュー</h4>
                      <div className="text-sm text-blue-800">
                        {users.find(u => u.id === selectedUser)?.name} - {' '}
                        {shiftPatterns.find(p => p.id === selectedPattern)?.name}
                        <br />
                        勤務時間: {(() => {
                          const pattern = shiftPatterns.find(p => p.id === selectedPattern);
                          if (!pattern) return '0時間';
                          const start = pattern.startTime.split(':').map(Number);
                          const end = pattern.endTime.split(':').map(Number);
                          const hours = (end[0] * 60 + end[1] - start[0] * 60 - start[1] - (pattern.breakTime || 0)) / 60;
                          return `${hours}時間`;
                        })()}
                        <br />
                        時給: ¥{selectedUser ? calculateHourlyWage(users.find(u => u.id === selectedUser)?.skillLevel || 'training') : 0}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="secondary"
                      onClick={() => setIsModalOpen(false)}
                      disabled={saving}
                    >
                      キャンセル
                    </Button>
                    <Button
                      onClick={handleAddShift}
                      disabled={!selectedUser || !selectedPattern || saving}
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          追加中...
                        </>
                      ) : (
                        '追加'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
} 