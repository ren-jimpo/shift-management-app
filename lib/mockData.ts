import { User, Store, ShiftPattern, Shift, TimeOffRequest, EmergencyRequest } from './types';

// モックユーザー（実際のデータベースを使用するため空に）
export const mockUsers: User[] = [];

// モック店舗データ（実際のデータベースを使用するため空に）
export const mockStores: Store[] = [];

// モックシフトパターン（実際のデータベースを使用するため空に）
export const mockShiftPatterns: ShiftPattern[] = [];

// モックシフトデータ（実際のデータベースを使用するため空に）
export const mockShifts: Shift[] = [];

// モック希望休申請（実際のデータベースを使用するため空に）
export const mockTimeOffRequests: TimeOffRequest[] = [];

// モック代打募集（実際のデータベースを使用するため空に）
export const mockEmergencyRequests: EmergencyRequest[] = [];

// 現在のユーザー（実際のログイン機能を使用するため削除）
// export const currentUser = mockUsers[0]; 