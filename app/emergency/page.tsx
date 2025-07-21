'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface User {
  id: string;
  name: string;
  role: string;
  skill_level?: string;
}

interface Store {
  id: string;
  name: string;
}

interface ShiftPattern {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
}

interface EmergencyVolunteer {
  id: string;
  user_id: string;
  responded_at: string;
  users: User;
}

interface EmergencyRequest {
  id: string;
  original_user_id: string;
  store_id: string;
  date: string;
  shift_pattern_id: string;
  reason: string;
  status: 'open' | 'filled' | 'closed';
  created_at: string;
  original_user: User;
  stores: Store;
  shift_patterns: ShiftPattern;
  emergency_volunteers: EmergencyVolunteer[];
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'staff';
  loginId: string;
  stores: string[];
}

export default function EmergencyPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [emergencyRequests, setEmergencyRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // ログインユーザー情報を取得
    const userInfo = localStorage.getItem('currentUser');
    if (!userInfo) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userInfo);
      setCurrentUser(user);
    } catch (error) {
      console.error('ユーザー情報の解析に失敗:', error);
      router.push('/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchEmergencyRequests = async () => {
      try {
        const response = await fetch('/api/emergency-requests');
        if (response.ok) {
          const data = await response.json();
          // オープン状態の代打募集のみを表示
          const openRequests = data.data.filter((req: EmergencyRequest) => req.status === 'open');
          setEmergencyRequests(openRequests);
        }
      } catch (error) {
        console.error('代打募集データ取得エラー:', error);
        setError('代打募集データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchEmergencyRequests();
  }, [currentUser]);

  // 代打応募処理
  const handleApplyEmergency = async (requestId: string) => {
    if (!currentUser) {
      setError('ユーザー認証が必要です');
      return;
    }

    // 事前チェック: 同じ日にシフトがあるかどうか確認
    const emergencyRequest = emergencyRequests.find(req => req.id === requestId);
    if (emergencyRequest) {
      try {
        // その日にシフトがあるかAPIで確認
        const response = await fetch(`/api/shifts?user_id=${currentUser.id}&date_from=${emergencyRequest.date}&date_to=${emergencyRequest.date}`);
        if (response.ok) {
          const result = await response.json();
          if (result.data && result.data.length > 0) {
            const existingShift = result.data[0];
            setError(`${emergencyRequest.date}は既に${existingShift.stores?.name || '他店舗'}でシフトが入っています`);
            return;
          }
        }
      } catch (error) {
        console.error('Shift check error:', error);
      }
    }

    if (!confirm('この代打募集に応募しますか？')) return;

    setApplyingTo(requestId);
    setError(null);

    try {
      const response = await fetch('/api/emergency-volunteers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emergency_request_id: requestId,
          user_id: currentUser.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '応募に失敗しました');
      }

      alert('代打募集に応募しました。結果をお待ちください。');
      
      // データを再取得
      window.location.reload();

    } catch (error) {
      setError(error instanceof Error ? error.message : '応募に失敗しました');
    } finally {
      setApplyingTo(null);
    }
  };

  // 既に応募済みかチェック
  const isAlreadyApplied = (request: EmergencyRequest) => {
    return request.emergency_volunteers?.some(volunteer => 
      volunteer.user_id === currentUser?.id
    );
  };

  // 緊急度を判定
  const getUrgencyLevel = (date: string) => {
    const requestDate = new Date(date);
    const today = new Date();
    const diffDays = Math.ceil((requestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return 'urgent'; // 当日・翌日
    if (diffDays <= 3) return 'soon'; // 3日以内
    return 'normal'; // それ以降
  };

  // 緊急度に応じたスタイル
  const getUrgencyStyle = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'border-red-300 bg-red-50';
      case 'soon':
        return 'border-yellow-300 bg-yellow-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  // 緊急度ラベル
  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return { text: '緊急', color: 'bg-red-100 text-red-800' };
      case 'soon':
        return { text: '急募', color: 'bg-yellow-100 text-yellow-800' };
      default:
        return { text: '募集中', color: 'bg-blue-100 text-blue-800' };
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">代打募集</h1>
              <p className="text-gray-600 mt-1">現在募集中の代打シフトに応募できます</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">緊急</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">急募</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">募集中</span>
              </div>
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* 代打募集一覧 */}
        <div className="space-y-4">
          {emergencyRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">代打募集がありません</h3>
                  <p>現在、代打を募集しているシフトはありません。</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            emergencyRequests.map((request) => {
              const urgency = getUrgencyLevel(request.date);
              const urgencyStyle = getUrgencyStyle(urgency);
              const urgencyLabel = getUrgencyLabel(urgency);
              const alreadyApplied = isAlreadyApplied(request);
              
              return (
                <Card key={request.id} className={urgencyStyle}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {new Date(request.date).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              weekday: 'long'
                            })}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${urgencyLabel.color}`}>
                            {urgencyLabel.text}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">シフト情報</h4>
                            <p className="text-gray-900">{request.shift_patterns?.name}</p>
                            <p className="text-sm text-gray-600">
                              {request.shift_patterns?.start_time} - {request.shift_patterns?.end_time}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">店舗</h4>
                            <p className="text-gray-900">{request.stores?.name}</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h4 className="font-medium text-gray-700 mb-1">元のスタッフ</h4>
                          <p className="text-gray-900">{request.original_user?.name}</p>
                        </div>

                        <div className="mb-4">
                          <h4 className="font-medium text-gray-700 mb-1">理由</h4>
                          <p className="text-gray-600">{request.reason}</p>
                        </div>

                        {request.emergency_volunteers && request.emergency_volunteers.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-700 mb-2">応募者（{request.emergency_volunteers.length}名）</h4>
                            <div className="flex flex-wrap gap-2">
                              {request.emergency_volunteers.map((volunteer) => (
                                <span 
                                  key={volunteer.id}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                                >
                                  {volunteer.users.name}
                                  {volunteer.user_id === currentUser?.id && (
                                    <span className="ml-1 text-blue-600">（あなた）</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="ml-6">
                        {alreadyApplied ? (
                          <div className="text-center">
                            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium">
                              応募済み
                            </div>
                            <p className="text-xs text-gray-500 mt-1">結果をお待ちください</p>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => handleApplyEmergency(request.id)}
                            disabled={applyingTo === request.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                          >
                            {applyingTo === request.id ? (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                応募中...
                              </div>
                            ) : (
                              '応募する'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* 注意事項 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">応募に関する注意事項</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• 代打募集への応募は取り消すことができません</li>
              <li>• 複数の応募者がいる場合、店長が最終的な選考を行います</li>
              <li>• 応募結果は個別にお知らせいたします</li>
              <li>• 緊急度の高い募集から優先的に選考が行われます</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
} 