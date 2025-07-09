import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 

// 日付ユーティリティ
export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export const formatDateTime = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleString('ja-JP');
};

export const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// バリデーションヘルパー
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\-\+\(\)\s]+$/;
  return phoneRegex.test(phone);
};

export const sanitizeString = (str: string | null | undefined): string | null => {
  return str ? str.trim() : null;
};

// レート制限
const requestTimestamps = new Map<string, number[]>();

export const checkRateLimit = (
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1分
): boolean => {
  const now = Date.now();
  const timestamps = requestTimestamps.get(identifier) || [];
  
  // 古いタイムスタンプを削除
  const validTimestamps = timestamps.filter(timestamp => 
    now - timestamp < windowMs
  );
  
  if (validTimestamps.length >= maxRequests) {
    return false; // レート制限に引っかかった
  }
  
  validTimestamps.push(now);
  requestTimestamps.set(identifier, validTimestamps);
  
  return true; // リクエスト許可
};

// エラーメッセージの国際化
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  
  if (error?.code) {
    switch (error.code) {
      case '23505':
        return 'このデータは既に存在します';
      case '23503':
        return '関連するデータが見つかりません';
      case '42P01':
        return 'テーブルが見つかりません';
      default:
        return error.message || 'エラーが発生しました';
    }
  }
  
  return error?.message || 'エラーが発生しました';
}; 