import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendBatchTodayShiftNotifications } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    // Vercel Cron Jobの認証チェック（オプション）
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting daily shift notifications...');
    
    // 今日の日付を取得（JST）
    const today = new Date();
    const jstOffset = 9 * 60 * 60 * 1000; // JST = UTC + 9時間
    const jstToday = new Date(today.getTime() + jstOffset);
    const todayString = jstToday.toISOString().split('T')[0];
    
    console.log(`Processing shifts for date: ${todayString}`);

    // 今日の確定シフトを取得
    const { data: todayShifts, error: shiftsError } = await supabase
      .from('shifts')
      .select(`
        *,
        users(id, name, email),
        stores(id, name),
        shift_patterns(id, name, start_time, end_time)
      `)
      .eq('date', todayString)
      .eq('status', 'confirmed'); // 確定済みシフトのみ

    if (shiftsError) {
      console.error('Error fetching today shifts:', shiftsError);
      return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
    }

    if (!todayShifts || todayShifts.length === 0) {
      console.log('No confirmed shifts found for today');
      return NextResponse.json({ 
        success: true, 
        message: 'No confirmed shifts for today',
        date: todayString,
        processed: 0
      });
    }

    console.log(`Found ${todayShifts.length} confirmed shifts for today`);

    // ユーザー別にシフトをグループ化
    const userShifts = new Map();
    
    todayShifts.forEach((shift: { id: string; user_id: string; date: string; stores?: { name?: string }; shift_patterns?: { name?: string; start_time?: string; end_time?: string }; users?: { email?: string; name?: string } }) => {
      const userId = shift.user_id;
      const user = shift.users;
      
      if (!user || !user.email) {
        console.warn(`User not found or no email for shift ${shift.id}`);
        return;
      }

      if (!userShifts.has(userId)) {
        userShifts.set(userId, {
          userEmail: user.email,
          userName: user.name,
          todayShifts: []
        });
      }

      userShifts.get(userId).todayShifts.push({
        date: new Date(shift.date).toLocaleDateString('ja-JP'),
        storeName: shift.stores?.name || '不明な店舗',
        shiftPattern: shift.shift_patterns?.name || '不明なシフト',
        startTime: shift.shift_patterns?.start_time || '00:00',
        endTime: shift.shift_patterns?.end_time || '00:00'
      });
    });

    const notifications = Array.from(userShifts.values());
    console.log(`Preparing to send notifications to ${notifications.length} users`);

    // バッチ処理でメール送信
    const results = await sendBatchTodayShiftNotifications(notifications);

    console.log('Daily shift notifications completed:', results);

    return NextResponse.json({
      success: true,
      message: 'Daily shift notifications processed',
      date: todayString,
      stats: {
        totalShifts: todayShifts.length,
        usersNotified: notifications.length,
        emailResults: results
      }
    });

  } catch (error) {
    console.error('Daily shift notifications error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST method for manual trigger (testing purposes)
export async function POST(request: NextRequest) {
  console.log('Manual trigger for daily shift notifications');
  return GET(request);
} 