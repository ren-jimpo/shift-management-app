'use client';

import { useState } from 'react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { mockUsers, mockTimeOffRequests, currentUser } from '@/lib/mockData';

export default function RequestOffPage() {
  const [selectedDate, setSelectedDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 自分の申請のみフィルタリング
  const myRequests = mockTimeOffRequests.filter(request => request.userId === currentUser.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // モック送信処理
    setTimeout(() => {
      setIsSubmitting(false);
      setSelectedDate('');
      setReason('');
      alert('希望休申請を送信しました。店長の承認をお待ちください。');
    }, 1000);
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

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
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

                <Button type="submit" fullWidth disabled={isSubmitting}>
                  {isSubmitting ? '送信中...' : '申請を送信'}
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
                {myRequests.length > 0 ? (
                  myRequests
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((request) => {
                      const respondedBy = request.respondedBy ? mockUsers.find(u => u.id === request.respondedBy) : null;
                      
                      return (
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
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                              {getStatusText(request.status)}
                            </span>
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
                                })}に{respondedBy?.name}が{getStatusText(request.status)}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
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
                {myRequests.filter(r => r.status === 'pending').length}
              </div>
              <p className="text-sm text-gray-500 mt-1">承認待ち</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-green-600">
                {myRequests.filter(r => r.status === 'approved').length}
              </div>
              <p className="text-sm text-gray-500 mt-1">承認済み</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-blue-600">{myRequests.length}</div>
              <p className="text-sm text-gray-500 mt-1">総申請数</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
} 