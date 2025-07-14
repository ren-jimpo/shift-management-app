import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - シフト取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const storeId = searchParams.get('store_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const status = searchParams.get('status');

    let query = supabase
      .from('shifts')
      .select(`
        *,
        users(id, name, role, skill_level),
        stores(id, name),
        shift_patterns(id, name, start_time, end_time, color, break_time)
      `);

    // フィルタリング条件を適用
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    if (dateFrom) {
      query = query.gte('date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('date', dateTo);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('date').order('created_at');

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching shifts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - 新規シフト作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, store_id, date, pattern_id, status, notes } = body;

    // バリデーション
    if (!user_id || !store_id || !date || !pattern_id) {
      return NextResponse.json(
        { error: 'Required fields: user_id, store_id, date, pattern_id' },
        { status: 400 }
      );
    }

    // 日付の妥当性チェック
    const shiftDate = new Date(date);
    if (isNaN(shiftDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // ステータスの有効性チェック
    if (status && !['draft', 'confirmed', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "draft", "confirmed", or "completed"' },
        { status: 400 }
      );
    }

    // 重複チェック（同じユーザー・日付）- 店舗情報も含めて取得
    const { data: existingShift } = await supabase
      .from('shifts')
      .select(`
        id,
        store_id,
        stores(id, name)
      `)
      .eq('user_id', user_id)
      .eq('date', date)
      .single();

    if (existingShift) {
      const storeData = existingShift.stores as any;
      return NextResponse.json(
        { 
          error: 'User already has a shift on this date',
          conflictingStore: storeData?.name || '不明な店舗',
          conflictingStoreId: existingShift.store_id
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('shifts')
      .insert({
        user_id,
        store_id,
        date,
        pattern_id,
        status: status || 'draft',
        notes: notes ? notes.trim() : null
      })
      .select(`
        *,
        users(id, name, role, skill_level),
        stores(id, name),
        shift_patterns(id, name, start_time, end_time, color, break_time)
      `)
      .single();

    if (error) {
      console.error('Error creating shift:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - シフト更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, user_id, store_id, date, pattern_id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('shifts')
      .update({
        user_id,
        store_id,
        date,
        pattern_id,
        status,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        users(id, name, role, skill_level),
        stores(id, name),
        shift_patterns(id, name, start_time, end_time, color, break_time)
      `)
      .single();

    if (error) {
      console.error('Error updating shift:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - シフト削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting shift:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Shift deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - 週単位シフト一括更新（確定機能）
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id, week_start, week_end, status, action } = body;

    // バリデーション
    if (!store_id || !week_start || !status) {
      return NextResponse.json(
        { error: 'Required fields: store_id, week_start, status' },
        { status: 400 }
      );
    }

    if (!['draft', 'confirmed', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "draft", "confirmed", or "completed"' },
        { status: 400 }
      );
    }

    // 週の開始日と終了日を計算
    const weekStartDate = new Date(week_start);
    let weekEndDate: Date;
    
    if (week_end) {
      weekEndDate = new Date(week_end);
    } else {
      weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);
    }

    const weekStartStr = weekStartDate.toISOString().split('T')[0];
    const weekEndStr = weekEndDate.toISOString().split('T')[0];

    // 対象シフトを取得
    const { data: targetShifts, error: fetchError } = await supabase
      .from('shifts')
      .select('id, status')
      .eq('store_id', store_id)
      .gte('date', weekStartStr)
      .lte('date', weekEndStr);

    if (fetchError) {
      console.error('Error fetching target shifts:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!targetShifts || targetShifts.length === 0) {
      return NextResponse.json(
        { error: 'No shifts found for the specified period' },
        { status: 404 }
      );
    }

    // 一括更新実行
    const { data: updatedShifts, error: updateError } = await supabase
      .from('shifts')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('store_id', store_id)
      .gte('date', weekStartStr)
      .lte('date', weekEndStr)
      .select(`
        *,
        users(id, name, role, skill_level),
        stores(id, name),
        shift_patterns(id, name, start_time, end_time, color, break_time)
      `);

    if (updateError) {
      console.error('Error updating shifts:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data: updatedShifts,
      message: `Successfully updated ${updatedShifts.length} shifts to ${status}`,
      updated_count: updatedShifts.length
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 