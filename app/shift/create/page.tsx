'use client';

import { useState } from 'react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  mockUsers, 
  mockStores, 
  mockShiftPatterns,
  mockShifts 
} from '@/lib/mockData';
import type { Shift, User, ShiftPattern } from '@/lib/types';

interface ShiftModalData {
  date: string;
  timeSlot: string;
  dayIndex: number;
}

export default function ShiftCreatePage() {
  const [selectedStore, setSelectedStore] = useState(mockStores[0].id);
  const [selectedWeek, setSelectedWeek] = useState('2024-12-30'); // 今週
  const [shifts, setShifts] = useState<Shift[]>(mockShifts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<ShiftModalData | null>(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPattern, setSelectedPattern] = useState('');

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
  const selectedStoreData = mockStores.find(store => store.id === selectedStore);

  const timeSlots = [
    { id: 'morning', name: 'モーニング', time: '8:00-13:00' },
    { id: 'lunch', name: 'ランチ', time: '11:00-16:00' },
    { id: 'evening', name: 'イブニング', time: '17:00-22:00' },
  ];

  // 特定の日付・時間帯のシフトを取得
  const getShiftForSlot = (date: string, timeSlot: string) => {
    return shifts.filter(shift => {
      if (shift.date !== date || shift.storeId !== selectedStore) return false;
      
      const pattern = mockShiftPatterns.find(p => p.id === shift.patternId);
      if (!pattern) return false;

      // パターンが時間帯に含まれるかチェック
      const patternTime = pattern.startTime.split(':').map(Number);
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
  };

  // 必要人数を取得
  const getRequiredStaff = (dayIndex: number, timeSlot: string) => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayIndex];
    return selectedStoreData?.requiredStaff[dayName]?.[timeSlot] || 0;
  };

  // セルクリックでモーダル開く
  const handleCellClick = (date: string, timeSlot: string, dayIndex: number) => {
    setModalData({ date, timeSlot, dayIndex });
    setSelectedUser('');
    setSelectedPattern('');
    setIsModalOpen(true);
  };

  // シフト追加
  const handleAddShift = () => {
    if (!modalData || !selectedUser || !selectedPattern) return;

    const newShift: Shift = {
      id: `s${Date.now()}`,
      userId: selectedUser,
      storeId: selectedStore,
      date: modalData.date,
      patternId: selectedPattern,
      status: 'draft'
    };

    setShifts([...shifts, newShift]);
    setIsModalOpen(false);
  };

  // シフト削除
  const handleDeleteShift = (shiftId: string) => {
    setShifts(shifts.filter(s => s.id !== shiftId));
  };

  // 店舗所属スタッフのみフィルタ
  const availableStaff = mockUsers.filter(user => user.stores.includes(selectedStore));

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
    const weekShifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      const weekStart = new Date(selectedWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return shiftDate >= weekStart && shiftDate <= weekEnd && shift.storeId === selectedStore;
    });

    let totalHours = 0;
    let totalWage = 0;
    let staffCount = new Set();

    weekShifts.forEach(shift => {
      const pattern = mockShiftPatterns.find(p => p.id === shift.patternId);
      const user = mockUsers.find(u => u.id === shift.userId);
      
      if (pattern && user) {
        const startTime = pattern.startTime.split(':').map(Number);
        const endTime = pattern.endTime.split(':').map(Number);
        const hours = (endTime[0] * 60 + endTime[1] - startTime[0] * 60 - startTime[1]) / 60;
        const workHours = hours - (pattern.breakTime || 0) / 60;
        
        totalHours += workHours;
        totalWage += workHours * calculateHourlyWage(user.skillLevel);
        staffCount.add(shift.userId);
      }
    });

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      totalWage: Math.round(totalWage),
      uniqueStaff: staffCount.size,
      averageHours: staffCount.size > 0 ? Math.round((totalHours / staffCount.size) * 10) / 10 : 0
    };
  };

  const weeklyStats = calculateWeeklyStats();

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">シフト作成</h1>
            <p className="text-gray-600 mt-2">週単位でシフトを作成・編集できます</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              下書き保存
            </Button>
            <Button>
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
                >
                  {mockStores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
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
                />
              </div>
              <div className="flex items-end">
                <Button variant="secondary" fullWidth>
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
                        const dateString = date.toISOString().split('T')[0];
                        const dayShifts = getShiftForSlot(dateString, timeSlot.id);
                        const required = getRequiredStaff(date.getDay(), timeSlot.id);
                        const current = dayShifts.length;
                        
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
                                {dayShifts.map((shift) => {
                                  const user = mockUsers.find(u => u.id === shift.userId);
                                  const pattern = mockShiftPatterns.find(p => p.id === shift.patternId);
                                  
                                  return (
                                    <div key={shift.id} className="relative group">
                                      <div
                                        className="text-xs p-1.5 rounded-lg text-white font-medium flex items-center justify-between"
                                        style={{ backgroundColor: pattern?.color }}
                                      >
                                        <span className="truncate">{user?.name}</span>
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
                                        {pattern?.startTime}-{pattern?.endTime}
                                      </div>
                                    </div>
                                  );
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
              {mockShiftPatterns.map((pattern) => (
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
                      {mockShiftPatterns.map(pattern => (
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
                        {mockUsers.find(u => u.id === selectedUser)?.name} - {' '}
                        {mockShiftPatterns.find(p => p.id === selectedPattern)?.name}
                        <br />
                        勤務時間: {(() => {
                          const pattern = mockShiftPatterns.find(p => p.id === selectedPattern);
                          if (!pattern) return '0時間';
                          const start = pattern.startTime.split(':').map(Number);
                          const end = pattern.endTime.split(':').map(Number);
                          const hours = (end[0] * 60 + end[1] - start[0] * 60 - start[1] - (pattern.breakTime || 0)) / 60;
                          return `${hours}時間`;
                        })()}
                        <br />
                        時給: ¥{selectedUser ? calculateHourlyWage(mockUsers.find(u => u.id === selectedUser)?.skillLevel || 'training') : 0}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="secondary"
                      onClick={() => setIsModalOpen(false)}
                    >
                      キャンセル
                    </Button>
                    <Button
                      onClick={handleAddShift}
                      disabled={!selectedUser || !selectedPattern}
                    >
                      追加
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