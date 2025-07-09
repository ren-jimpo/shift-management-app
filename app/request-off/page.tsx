'use client';

import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// APIから取得するデータ用の型
interface ApiTimeOffRequest {
  id: string;
  user_id: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  responded_at: string | null;
  responded_by: string | null;
  created_at: string;
  users?: {
    id: string;
    name: string;
    role: string;
  };
  responded_by_user?: {
    id: string;
    name: string;
  };
}

// フロントエンド用の型変換後
interface DisplayTimeOffRequest {
  id: string;
  userId: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  respondedAt: string | null;
  respondedBy: string | null;
  createdAt: string;
  respondedByName?: string;
}

// 仮の現在ユーザー（実際にはAuth0やFirebaseから取得）
const CURRENT_USER_ID = 'current-user-id';

export default function RequestOffPage() {
  // データベースから取得するstate
  const [requests, setRequests] = useState<DisplayTimeOffRequest[]>([]);
  
  // UI state
  const [selectedDate, setSelectedDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // データ取得関数
  const fetchTimeOffRequests = async () => {
    try {
      // 現在のユーザーの申請のみ取得
      const response = await fetch(`/api/time-off-requests?user_id=${CURRENT_USER_ID}`);
      if (!response.ok) throw new Error('希望休申請データの取得に失敗しました');
      const result = await response.json();
      
      // API response を DisplayTimeOffRequest 型に変換
      const requestsData = result.data?.map((request: ApiTimeOffRequest) => ({
        id: request.id,
        userId: request.user_id,
        date: request.date,
        reason: request.reason,
        status: request.status,
        respondedAt: request.responded_at,
        respondedBy: request.responded_by,
        createdAt: request.created_at,
        respondedByName: request.responded_by_user?.name
      })) || [];
      
      return requestsData;
    } catch (error) {
      console.error('Error fetching time off requests:', error);
      throw error;
    }
  };

  // 初期データ読み込み
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const requestsData = await fetchTimeOffRequests();
        setRequests(requestsData);
        
      } catch (error) {
        setError(error instanceof Error ? error.message : '初期データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // 申請送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // フロントエンド側バリデーション
    const trimmedReason = reason.trim();
    
    // 日付チェック
    if (!selectedDate) {
      setError('希望休日を選択してください');
      setIsSubmitting(false);
      return;
    }

    const requestDate = new Date(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestDate < today) {
      setError('過去の日付は選択できません');
      setIsSubmitting(false);
      return;
    }

    // 理由チェック
    if (trimmedReason.length < 5) {
      setError('理由は5文字以上で入力してください');
      setIsSubmitting(false);
      return;
    }

    if (trimmedReason.length > 500) {
      setError('理由は500文字以内で入力してください');
      setIsSubmitting(false);
      return;
    }

    try {
      const requestData = {
        user_id: CURRENT_USER_ID,
        date: selectedDate,
        reason: trimmedReason
      };

      const response = await fetch('/api/time-off-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '希望休申請の送信に失敗しました');
      }

      const result = await response.json();
      
      // 新しい申請をローカル状態に追加
      const newRequest: DisplayTimeOffRequest = {
        id: result.data.id,
        userId: result.data.user_id,
        date: result.data.date,
        reason: result.data.reason,
        status: result.data.status,
        respondedAt: result.data.responded_at,
        respondedBy: result.data.responded_by,
        createdAt: result.data.created_at,
        respondedByName: undefined
      };

      setRequests([newRequest, ...requests]);
      setSelectedDate('');
      setReason('');
      
      // 成功メッセージ（実際にはtoastライブラリなどを使用）
      alert('希望休申請を送信しました。店長の承認をお待ちください。');
    } catch (error) {
      setError(error instanceof Error ? error.message : '希望休申請の送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 申請削除（保留中のものだけ）
  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('この申請を削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/time-off-requests?id=${requestId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '申請の削除に失敗しました');
      }

      // ローカル状態から削除
      setRequests(requests.filter(request => request.id !== requestId));
    } catch (error) {
      setError(error instanceof Error ? error.message : '申請の削除に失敗しました');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '承認待ち';
      case 'approved': return '承認済み';
      case 'rejected': return '却下';
      default: return '不明';
    }
  };

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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">希望休申請</h1>
          <p className="text-gray-600 mt-2">希望する休日を申請できます</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 新規申請フォーム */}
          <Card>
            <CardHeader>
              <CardTitle>新しい希望休を申請</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    希望休日 *
                  </label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">今日以降の日付を選択してください</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    理由 *
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="希望休の理由を入力してください（例：家族の用事、通院、冠婚葬祭など）"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="p-4 bg-blue-50 rounded-xl">
                  <h4 className="font-medium text-blue-900 mb-2">申請前の注意事項</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 希望休は最低1週間前までに申請してください</li>
                    <li>• 繁忙期や重要なイベント時は承認されない場合があります</li>
                    <li>• 承認結果は申請後24時間以内にお知らせします</li>
                    <li>• 緊急の場合は直接店長に連絡してください</li>
                  </ul>
                </div>

                <Button type="submit" fullWidth disabled={isSubmitting || !selectedDate || !reason.trim()}>
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      送信中...
                    </>
                  ) : (
                    '申請を送信'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 申請履歴 */}
          <Card>
            <CardHeader>
              <CardTitle>申請履歴</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.length > 0 ? (
                  requests
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {new Date(request.date).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'short'
                              })}
                            </p>
                            <p className="text-sm text-gray-500">
                              申請日: {new Date(request.createdAt).toLocaleDateString('ja-JP')}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                              {getStatusText(request.status)}
                            </span>
                            {request.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRequest(request.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700">理由</p>
                          <p className="text-gray-900">{request.reason}</p>
                        </div>

                        {request.status !== 'pending' && request.respondedAt && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                              {new Date(request.respondedAt).toLocaleDateString('ja-JP', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}に{request.respondedByName || '管理者'}が{getStatusText(request.status)}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>まだ申請履歴がありません</p>
                    <p className="text-sm">最初の希望休申請をしてみましょう</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {requests.filter(r => r.status === 'pending').length}
              </div>
              <p className="text-sm text-gray-500 mt-1">承認待ち</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-green-600">
                {requests.filter(r => r.status === 'approved').length}
              </div>
              <p className="text-sm text-gray-500 mt-1">承認済み</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-blue-600">{requests.length}</div>
              <p className="text-sm text-gray-500 mt-1">総申請数</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
} 