'use client';

import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  mockUsers, 
  mockStores, 
  mockShifts, 
  mockTimeOffRequests, 
  mockEmergencyRequests,
  currentUser 
} from '@/lib/mockData';

export default function DashboardPage() {
  const today = new Date().toISOString().split('T')[0];
  const todayShifts = mockShifts.filter(shift => shift.date === today);
  const pendingRequests = mockTimeOffRequests.filter(req => req.status === 'pending');
  const openEmergencies = mockEmergencyRequests.filter(req => req.status === 'open');

  // 今日の各店舗の出勤状況
  const todayStaffing = mockStores.map(store => {
    const storeShifts = todayShifts.filter(shift => shift.storeId === store.id);
    return {
      store: store.name,
      scheduled: storeShifts.length,
      required: 8, // 簡略化のための固定値
    };
  });

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
              <div className="text-3xl font-bold text-blue-600">{todayShifts.length}</div>
              <p className="text-sm text-gray-500 mt-1">件の勤務予定</p>
            </CardContent>
          </Card>

          {/* 保留中の希望休申請 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">保留中の申請</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{pendingRequests.length}</div>
              <p className="text-sm text-gray-500 mt-1">件の希望休申請</p>
            </CardContent>
          </Card>

          {/* 代打募集 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">代打募集</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{openEmergencies.length}</div>
              <p className="text-sm text-gray-500 mt-1">件の緊急募集</p>
            </CardContent>
          </Card>

          {/* 総スタッフ数 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">総スタッフ数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{mockUsers.length}</div>
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
                {todayStaffing.map((staffing, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
            </CardContent>
          </Card>

          {/* 最近の希望休申請 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>最近の希望休申請</CardTitle>
              <Button variant="ghost" size="sm">
                すべて表示
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockTimeOffRequests.slice(0, 3).map((request) => {
                  const user = mockUsers.find(u => u.id === request.userId);
                  return (
                    <div key={request.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{user?.name}</p>
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
                })}
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
              <Button className="h-16 flex flex-col items-center justify-center space-y-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>新しいシフト作成</span>
              </Button>
              
              <Button variant="secondary" className="h-16 flex flex-col items-center justify-center space-y-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <span>スタッフ管理</span>
              </Button>
              
              <Button variant="secondary" className="h-16 flex flex-col items-center justify-center space-y-1">
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