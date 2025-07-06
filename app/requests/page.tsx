'use client';

import { useState } from 'react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { mockUsers, mockTimeOffRequests, currentUser } from '@/lib/mockData';

export default function RequestsPage() {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // フィルタリング
  const filteredRequests = mockTimeOffRequests.filter(request => {
    const user = mockUsers.find(u => u.id === request.userId);
    const matchesSearch = user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

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
      case 'pending': return '保留中';
      case 'approved': return '承認済み';
      case 'rejected': return '却下済み';
      default: return '不明';
    }
  };

  const handleApprove = (requestId: string) => {
    console.log('承認:', requestId);
    // 実際の実装ではAPIコールを行う
  };

  const handleReject = (requestId: string) => {
    console.log('却下:', requestId);
    // 実際の実装ではAPIコールを行う
  };

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">希望休申請管理</h1>
            <p className="text-gray-600 mt-2">スタッフからの希望休申請を確認・承認できます</p>
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">
                {mockTimeOffRequests.filter(r => r.status === 'pending').length}
              </div>
              <p className="text-sm text-gray-500 mt-1">保留中</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {mockTimeOffRequests.filter(r => r.status === 'approved').length}
              </div>
              <p className="text-sm text-gray-500 mt-1">承認済み</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {mockTimeOffRequests.filter(r => r.status === 'rejected').length}
              </div>
              <p className="text-sm text-gray-500 mt-1">却下済み</p>
            </CardContent>
          </Card>
        </div>

        {/* フィルター */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  検索
                </label>
                <Input
                  placeholder="スタッフ名・理由で検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ステータス
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">すべて</option>
                  <option value="pending">保留中</option>
                  <option value="approved">承認済み</option>
                  <option value="rejected">却下済み</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button variant="secondary" fullWidth>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  レポート出力
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 申請リスト */}
        <Card>
          <CardHeader>
            <CardTitle>申請一覧 ({filteredRequests.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const user = mockUsers.find(u => u.id === request.userId);
                const respondedBy = request.respondedBy ? mockUsers.find(u => u.id === request.respondedBy) : null;
                
                return (
                  <div key={request.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                            {user?.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{user?.name}</h3>
                            <p className="text-sm text-gray-500">
                              申請日時: {new Date(request.createdAt).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-700">希望休日</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {new Date(request.date).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'short'
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">理由</p>
                            <p className="text-gray-900">{request.reason}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">ステータス</p>
                            <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(request.status)}`}>
                              {getStatusText(request.status)}
                            </span>
                          </div>
                        </div>

                        {request.status !== 'pending' && request.respondedAt && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">{respondedBy?.name}</span>により
                              {new Date(request.respondedAt).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}に{getStatusText(request.status)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* アクションボタン */}
                      {request.status === 'pending' && currentUser.role === 'manager' && (
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            承認
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(request.id)}
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            却下
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
} 