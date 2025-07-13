'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// 型定義
interface User {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'staff';
  loginId: string;
  stores: string[];
}

interface Shift {
  id: string;
  date: string;
  user_id: string;
  store_id: string;
  pattern_id: string;
  status: 'draft' | 'confirmed' | 'completed';
  users?: { name: string };
  stores?: { name: string };
  shift_patterns?: {
    name: string;
    start_time: string;
    end_time: string;
    color: string;
  };
}

interface TimeOffRequest {
  id: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface EmergencyRequest {
  id: string;
  date: string;
  reason: string;
  status: 'open' | 'closed';
  stores?: { name: string };
  shift_patterns?: {
    name: string;
    start_time: string;
    end_time: string;
  };
}

export default function StaffDashboardPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [todayShift, setTodayShift] = useState<Shift | null>(null);
  const [weeklyShifts, setWeeklyShifts] = useState<Shift[]>([]);
  const [myRequests, setMyRequests] = useState<TimeOffRequest[]>([]);
  const [emergencyRequests, setEmergencyRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 認証チェックとユーザー情報取得
  useEffect(() => {
    const userInfo = localStorage.getItem('currentUser');
    if (!userInfo) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userInfo);
      if (user.role !== 'staff') {
        router.push('/dashboard'); // 店長は管理者ダッシュボードへ
        return;
      }
      setCurrentUser(user);
    } catch (error) {
      console.error('ユーザー情報の解析に失敗:', error);
      router.push('/login');
    }
  }, [router]);

  // データ取得
  useEffect(() => {
    if (!currentUser) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const today = new Date().toISOString().split('T')[0];
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // 月曜日
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // 日曜日

        // 並行してデータを取得
        const [shiftsResult, requestsResult, emergencyResult] = await Promise.all([
          fetch(`/api/shifts?user_id=${currentUser.id}&date_from=${today}&date_to=${weekEnd.toISOString().split('T')[0]}`),
          fetch(`/api/time-off-requests?user_id=${currentUser.id}`),
          fetch('/api/emergency-requests?status=open')
        ]);

        // シフトデータの処理
        if (shiftsResult.ok) {
          const shiftsData = await shiftsResult.json();
          const shifts = shiftsData.data || [];
          
          // 今日のシフトを取得
          const todayShiftData = shifts.find((shift: Shift) => shift.date === today);
          setTodayShift(todayShiftData || null);
          
          // 今週のシフトを取得
          setWeeklyShifts(shifts);
        }

        // 希望休申請データの処理
        if (requestsResult.ok) {
          const requestsData = await requestsResult.json();
          setMyRequests(requestsData.data || []);
        }

        // 代打募集データの処理
        if (emergencyResult.ok) {
          const emergencyData = await emergencyResult.json();
          setEmergencyRequests(emergencyData.data || []);
        }

      } catch (error) {
        console.error('データ取得エラー:', error);
        setError('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  // 今日の日付を取得
  const today = new Date();
  const todayString = today.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  // 今週の勤務時間を計算
  const calculateWeeklyHours = () => {
    let totalHours = 0;
    weeklyShifts.forEach(shift => {
      if (shift.shift_patterns?.start_time && shift.shift_patterns?.end_time) {
        const start = new Date(`2000-01-01T${shift.shift_patterns.start_time}`);
        const end = new Date(`2000-01-01T${shift.shift_patterns.end_time}`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        totalHours += Math.max(0, hours - 0.5); // 30分休憩を差し引く
      }
    });
    return totalHours;
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              おかえりなさい、{currentUser?.name}さん
            </h1>
            <p className="text-gray-600 mt-2">{todayString}</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push('/request-off')}
            >
              希望休申請
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push('/my-shift')}
            >
              シフト確認
            </Button>
          </div>
        </div>

        {/* 今日のシフト */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              今日のシフト
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayShift ? (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: todayShift.shift_patterns?.color || '#6B7280' }}
                    ></div>
                    <span className="font-medium text-gray-900">
                      {todayShift.shift_patterns?.name || 'シフト'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {todayShift.shift_patterns?.start_time} - {todayShift.shift_patterns?.end_time}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {todayShift.stores?.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    todayShift.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {todayShift.status === 'confirmed' ? '確定' : '未確定'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>今日はお休みです</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {calculateWeeklyHours().toFixed(1)}
              </div>
              <p className="text-sm text-gray-500 mt-1">今週の勤務時間</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {myRequests.filter(r => r.status === 'approved').length}
              </div>
              <p className="text-sm text-gray-500 mt-1">承認済み希望休</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {emergencyRequests.length}
              </div>
              <p className="text-sm text-gray-500 mt-1">代打募集中</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 希望休申請状況 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>希望休申請状況</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/request-off')}
                >
                  新規申請
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {myRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>申請履歴がありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(request.date).toLocaleDateString('ja-JP')}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {request.reason}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'approved' 
                            ? 'bg-green-100 text-green-800'
                            : request.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.status === 'approved' ? '承認' : 
                           request.status === 'rejected' ? '却下' : '保留'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 代打募集 */}
          <Card>
            <CardHeader>
              <CardTitle>代打募集</CardTitle>
            </CardHeader>
            <CardContent>
              {emergencyRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>現在、代打募集はありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {emergencyRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(request.date).toLocaleDateString('ja-JP')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {request.shift_patterns?.name} ({request.shift_patterns?.start_time} - {request.shift_patterns?.end_time})
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {request.stores?.name}
                          </p>
                        </div>
                        <Button size="sm">
                          参加
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
} 