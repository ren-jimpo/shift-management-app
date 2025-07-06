'use client';

import { useState } from 'react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { mockStores, mockUsers } from '@/lib/mockData';

export default function StoreSettingsPage() {
  const [selectedStore, setSelectedStore] = useState(mockStores[0].id);
  const [isSaving, setIsSaving] = useState(false);

  const currentStore = mockStores.find(store => store.id === selectedStore);
  const timeSlots = ['morning', 'lunch', 'evening'];
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = ['月', '火', '水', '木', '金', '土', '日'];

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('設定を保存しました');
    }, 1000);
  };

  const getTimeSlotLabel = (slot: string) => {
    switch (slot) {
      case 'morning': return 'モーニング (8:00-13:00)';
      case 'lunch': return 'ランチ (11:00-16:00)';
      case 'evening': return 'イブニング (17:00-22:00)';
      default: return slot;
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">店舗設定</h1>
            <p className="text-gray-600 mt-2">各店舗の必要人数と応援可能スタッフを設定できます</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '設定を保存'}
          </Button>
        </div>

        {/* 店舗選択 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">
                設定する店舗:
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {mockStores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {currentStore && (
          <>
            {/* 必要人数設定 */}
            <Card>
              <CardHeader>
                <CardTitle>{currentStore.name} - 必要人数設定</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-3 font-medium text-gray-900 bg-gray-50">時間帯</th>
                        {dayLabels.map((day, index) => (
                          <th key={index} className="text-center p-3 font-medium text-gray-900 bg-gray-50 min-w-20">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((timeSlot) => (
                        <tr key={timeSlot} className="border-b border-gray-100">
                          <td className="p-3 bg-gray-50 font-medium text-gray-900">
                            {getTimeSlotLabel(timeSlot)}
                          </td>
                          {dayNames.map((dayName, dayIndex) => {
                            const currentValue = currentStore.requiredStaff[dayName]?.[timeSlot] || 0;
                            return (
                              <td key={dayIndex} className="p-2 text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  max="10"
                                  defaultValue={currentValue}
                                  className="w-16 text-center"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                  <h4 className="font-medium text-blue-900 mb-2">設定のヒント</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 平日と週末で異なる人数設定が可能です</li>
                    <li>• 繁忙時間帯（ランチ、ディナー）は多めに設定することをお勧めします</li>
                    <li>• 0を設定すると該当時間帯は営業していないことを表します</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 応援可能スタッフ設定 */}
            <Card>
              <CardHeader>
                <CardTitle>{currentStore.name} - 応援可能スタッフ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    他店舗から応援に来ることができるスタッフを選択してください
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mockUsers
                      .filter(user => user.role === 'staff')
                      .map((user) => {
                        const isFlexible = currentStore.flexibleStaff.includes(user.id);
                        const userStores = user.stores.map(storeId => {
                          const store = mockStores.find(s => s.id === storeId);
                          return store?.name;
                        }).join(', ');
                        
                        return (
                          <div key={user.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-xl">
                            <input
                              type="checkbox"
                              id={`flexible-${user.id}`}
                              defaultChecked={isFlexible}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <div className="flex-1">
                              <label htmlFor={`flexible-${user.id}`} className="font-medium text-gray-900 cursor-pointer">
                                {user.name}
                              </label>
                              <div className="text-sm text-gray-500">
                                所属: {userStores} | スキル: {
                                  user.skillLevel === 'veteran' ? 'ベテラン' :
                                  user.skillLevel === 'regular' ? '一般' : '研修中'
                                }
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <div className="p-4 bg-green-50 rounded-xl">
                    <h4 className="font-medium text-green-900 mb-2">応援スタッフのメリット</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• 急な欠員時に迅速な対応が可能になります</li>
                      <li>• 店舗間での人員調整がスムーズになります</li>
                      <li>• スタッフのスキル向上と経験拡大に貢献します</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 固定シフト設定 */}
            <Card>
              <CardHeader>
                <CardTitle>固定シフト設定</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    特定のスタッフの固定勤務時間を設定できます（例：店長の固定出勤など）
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-4 p-3 border border-gray-200 rounded-xl">
                      <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">スタッフを選択</option>
                        {mockUsers
                          .filter(user => user.stores.includes(selectedStore))
                          .map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                          ))}
                      </select>
                      
                      <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">曜日を選択</option>
                        {dayLabels.map((day, index) => (
                          <option key={index} value={dayNames[index]}>{day}曜日</option>
                        ))}
                      </select>
                      
                      <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">時間帯を選択</option>
                        {timeSlots.map(slot => (
                          <option key={slot} value={slot}>{getTimeSlotLabel(slot)}</option>
                        ))}
                      </select>
                      
                      <Button size="sm">追加</Button>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-xl">
                    <h4 className="font-medium text-yellow-900 mb-2">固定シフトについて</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• 固定シフトは毎週自動的に配置されます</li>
                      <li>• 希望休申請があった場合は手動調整が必要です</li>
                      <li>• 店長などの責任者の固定出勤に適用します</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
} 