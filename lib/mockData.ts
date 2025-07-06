import { User, Store, ShiftPattern, Shift, TimeOffRequest, EmergencyRequest } from './types';

// モックユーザー
export const mockUsers: User[] = [
  {
    id: '1',
    name: '田中 太郎',
    phone: '090-1234-5678',
    email: 'tanaka@example.com',
    role: 'manager',
    stores: ['kyobashi', 'tenma'],
    skillLevel: 'veteran',
    memo: '店長経験5年、京橋店責任者'
  },
  {
    id: '2',
    name: '佐藤 花子',
    phone: '090-2345-6789',
    email: 'sato@example.com',
    role: 'staff',
    stores: ['kyobashi'],
    skillLevel: 'regular',
    memo: 'ランチタイム得意、週3勤務希望'
  },
  {
    id: '3',
    name: '山田 次郎',
    phone: '090-3456-7890',
    email: 'yamada@example.com',
    role: 'staff',
    stores: ['tenma', 'honcho'],
    skillLevel: 'veteran',
    memo: '応援勤務可能、フルタイム希望'
  },
  {
    id: '4',
    name: '鈴木 美咲',
    phone: '090-4567-8901',
    email: 'suzuki@example.com',
    role: 'staff',
    stores: ['honcho'],
    skillLevel: 'training',
    memo: '学生、平日夕方〜夜のみ'
  },
  {
    id: '5',
    name: '高橋 健一',
    phone: '090-5678-9012',
    email: 'takahashi@example.com',
    role: 'staff',
    stores: ['kyobashi', 'tenma'],
    skillLevel: 'regular',
    memo: '土日祝日勤務可能、料理得意'
  },
  {
    id: '6',
    name: '伊藤 さくら',
    phone: '090-6789-0123',
    email: 'ito@example.com',
    role: 'staff',
    stores: ['honcho'],
    skillLevel: 'training',
    memo: '新人研修中、接客練習中'
  }
];

// モック店舗データ
export const mockStores: Store[] = [
  {
    id: 'kyobashi',
    name: '京橋店',
    requiredStaff: {
      monday: { morning: 2, lunch: 3, evening: 2 },
      tuesday: { morning: 2, lunch: 3, evening: 2 },
      wednesday: { morning: 2, lunch: 3, evening: 2 },
      thursday: { morning: 2, lunch: 3, evening: 3 },
      friday: { morning: 2, lunch: 4, evening: 3 },
      saturday: { morning: 3, lunch: 4, evening: 3 },
      sunday: { morning: 2, lunch: 3, evening: 2 }
    },
    flexibleStaff: ['3', '5']
  },
  {
    id: 'tenma',
    name: '天満店',
    requiredStaff: {
      monday: { morning: 2, lunch: 2, evening: 2 },
      tuesday: { morning: 2, lunch: 2, evening: 2 },
      wednesday: { morning: 2, lunch: 2, evening: 2 },
      thursday: { morning: 2, lunch: 3, evening: 2 },
      friday: { morning: 2, lunch: 3, evening: 3 },
      saturday: { morning: 2, lunch: 3, evening: 3 },
      sunday: { morning: 2, lunch: 2, evening: 2 }
    },
    flexibleStaff: ['1', '3', '5']
  },
  {
    id: 'honcho',
    name: '本町店',
    requiredStaff: {
      monday: { morning: 2, lunch: 3, evening: 2 },
      tuesday: { morning: 2, lunch: 3, evening: 2 },
      wednesday: { morning: 2, lunch: 3, evening: 2 },
      thursday: { morning: 2, lunch: 3, evening: 3 },
      friday: { morning: 3, lunch: 4, evening: 3 },
      saturday: { morning: 3, lunch: 4, evening: 3 },
      sunday: { morning: 2, lunch: 3, evening: 2 }
    },
    flexibleStaff: ['3']
  }
];

// モックシフトパターン
export const mockShiftPatterns: ShiftPattern[] = [
  {
    id: 'morning',
    name: 'モーニング',
    startTime: '08:00',
    endTime: '13:00',
    color: '#FFE5B4',
    breakTime: 60
  },
  {
    id: 'lunch',
    name: 'ランチ',
    startTime: '11:00',
    endTime: '16:00',
    color: '#B4E5FF',
    breakTime: 60
  },
  {
    id: 'evening',
    name: 'イブニング',
    startTime: '17:00',
    endTime: '22:00',
    color: '#FFB4E5',
    breakTime: 60
  },
  {
    id: 'full',
    name: '通し',
    startTime: '10:00',
    endTime: '21:00',
    color: '#FFAA80',
    breakTime: 120
  }
];

// モックシフトデータ（今週分）
export const mockShifts: Shift[] = [
  {
    id: 's1',
    userId: '1',
    storeId: 'kyobashi',
    date: '2024-12-30',
    patternId: 'full',
    status: 'confirmed'
  },
  {
    id: 's2',
    userId: '2',
    storeId: 'kyobashi',
    date: '2024-12-30',
    patternId: 'lunch',
    status: 'confirmed'
  },
  {
    id: 's3',
    userId: '3',
    storeId: 'tenma',
    date: '2024-12-30',
    patternId: 'evening',
    status: 'confirmed'
  },
  {
    id: 's4',
    userId: '4',
    storeId: 'honcho',
    date: '2024-12-30',
    patternId: 'evening',
    status: 'draft'
  }
];

// モック希望休申請
export const mockTimeOffRequests: TimeOffRequest[] = [
  {
    id: 'tor1',
    userId: '2',
    date: '2025-01-05',
    reason: '家族の用事',
    status: 'pending',
    createdAt: '2024-12-28T10:00:00Z'
  },
  {
    id: 'tor2',
    userId: '4',
    date: '2025-01-10',
    reason: '大学の試験',
    status: 'approved',
    createdAt: '2024-12-25T15:30:00Z',
    respondedAt: '2024-12-26T09:00:00Z',
    respondedBy: '1'
  },
  {
    id: 'tor3',
    userId: '3',
    date: '2025-01-15',
    reason: '通院',
    status: 'pending',
    createdAt: '2024-12-29T14:00:00Z'
  },
  {
    id: 'tor4',
    userId: '5',
    date: '2025-01-08',
    reason: '友人の結婚式',
    status: 'approved',
    createdAt: '2024-12-24T11:00:00Z',
    respondedAt: '2024-12-25T08:00:00Z',
    respondedBy: '1'
  },
  {
    id: 'tor5',
    userId: '6',
    date: '2025-01-12',
    reason: '体調不良',
    status: 'rejected',
    createdAt: '2024-12-27T16:00:00Z',
    respondedAt: '2024-12-28T09:00:00Z',
    respondedBy: '1'
  }
];

// モック代打募集
export const mockEmergencyRequests: EmergencyRequest[] = [
  {
    id: 'er1',
    originalUserId: '2',
    storeId: 'kyobashi',
    date: '2024-12-31',
    shiftPatternId: 'lunch',
    reason: '体調不良',
    status: 'open',
    createdAt: '2024-12-30T07:00:00Z',
    volunteers: [
      {
        userId: '3',
        respondedAt: '2024-12-30T07:15:00Z'
      }
    ]
  }
];

// 現在のユーザー（ログイン中のユーザー）
export const currentUser = mockUsers[0]; // 田中店長でログイン中と仮定 