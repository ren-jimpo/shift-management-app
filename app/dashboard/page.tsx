'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

import { supabase } from '@/lib/supabase';
import { DatabaseUser, DatabaseEmergencyRequest } from '@/lib/types';

// ダッシュボード専用の型定義
interface DashboardStats {
  totalShifts: number;
  pendingRequests: number;
  openEmergencies: number;
  totalStaff: number;
}

interface StoreStaffing {
  store: string;
  scheduled: number;
  required: number;
  status: 'sufficient' | 'insufficient';
}

interface DashboardTimeOffRequest {
  id: string;
  user_id: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface DashboardShift {
  id: string;
  user_id: string;
  store_id: string;
  date: string;
  pattern_id: string;
  status: 'draft' | 'confirmed' | 'completed';
}

interface DashboardStore {
  id: string;
  name: string;
  required_staff: {
    [day: string]: {
      [timeSlot: string]: number;
    };
  };
}

interface DashboardEmergencyRequest {
  id: string;
  original_user_id: string;
  store_id: string;
  date: string;
  shift_pattern_id: string;
  reason: string;
  status: 'open' | 'filled' | 'cancelled';
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalShifts: 0,
    pendingRequests: 0,
    openEmergencies: 0,
    totalStaff: 0
  });
  const [storeStaffing, setStoreStaffing] = useState<StoreStaffing[]>([]);
  const [recentRequests, setRecentRequests] = useState<DashboardTimeOffRequest[]>([]);
  const [emergencyRequests, setEmergencyRequests] = useState<DatabaseEmergencyRequest[]>([]);
  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // 並列でデータを取得
      const [
        { data: shiftsData },
        { data: requestsData },
        { data: emergencyData },
        { data: usersData },
        { data: storesData }
      ] = await Promise.all([
        supabase.from('shifts').select('*'),
        supabase.from('time_off_requests').select('*'),
        supabase.from('emergency_requests').select(`
          *,
          original_user:users!emergency_requests_original_user_id_fkey(id, name, role),
          stores(id, name),
          shift_patterns(id, name, start_time, end_time),
          emergency_volunteers(
            id,
            user_id,
            responded_at,
            users(id, name, role, skill_level)
          )
        `),
        supabase.from('users').select(`
          *,
          user_stores (
            store_id,
            stores (*)
          )
        `),
        supabase.from('stores').select('*')
      ]);

      // 今日の日付
      const today = new Date().toISOString().split('T')[0];
      const todayShifts = (shiftsData as DashboardShift[])?.filter(shift => 
        shift.date === today && shift.status === 'confirmed'
      ) || [];
      const pendingRequests = (requestsData as DashboardTimeOffRequest[])?.filter(req => req.status === 'pending') || [];
      const openEmergencies = (emergencyData as DashboardEmergencyRequest[])?.filter(req => req.status === 'open') || [];

      // 統計情報を設定
      setStats({
        totalShifts: todayShifts.length,
        pendingRequests: pendingRequests.length,
        openEmergencies: openEmergencies.length,
        totalStaff: usersData?.length || 0
      });

      // 店舗別スタッフィング状況
      const staffingData = (storesData as DashboardStore[] || []).map(store => {
        const storeShifts = todayShifts.filter(shift => shift.store_id === store.id);
        
        // 今日の曜日を取得（日本語の曜日名に変換）
        const today = new Date();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayDayName = dayNames[today.getDay()];
        
        // 各時間帯の必要人数を取得
        let totalRequired = 0;
        const timeSlots = ['morning', 'lunch', 'evening'];
        
        if (store.required_staff && store.required_staff[todayDayName]) {
          const dayRequiredStaff = store.required_staff[todayDayName];
          timeSlots.forEach(slot => {
            if (dayRequiredStaff[slot] && typeof dayRequiredStaff[slot] === 'number') {
              totalRequired += dayRequiredStaff[slot];
            }
          });
        }
        
        // 必要人数が設定されていない場合のデフォルト値
        if (totalRequired === 0) {
          totalRequired = 8; // デフォルト値
        }

        return {
          store: store.name,
          scheduled: storeShifts.length,
          required: totalRequired,
          status: storeShifts.length >= totalRequired ? 'sufficient' : 'insufficient'
        } as StoreStaffing;
      });

      setStoreStaffing(staffingData);
      setRecentRequests((requestsData as DashboardTimeOffRequest[])?.slice(0, 3) || []);
      setEmergencyRequests(openEmergencies.slice(0, 3) || []);
      setUsers((usersData as DatabaseUser[]) || []);

    } catch (error) {
      console.error('Dashboard data loading error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">データを読み込み中...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-8">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600 mt-2">
            {new Date().toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 今日のシフト */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">今日のシフト</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.totalShifts}</div>
              <p className="text-sm text-gray-500 mt-1">件の勤務予定</p>
            </CardContent>
          </Card>

          {/* 保留中の希望休申請 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">保留中の申請</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.pendingRequests}</div>
              <p className="text-sm text-gray-500 mt-1">件の希望休申請</p>
            </CardContent>
          </Card>

          {/* 代打募集 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">代打募集</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.openEmergencies}</div>
              <p className="text-sm text-gray-500 mt-1">件の緊急募集</p>
            </CardContent>
          </Card>

          {/* 総スタッフ数 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">総スタッフ数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.totalStaff}</div>
              <p className="text-sm text-gray-500 mt-1">人のスタッフ</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 今日の店舗別出勤状況 */}
          <Card>
            <CardHeader>
              <CardTitle>今日の店舗別出勤状況</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {storeStaffing.map((staffing, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{staffing.store}</p>
                      <p className="text-sm text-gray-500">
                        {staffing.scheduled} / {staffing.required} 人
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      staffing.status === 'sufficient'
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {staffing.status === 'sufficient' ? '充足' : '不足'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 最近の希望休申請 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>最近の希望休申請</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/requests')}
              >
                すべて表示
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentRequests.length > 0 ? (
                  recentRequests.map((request) => {
                    const user = users.find(u => u.id === request.user_id);
                    return (
                      <div key={request.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{user?.name || '不明なユーザー'}</p>
                          <p className="text-sm text-gray-500">{request.date} - {request.reason}</p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : request.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {request.status === 'pending' ? '保留' : 
                           request.status === 'approved' ? '承認' : '拒否'}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center py-4">申請はありません</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 代打募集管理 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>代打募集管理</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/shift/create')}
              >
                募集作成
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {emergencyRequests.length > 0 ? (
                  emergencyRequests.map((request) => {
                    const user = users.find(u => u.id === request.original_user_id);
                    return (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{user?.name || '不明なユーザー'}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(request.date).toLocaleDateString('ja-JP')}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              🆘 募集中
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">理由: {request.reason}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            応募者: <span className="font-medium">{request.emergency_volunteers?.length || 0}名</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => router.push(`/shift/create?emergency=${request.id}`)}
                          >
                            管理
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center py-4">代打募集はありません</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* クイックアクション */}
        <Card>
          <CardHeader>
            <CardTitle>クイックアクション</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                className="h-16 flex flex-col items-center justify-center space-y-1"
                onClick={() => router.push('/shift/create')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>新しいシフト作成</span>
              </Button>
              
              <Button 
                variant="secondary" 
                className="h-16 flex flex-col items-center justify-center space-y-1"
                onClick={() => router.push('/staff')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <span>スタッフ管理</span>
              </Button>
              
              <Button 
                variant="secondary" 
                className="h-16 flex flex-col items-center justify-center space-y-1"
                onClick={() => router.push('/settings/store')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>店舗設定</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
} 