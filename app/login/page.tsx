'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // 1. ログイン用IDでユーザー情報を取得
      const response = await fetch(`/api/users?login_id=${encodeURIComponent(loginId)}`);
      
      if (!response.ok) {
        throw new Error('ログイン用IDまたはパスワードが正しくありません');
      }
      
      const result = await response.json();
      const users = result.data || [];
      
      // 2. ログイン用IDに基づいてユーザーを検索
      const user = users.find((u: any) => {
        // ログイン用IDの形式: kyb-001, ten-001, hon-001, mgr-001 など
        const userStores = u.user_stores || [];
        const userRole = u.role;
        
        if (userRole === 'manager' && loginId.startsWith('mgr-')) {
          return true;
        }
        
        if (userRole === 'staff') {
          // スタッフの場合、店舗コードとIDの形式をチェック
          const storeCodeMap: { [key: string]: string } = {
            'kyobashi': 'kyb',
            'tenma': 'ten',
            'honcho': 'hon'
          };
          
          return userStores.some((us: any) => {
            const storeCode = storeCodeMap[us.store_id];
            return storeCode && loginId.startsWith(`${storeCode}-`);
          });
        }
        
        return false;
      });
      
      if (!user) {
        throw new Error('ログイン用IDが見つかりません');
      }
      
      // 3. パスワード認証（現在はモック）
      if (!password) {
        throw new Error('パスワードを入力してください');
      }
      
      // TODO: 実際のパスワード認証を実装
      // 現在はモック認証として任意のパスワードを受け付ける
      
      // 4. ログイン成功時、ユーザー情報をローカルストレージに保存
      const userInfo = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        loginId: loginId,
        stores: user.user_stores?.map((us: any) => us.store_id) || []
      };
      
      localStorage.setItem('currentUser', JSON.stringify(userInfo));
      
      // 5. ロール別リダイレクト
      if (user.role === 'manager') {
        router.push('/dashboard');
      } else {
        router.push('/staff-dashboard'); // スタッフ用ダッシュボード（次に作成）
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ロゴエリア */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">シフト管理システム</h1>
          <p className="text-gray-600">ログイン用IDでアクセスしてください</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ログイン</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  ログイン用ID
                </label>
                <Input
                  type="text"
                  placeholder="例: kyb-001, ten-001, mgr-001"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500">
                  店長から発行されたログイン用IDを入力してください
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  パスワード
                </label>
                <Input
                  type="password"
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button 
                type="submit" 
                fullWidth 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ログイン中...
                  </>
                ) : (
                  'ログイン'
                )}
              </Button>
            </form>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">ログイン用ID例</h4>
              <div className="text-xs text-blue-800 space-y-1">
                <div>• 京橋店スタッフ: kyb-001, kyb-002...</div>
                <div>• 天満店スタッフ: ten-001, ten-002...</div>
                <div>• 本町店スタッフ: hon-001, hon-002...</div>
                <div>• 店長: mgr-001</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 