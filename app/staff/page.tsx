'use client';

import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
// import type { User, Store } from '@/lib/types'; // 未使用のため削除

// APIから取得するデータ用の型
interface ApiUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'manager' | 'staff';
  skill_level: 'training' | 'regular' | 'veteran';
  memo?: string;
  login_id?: string;
  user_stores?: Array<{
    store_id: string;
    stores: { id: string; name: string };
  }>;
}

interface ApiStore {
  id: string;
  name: string;
}

// フロントエンド用の型変換後
interface DisplayUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'manager' | 'staff';
  skillLevel: 'training' | 'regular' | 'veteran';
  memo?: string;
  loginId?: string;
  stores: string[];
}

export default function StaffPage() {
  // データベースから取得するstate
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [stores, setStores] = useState<ApiStore[]>([]);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DisplayUser | null>(null);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ID生成用のstate
  const [generatedLoginId, setGeneratedLoginId] = useState<string>('');
  const [showLoginId, setShowLoginId] = useState(false);

  // フォーム用state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'staff' as 'manager' | 'staff',
    skill_level: 'training' as 'training' | 'regular' | 'veteran',
    memo: '',
    stores: [] as string[]
  });

  // データ取得関数
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('ユーザーデータの取得に失敗しました');
      const result = await response.json();
      
      // API response を DisplayUser 型に変換
      const usersData = result.data?.map((user: ApiUser) => ({
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        skillLevel: user.skill_level,
        memo: user.memo,
        loginId: user.login_id,
        stores: user.user_stores?.map(us => us.store_id) || []
      })) || [];
      
      return usersData;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  };

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/stores');
      if (!response.ok) throw new Error('店舗データの取得に失敗しました');
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching stores:', error);
      throw error;
    }
  };

  // 初期データ読み込み
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [usersData, storesData] = await Promise.all([
          fetchUsers(),
          fetchStores()
        ]);
        
        setUsers(usersData);
        setStores(storesData);
        
      } catch (error) {
        setError(error instanceof Error ? error.message : '初期データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // フィルタリング
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStore = selectedStore === 'all' || user.stores.includes(selectedStore);
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    
    return matchesSearch && matchesStore && matchesRole;
  });

  // ログイン用ID生成関数
  const generateLoginId = (name: string, stores: string[], role: 'manager' | 'staff') => {
    if (!name) return '';
    
    // 店長の場合
    if (role === 'manager') {
      // 既存の店長数を取得して連番を生成
      const existingManagerCount = users.filter(user => user.role === 'manager').length;
      const nextNumber = String(existingManagerCount + 1).padStart(3, '0');
      return `mgr-${nextNumber}`;
    }
    
    // スタッフの場合
    if (stores.length === 0) return '';
    
    // 店舗コードのマッピング
    const storeCodeMap: { [key: string]: string } = {
      'kyobashi': 'kyb',
      'tenma': 'ten',
      'honcho': 'hon'
    };
    
    // メイン店舗（最初の店舗）のコードを取得
    const mainStore = stores[0];
    const storeCode = storeCodeMap[mainStore] || 'gen';
    
    // 該当店舗の既存スタッフ数を取得して連番を生成
    const existingStaffCount = users.filter(user => 
      user.role === 'staff' && user.stores.includes(mainStore)
    ).length;
    
    const nextNumber = String(existingStaffCount + 1).padStart(3, '0');
    return `${storeCode}-${nextNumber}`;
  };

  // ユーザー作成・更新
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const endpoint = editingUser ? '/api/users' : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      const requestData = {
        ...(editingUser && { id: editingUser.id }),
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        skill_level: formData.skill_level,
        memo: formData.memo || null,
        stores: formData.stores
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `ユーザーの${editingUser ? '更新' : '作成'}に失敗しました`);
      }

      // 新規作成時にAPIから返されたログインIDを表示
      if (!editingUser) {
        const responseData = await response.json();
        const createdUser = responseData.data;
        if (createdUser && createdUser.login_id) {
          setGeneratedLoginId(createdUser.login_id);
          setShowLoginId(true);
        }
      }

      // データを再取得して最新の状態に更新
      const updatedUsers = await fetchUsers();
      setUsers(updatedUsers);
      
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      setError(error instanceof Error ? error.message : `ユーザーの${editingUser ? '更新' : '作成'}に失敗しました`);
    } finally {
      setSaving(false);
    }
  };

  // ユーザー削除
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('このユーザーを削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ユーザーの削除に失敗しました');
      }

      // ローカル状態から削除
      setUsers(users.filter(user => user.id !== userId));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'ユーザーの削除に失敗しました');
    }
  };

  const handleEditUser = (user: DisplayUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      skill_level: user.skillLevel,
      memo: user.memo || '',
      stores: user.stores
    });
    setIsModalOpen(true);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'staff',
      skill_level: 'training',
      memo: '',
      stores: []
    });
    setShowLoginId(false);
    setGeneratedLoginId('');
  };

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'veteran': return 'bg-green-100 text-green-800';
      case 'regular': return 'bg-blue-100 text-blue-800';
      case 'training': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSkillLevelText = (level: string) => {
    switch (level) {
      case 'veteran': return 'ベテラン';
      case 'regular': return '一般';
      case 'training': return '研修中';
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">スタッフ管理</h1>
            <p className="text-gray-600 mt-2">スタッフの登録・編集・権限管理を行えます</p>
          </div>
          <Button onClick={handleAddUser} disabled={loading || saving}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新しいスタッフを追加
          </Button>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{users.length}</div>
              <p className="text-sm text-gray-500 mt-1">総スタッフ数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {users.filter(u => u.role === 'manager').length}
              </div>
              <p className="text-sm text-gray-500 mt-1">店長</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {users.filter(u => u.skillLevel === 'veteran').length}
              </div>
              <p className="text-sm text-gray-500 mt-1">ベテランスタッフ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">
                {users.filter(u => u.skillLevel === 'training').length}
              </div>
              <p className="text-sm text-gray-500 mt-1">研修中スタッフ</p>
            </CardContent>
          </Card>
        </div>

        {/* フィルター */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  検索
                </label>
                <Input
                  placeholder="名前・メールアドレスで検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  店舗
                </label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="all">すべての店舗</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  権限
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="all">すべての権限</option>
                  <option value="manager">店長</option>
                  <option value="staff">スタッフ</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button variant="secondary" fullWidth disabled={loading}>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  エクスポート
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* スタッフリスト */}
        <Card>
          <CardHeader>
            <CardTitle>スタッフ一覧 ({filteredUsers.length}人)</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p>条件に一致するスタッフが見つかりません</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* アバター */}
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                          {user.name.charAt(0)}
                        </div>
                        
                        {/* ユーザー情報 */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                            {user.role === 'manager' && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                店長
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${getSkillLevelColor(user.skillLevel)}`}>
                              {getSkillLevelText(user.skillLevel)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center space-x-4">
                              <span>📧 {user.email}</span>
                              <span>📞 {user.phone}</span>
                            </div>
                            {/* ログイン用ID表示 */}
                            <div className="flex items-center space-x-2">
                              <span>🔑</span>
                              <span className="font-mono text-blue-600 font-medium">
                                {user.loginId || generateLoginId(user.name, user.stores, user.role)}
                              </span>
                              <button
                                onClick={() => {
                                  const loginId = user.loginId || generateLoginId(user.name, user.stores, user.role);
                                  navigator.clipboard.writeText(loginId);
                                  alert('ログイン用IDをクリップボードにコピーしました');
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="ログイン用IDをコピー"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span>🏪</span>
                              <span>
                                {user.stores.map(storeId => {
                                  const store = stores.find(s => s.id === storeId);
                                  return store?.name;
                                }).filter(Boolean).join(', ') || '未設定'}
                              </span>
                            </div>
                            {user.memo && (
                              <div className="text-gray-500">
                                💭 {user.memo}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          disabled={saving}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={saving}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* モーダル（スタッフ追加・編集） */}
        {isModalOpen && (
          <div 
            className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setIsModalOpen(false)}
          >
            <div 
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingUser ? 'スタッフ編集' : '新しいスタッフ追加'}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                    disabled={saving}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        氏名 *
                      </label>
                      <Input 
                        placeholder="山田 太郎" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required 
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        メールアドレス *
                      </label>
                      <Input 
                        type="email" 
                        placeholder="yamada@example.com" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required 
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        電話番号 *
                      </label>
                      <Input 
                        placeholder="090-1234-5678" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        required 
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        権限 *
                      </label>
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value as 'manager' | 'staff'})}
                        disabled={saving}
                      >
                        <option value="staff">スタッフ</option>
                        <option value="manager">店長</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        スキルレベル *
                      </label>
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.skill_level}
                        onChange={(e) => setFormData({...formData, skill_level: e.target.value as 'training' | 'regular' | 'veteran'})}
                        disabled={saving}
                      >
                        <option value="training">研修中</option>
                        <option value="regular">一般</option>
                        <option value="veteran">ベテラン</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        所属店舗 *
                      </label>
                      <div className="border border-gray-300 rounded-xl p-3 space-y-2">
                        {stores.map(store => (
                          <label key={store.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.stores.includes(store.id)}
                              onChange={(e) => {
                                const storeId = store.id;
                                let newStores: string[];
                                
                                if (e.target.checked) {
                                  // チェックされた場合、配列に追加
                                  newStores = [...formData.stores, storeId];
                                } else {
                                  // チェックが外された場合、配列から削除
                                  newStores = formData.stores.filter(id => id !== storeId);
                                }
                                
                                setFormData({...formData, stores: newStores});
                              }}
                              disabled={saving}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-sm text-gray-700 font-medium">{store.name}</span>
                          </label>
                        ))}
                        {stores.length === 0 && (
                          <p className="text-sm text-gray-500 py-2">店舗データを読み込み中...</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        複数の店舗を選択可能です（選択済み: {formData.stores.length}店舗）
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      メモ
                    </label>
                    <textarea
                      rows={3}
                      placeholder="面談履歴、注意事項、特記事項など"
                      value={formData.memo}
                      onChange={(e) => setFormData({...formData, memo: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      disabled={saving}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsModalOpen(false)}
                      disabled={saving}
                    >
                      キャンセル
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingUser ? '更新中...' : '追加中...'}
                        </>
                      ) : (
                        editingUser ? '更新' : '追加'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ログイン用ID表示モーダル */}
        {showLoginId && (
          <div 
            className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowLoginId(false)}
          >
            <div 
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  スタッフ登録完了
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  スタッフのログイン用IDが発行されました
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="text-sm text-blue-800 mb-2">ログイン用ID</div>
                  <div className="text-2xl font-bold text-blue-900 tracking-wider">
                    {generatedLoginId}
                  </div>
                  <div className="text-xs text-blue-600 mt-2">
                    このIDでログインできます
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                  <div className="text-xs text-yellow-800">
                    <div className="font-medium mb-1">重要な注意事項</div>
                    <ul className="text-left space-y-1">
                      <li>• このIDをスタッフに伝えてください</li>
                      <li>• 初回ログイン時にパスワード設定が必要です</li>
                      <li>• IDは後から変更できません</li>
                    </ul>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLoginId);
                      alert('ログイン用IDをクリップボードにコピーしました');
                    }}
                    className="flex-1"
                  >
                    IDをコピー
                  </Button>
                  <Button
                    onClick={() => setShowLoginId(false)}
                    className="flex-1"
                  >
                    確認
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
} 