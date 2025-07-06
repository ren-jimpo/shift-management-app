// 基本型定義
export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'manager' | 'staff';
  stores: string[];
  skillLevel: 'training' | 'regular' | 'veteran';
  memo?: string;
}

export interface Store {
  id: string;
  name: string;
  requiredStaff: {
    [dayOfWeek: string]: {
      [timeSlot: string]: number;
    };
  };
  flexibleStaff: string[]; // 応援可能なスタッフID
}

export interface ShiftPattern {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  breakTime?: number; // 分単位
}

export interface Shift {
  id: string;
  userId: string;
  storeId: string;
  date: string;
  patternId: string;
  status: 'draft' | 'confirmed' | 'completed';
  notes?: string;
}

export interface TimeOffRequest {
  id: string;
  userId: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  respondedAt?: string;
  respondedBy?: string;
}

export interface EmergencyRequest {
  id: string;
  originalUserId: string;
  storeId: string;
  date: string;
  shiftPatternId: string;
  reason: string;
  status: 'open' | 'filled' | 'cancelled';
  createdAt: string;
  volunteers: {
    userId: string;
    respondedAt: string;
  }[];
} 