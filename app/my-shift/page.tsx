'use client';

import { useState } from 'react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  mockUsers, 
  mockStores, 
  mockShiftPatterns,
  mockShifts,
  currentUser 
} from '@/lib/mockData';

export default function MyShiftPage() {
  const [selectedWeek, setSelectedWeek] = useState('2024-12-30');

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

  // 自分のシフトのみフィルタリング
  const myShifts = mockShifts.filter(shift => shift.userId === currentUser.id);

  // 特定の日のシフトを取得
  const getShiftForDate = (date: string) => {
    return myShifts.find(shift => shift.date === date);
  };

  // 今週の総勤務時間を計算
  const calculateWeeklyHours = () => {
    let totalHours = 0;
    weekDates.forEach(date => {
      const dateString = date.toISOString().split('T')[0];
      const shift = getShiftForDate(dateString);
      if (shift) {
        const pattern = mockShiftPatterns.find(p => p.id === shift.patternId);
        if (pattern) {
          const start = new Date(`2000-01-01T${pattern.startTime}`);
          const end = new Date(`2000-01-01T${pattern.endTime}`);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          const breakHours = (pattern.breakTime || 0) / 60;
          totalHours += Math.max(0, hours - breakHours);
        }
      }
    });
    return totalHours;
  };

  const weeklyHours = calculateWeeklyHours();

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">マイシフト</h1>
            <p className="text-gray-600 mt-2">あなたの勤務スケジュールを確認できます</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary">希望休申請</Button>
            <Button variant="secondary">PDF出力</Button>
          </div>
        </div>

        {/* 週選択 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  週選択
                </label>
                <input
                  type="date"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{weeklyHours.toFixed(1)}</div>
                  <div className="text-sm text-blue-700">今週の勤務時間</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{myShifts.length}</div>
                  <div className="text-sm text-green-700">今月の勤務日数</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 週間スケジュール */}
        <Card>
          <CardHeader>
            <CardTitle>週間スケジュール</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {weekDates.map((date, index) => {
                const dateString = date.toISOString().split('T')[0];
                const shift = getShiftForDate(dateString);
                const pattern = shift ? mockShiftPatterns.find(p => p.id === shift.patternId) : null;
                const store = shift ? mockStores.find(s => s.id === shift.storeId) : null;
                const isToday = dateString === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isToday 
                        ? 'border-blue-500 bg-blue-50' 
                        : shift
                        ? 'border-gray-200 bg-white hover:shadow-md'
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    {/* 日付 */}
                    <div className="text-center mb-3">
                      <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                        {date.getDate()}
                      </div>
                      <div className={`text-sm ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                        {date.toLocaleDateString('ja-JP', { weekday: 'short' })}
                      </div>
                    </div>

                    {/* シフト情報 */}
                    {shift && pattern && store ? (
                      <div className="space-y-2">
                        <div
                          className="px-3 py-2 rounded-lg text-white text-center font-medium"
                          style={{ backgroundColor: pattern.color }}
                        >
                          {pattern.name}
                        </div>
                        <div className="text-center text-sm text-gray-600">
                          {pattern.startTime} - {pattern.endTime}
                        </div>
                        <div className="text-center text-xs text-gray-500">
                          {store.name}
                        </div>
                        {shift.status === 'draft' && (
                          <div className="text-center">
                            <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              未確定
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 text-sm">
                        休み
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 今日のシフト詳細（今日の場合のみ） */}
        {(() => {
          const today = new Date().toISOString().split('T')[0];
          const todayShift = getShiftForDate(today);
          const todayPattern = todayShift ? mockShiftPatterns.find(p => p.id === todayShift.patternId) : null;
          const todayStore = todayShift ? mockStores.find(s => s.id === todayShift.storeId) : null;
          
          if (todayShift && todayPattern && todayStore) {
            return (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-900">今日のシフト詳細</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-sm text-blue-600 mb-1">勤務時間</div>
                      <div className="text-xl font-bold text-blue-900">
                        {todayPattern.startTime} - {todayPattern.endTime}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-blue-600 mb-1">勤務先</div>
                      <div className="text-xl font-bold text-blue-900">{todayStore.name}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-blue-600 mb-1">シフトタイプ</div>
                      <div className="text-xl font-bold text-blue-900">{todayPattern.name}</div>
                    </div>
                  </div>
                  
                  {todayPattern.breakTime && (
                    <div className="mt-4 p-3 bg-white rounded-lg">
                      <div className="text-sm text-gray-600">
                        <strong>休憩時間:</strong> {todayPattern.breakTime}分
                      </div>
                    </div>
                  )}
                  
                  {todayShift.notes && (
                    <div className="mt-4 p-3 bg-white rounded-lg">
                      <div className="text-sm text-gray-600">
                        <strong>メモ:</strong> {todayShift.notes}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          }
          return null;
        })()}

        {/* シフトパターン凡例 */}
        <Card>
          <CardHeader>
            <CardTitle>シフトパターン</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {mockShiftPatterns.map((pattern) => (
                <div key={pattern.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: pattern.color }}
                  ></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{pattern.name}</div>
                    <div className="text-xs text-gray-500">
                      {pattern.startTime} - {pattern.endTime}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
} 