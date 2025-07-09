import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - 代打募集取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    let query = supabase
      .from('emergency_requests')
      .select(`
        *,
        original_user:users!emergency_requests_original_user_id_fkey(id, name, role),
        stores(id, name),
        shift_patterns(id, name, start_time, end_time, color),
        emergency_volunteers(
          id,
          responded_at,
          users(id, name, role, skill_level)
        )
      `);

    // フィルタリング条件を適用
    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (dateFrom) {
      query = query.gte('date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('date', dateTo);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching emergency requests:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - 新規代打募集作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { original_user_id, store_id, date, shift_pattern_id, reason } = body;

    // バリデーション
    if (!original_user_id || !store_id || !date || !shift_pattern_id || !reason) {
      return NextResponse.json(
        { error: 'Required fields: original_user_id, store_id, date, shift_pattern_id, reason' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('emergency_requests')
      .insert({
        original_user_id,
        store_id,
        date,
        shift_pattern_id,
        reason,
        status: 'open'
      })
      .select(`
        *,
        original_user:users!emergency_requests_original_user_id_fkey(id, name, role),
        stores(id, name),
        shift_patterns(id, name, start_time, end_time, color)
      `)
      .single();

    if (error) {
      console.error('Error creating emergency request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - 代打募集ステータス更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Required fields: id, status' },
        { status: 400 }
      );
    }

    if (!['open', 'filled', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be either "open", "filled", or "cancelled"' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('emergency_requests')
      .update({ status })
      .eq('id', id)
      .select(`
        *,
        original_user:users!emergency_requests_original_user_id_fkey(id, name, role),
        stores(id, name),
        shift_patterns(id, name, start_time, end_time, color),
        emergency_volunteers(
          id,
          responded_at,
          users(id, name, role, skill_level)
        )
      `)
      .single();

    if (error) {
      console.error('Error updating emergency request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - 代打募集削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Emergency request ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('emergency_requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting emergency request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Emergency request deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 