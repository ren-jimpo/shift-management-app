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

    // 重複チェック（同じユーザー・日付）
    const { data: existingShift } = await supabase
      .from('shifts')
      .select('id')
      .eq('user_id', user_id)
      .eq('date', date)
      .single();

    if (existingShift) {
      return NextResponse.json(
        { error: 'User already has a shift on this date' },
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