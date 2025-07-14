'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState, EmptyTimeOffRequests } from '@/components/ui/EmptyState';
import { 
  userApi,
  storeApi, 
  shiftApi,
  timeOffRequestApi,
  emergencyRequestApi,
  dateUtils 
} from '@/lib/api';

// 型定義
interface User {
  id: string;
  name: string;
  role: 'manager' | 'staff';
  skill_level: 'training' | 'regular' | 'veteran';
}

interface Store {
  id: string;
  name: string;
  required_staff: Record<string, any>;
}

interface Shift {
  id: string;
  user_id: string;
  store_id: string;
  date: string;
  status: 'draft' | 'confirmed' | 'completed';
  users?: User;
  stores?: Store;
}

interface TimeOffRequest {
  id: string;
  user_id: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  users?: User;
}

interface EmergencyRequest {
  id: string;
  original_user_id: string;
  store_id: string;
  date: string;
  reason: string;
  status: 'open' | 'filled' | 'cancelled';
  created_at: string;
  original_user?: User;
  stores?: Store;
  shift_patterns?: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
  };
  emergency_volunteers?: {
    id: string;
    user_id: string;
    responded_at: string;
    users?: User;
  }[];
}

export default function DashboardPage() {
  const router = useRouter();
  
  // データ状態
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [emergencyRequests, setEmergencyRequests] = useState<EmergencyRequest[]>([]);
  
  // UI状態
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // クライアントサイドでのみ実行
  useEffect(() => {
    setIsClient(true);
  }, []);

  // データ取得
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const today = dateUtils.getToday();

        // 並行してデータを取得
        const [usersResult, storesResult, shiftsResult, requestsResult, emergencyResult] = await Promise.all([
          userApi.getAll(),
          storeApi.getAll(),
          shiftApi.getAll({ 
            date_from: today, 
            date_to: today,
            status: 'confirmed' // 確定済みシフトのみ取得
          }),
          timeOffRequestApi.getAll({ 
            status: 'pending' 
          }),
          emergencyRequestApi.getAll({ 
            status: 'open' 
          })
        ]);

        // エラーチェック
        if (usersResult.error) throw new Error(`ユーザー取得エラー: ${usersResult.error}`);
        if (storesResult.error) throw new Error(`店舗取得エラー: ${storesResult.error}`);
        if (shiftsResult.error) throw new Error(`シフト取得エラー: ${shiftsResult.error}`);
        if (requestsResult.error) throw new Error(`希望休申請取得エラー: ${requestsResult.error}`);
        if (emergencyResult.error) throw new Error(`代打募集取得エラー: ${emergencyResult.error}`);

        // データ設定
        setUsers((usersResult.data as User[]) || []);
        setStores((storesResult.data as Store[]) || []);
        setTodayShifts((shiftsResult.data as Shift[]) || []);
        setTimeOffRequests((requestsResult.data as TimeOffRequest[]) || []);
        setEmergencyRequests((emergencyResult.data as EmergencyRequest[]) || []);

      } catch (err) {
        console.error('Dashboard data loading failed:', err);
        setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // 今日の各店舗の出勤状況計算
  const todayStaffing = stores.map(store => {
    const storeShifts = todayShifts.filter(shift => shift.store_id === store.id);
    
    // 今日の曜日を取得
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[today.getDay()];
    
    // 必要人数を計算（全時間帯の合計）
    const requiredStaff = store.required_staff?.[dayName] || {};
    const totalRequired = Object.values(requiredStaff).reduce((sum: number, count) => {
      return sum + (typeof count === 'number' ? count : 0);
    }, 0);

    return {
      store: store.name,
      scheduled: storeShifts.length,
      required: totalRequired || 8, // デフォルト値
    };
  });

  // 希望休申請の承認・却下処理
  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    setIsProcessing(requestId);
    
    try {
      // localStorageから現在のユーザー情報を取得
      const userData = localStorage.getItem('currentUser');
      if (!userData) {
        throw new Error('ユーザー認証が必要です');
      }
      
      const currentUser = JSON.parse(userData);
      if (currentUser.role !== 'manager') {
        throw new Error('管理者権限が必要です');
      }

      const response = await fetch('/api/time-off-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: requestId,
          status: action === 'approve' ? 'approved' : 'rejected',
          responded_by: currentUser.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '申請の処理に失敗しました');
      }

      // ローカル状態を更新
      setTimeOffRequests(prev => 
        prev.filter(request => request.id !== requestId)
      );

    } catch (err) {
      console.error('Request action failed:', err);
      alert(err instanceof Error ? err.message : '処理に失敗しました');
    } finally {
      setIsProcessing(null);
    }
  };

  // 代打応募者の採用・却下処理
  const handleVolunteerAction = async (requestId: string, volunteerId: string, action: 'accept' | 'reject') => {
    setIsProcessing(volunteerId);
    
    try {
      // 新しいPATCHエンドポイントを使用してシフト表も自動更新
      const response = await fetch('/api/emergency-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emergency_request_id: requestId,
          volunteer_id: volunteerId,
          action: action
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `代打の${action === 'accept' ? '確定' : '削除'}に失敗しました`);
      }

      const result = await response.json();

      if (action === 'accept') {
        // 代打確定時の処理
        const volunteerName = result.data.volunteer?.users?.name || '代打スタッフ';
        const originalUserName = result.data.emergency_request?.original_user?.name || '元の担当者';
        
        // ローカル状態を更新
        setEmergencyRequests(prev => 
          prev.map(request => 
            request.id === requestId 
              ? { ...request, status: 'filled' as const }
              : request
          )
        );

        alert(`代打を確定しました。\n${originalUserName} → ${volunteerName}\nシフト表が自動更新されました。`);
      } else {
        // 応募者削除時の処理
        setEmergencyRequests(prev => 
          prev.map(request => 
            request.id === requestId 
              ? {
                  ...request,
                  emergency_volunteers: request.emergency_volunteers?.filter(v => v.id !== volunteerId)
                }
              : request
          )
        );

        alert('応募者を削除しました');
      }

    } catch (err) {
      console.error('Volunteer action failed:', err);
      alert(err instanceof Error ? err.message : '処理に失敗しました');
    } finally {
      setIsProcessing(null);
    }
  };

  // データ再読み込み
  const handleRetry = () => {
    window.location.reload();
  };

  // ナビゲーション関数
  const navigateTo = (path: string) => {
    router.push(path);
  };

  // ローディング状態
  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <LoadingState message="ダッシュボードを読み込み中..." />
      </AuthenticatedLayout>
    );
  }

  // エラー状態
  if (error) {
    return (
      <AuthenticatedLayout>
        <ErrorState message={error} onRetry={handleRetry} />
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
            {isClient ? new Date().toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            }) : '読み込み中...'}
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 今日のシフト */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigateTo('/shift/create')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">今日のシフト</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{todayShifts.length}</div>
              <p className="text-sm text-gray-500 mt-1">件の勤務予定</p>
              <div className="mt-2 text-xs text-blue-600 flex items-center">
                <span>シフト詳細を見る</span>
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* 保留中の希望休申請 */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigateTo('/requests')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">保留中の申請</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{timeOffRequests.length}</div>
              <p className="text-sm text-gray-500 mt-1">件の希望休申請</p>
              <div className="mt-2 text-xs text-orange-600 flex items-center">
                <span>申請を確認する</span>
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* 代打募集 */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigateTo('/shift/create')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">代打募集</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{emergencyRequests.length}</div>
              <p className="text-sm text-gray-500 mt-1">件の緊急募集</p>
              <div className="mt-2 text-xs text-red-600 flex items-center">
                <span>募集状況を見る</span>
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* 総スタッフ数 */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigateTo('/staff')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">総スタッフ数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{users.length}</div>
              <p className="text-sm text-gray-500 mt-1">人のスタッフ</p>
              <div className="mt-2 text-xs text-green-600 flex items-center">
                <span>スタッフ管理</span>
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 今日の店舗別出勤状況 */}
          <Card>
            <CardHeader>
              <CardTitle>今日の店舗別出勤状況</CardTitle>
            </CardHeader>
            <CardContent>
              {stores.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  店舗データがありません
                </div>
              ) : (
                <div className="space-y-4">
                  {todayStaffing.map((staffing, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="font-medium text-gray-900">{staffing.store}</p>
                        <p className="text-sm text-gray-500">
                          {staffing.scheduled} / {staffing.required} 人
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        staffing.scheduled >= staffing.required 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {staffing.scheduled >= staffing.required ? '充足' : '不足'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* 店舗出勤状況の詳細ボタン */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  fullWidth
                  onClick={() => navigateTo('/shift/create')}
                >
                  詳細なシフト状況を確認
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 保留中の希望休申請 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>保留中の希望休申請</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo('/requests')}
                >
                  すべて見る
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {timeOffRequests.length === 0 ? (
                <EmptyTimeOffRequests />
              ) : (
                <div className="space-y-4">
                  {timeOffRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {request.users?.name || '不明なユーザー'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(request.date).toLocaleDateString('ja-JP')} - {request.reason}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            申請日: {new Date(request.created_at).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => handleRequestAction(request.id, 'approve')}
                            disabled={isProcessing === request.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isProcessing === request.id ? '処理中...' : '承認'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRequestAction(request.id, 'reject')}
                            disabled={isProcessing === request.id}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            {isProcessing === request.id ? '処理中...' : '却下'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {timeOffRequests.length > 3 && (
                    <div className="text-center pt-4 border-t border-gray-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateTo('/requests')}
                      >
                        他 {timeOffRequests.length - 3} 件の申請を見る
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 代打応募者管理 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>代打応募者管理</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo('/shift/create')}
                >
                  すべて見る
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {emergencyRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>現在、代打募集はありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {emergencyRequests.slice(0, 2).map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="mb-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">
                            {request.stores?.name || '不明な店舗'}
                          </p>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            request.status === 'open' 
                              ? 'bg-red-100 text-red-600' 
                              : 'bg-green-100 text-green-600'
                          }`}>
                            {request.status === 'open' ? '募集中' : '確定済み'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(request.date).toLocaleDateString('ja-JP')} - {request.reason}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          元担当: {request.original_user?.name || '不明'}
                        </p>
                      </div>
                      
                      {/* 応募者リスト */}
                      {request.emergency_volunteers && request.emergency_volunteers.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">応募者 ({request.emergency_volunteers.length}名)</p>
                          {request.emergency_volunteers.slice(0, 2).map((volunteer) => (
                            <div key={volunteer.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {volunteer.users?.name || '不明なユーザー'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  応募日: {new Date(volunteer.responded_at).toLocaleDateString('ja-JP')}
                                </p>
                              </div>
                              {request.status === 'open' && (
                                <div className="flex space-x-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleVolunteerAction(request.id, volunteer.id, 'accept')}
                                    disabled={isProcessing === volunteer.id}
                                    className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1"
                                  >
                                    {isProcessing === volunteer.id ? '処理中...' : '採用'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleVolunteerAction(request.id, volunteer.id, 'reject')}
                                    disabled={isProcessing === volunteer.id}
                                    className="border-red-300 text-red-600 hover:bg-red-50 text-xs px-2 py-1"
                                  >
                                    {isProcessing === volunteer.id ? '処理中...' : '削除'}
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                          {request.emergency_volunteers.length > 2 && (
                            <p className="text-xs text-gray-500 text-center">
                              他 {request.emergency_volunteers.length - 2} 名の応募者
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          <p className="text-sm">まだ応募者がいません</p>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {emergencyRequests.length > 2 && (
                    <div className="text-center pt-4 border-t border-gray-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateTo('/shift/create')}
                      >
                        他 {emergencyRequests.length - 2} 件の代打募集を見る
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* クイックアクション */}
        <Card>
          <CardHeader>
            <CardTitle>クイックアクション</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-16 flex flex-col items-center justify-center space-y-1"
                onClick={() => navigateTo('/shift/create')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>新規シフト作成</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex flex-col items-center justify-center space-y-1"
                onClick={() => navigateTo('/staff')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <span>スタッフ管理</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex flex-col items-center justify-center space-y-1"
                onClick={() => navigateTo('/settings/store')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>店舗設定</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex flex-col items-center justify-center space-y-1 relative"
                onClick={() => navigateTo('/requests')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>申請管理</span>
                {timeOffRequests.length > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {timeOffRequests.length}
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
} 