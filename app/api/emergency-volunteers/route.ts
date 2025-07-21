import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - 代打応募者取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const emergencyRequestId = searchParams.get('emergency_request_id');
    const userId = searchParams.get('user_id');

    let query = supabase
      .from('emergency_volunteers')
      .select(`
        *,
        emergency_requests(
          id,
          date,
          reason,
          stores(id, name),
          shift_patterns(id, name, start_time, end_time)
        ),
        users(id, name, role, skill_level)
      `);

    // フィルタリング条件を適用
    if (emergencyRequestId) {
      query = query.eq('emergency_request_id', emergencyRequestId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    query = query.order('responded_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching emergency volunteers:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - 代打応募
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emergency_request_id, user_id } = body;

    // バリデーション
    if (!emergency_request_id || !user_id) {
      return NextResponse.json(
        { error: 'Required fields: emergency_request_id, user_id' },
        { status: 400 }
      );
    }

    // 重複チェック（同じユーザーが同じ代打募集に複数応募することを防ぐ）
    const { data: existingVolunteer } = await supabase
      .from('emergency_volunteers')
      .select('id')
      .eq('emergency_request_id', emergency_request_id)
      .eq('user_id', user_id)
      .single();

    if (existingVolunteer) {
      return NextResponse.json(
        { error: 'User has already volunteered for this emergency request' },
        { status: 409 }
      );
    }

    // 代打募集がまだオープンか確認
    const { data: emergencyRequest } = await supabase
      .from('emergency_requests')
      .select('status, date')
      .eq('id', emergency_request_id)
      .single();

    if (!emergencyRequest || emergencyRequest.status !== 'open') {
      return NextResponse.json(
        { error: 'Emergency request is not available for volunteering' },
        { status: 400 }
      );
    }

    // 応募者が同じ日に他のシフトを持っていないかチェック
    const { data: existingShifts } = await supabase
      .from('shifts')
      .select(`
        id,
        store_id,
        status,
        stores(id, name)
      `)
      .eq('user_id', user_id)
      .eq('date', emergencyRequest.date);

    if (existingShifts && existingShifts.length > 0) {
      const existingShift = existingShifts[0];
      const storeData = existingShift.stores as { name?: string } | null;
      
      return NextResponse.json(
        { 
          error: `Cannot apply for this emergency request: You already have a ${existingShift.status} shift at ${storeData?.name || '不明な店舗'} on this date`,
          conflictingStore: storeData?.name || '不明な店舗',
          conflictingStoreId: existingShift.store_id,
          conflictType: existingShift.status
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('emergency_volunteers')
      .insert({
        emergency_request_id,
        user_id
      })
      .select(`
        *,
        emergency_requests(
          id,
          date,
          reason,
          stores(id, name),
          shift_patterns(id, name, start_time, end_time)
        ),
        users(id, name, role, skill_level)
      `)
      .single();

    if (error) {
      console.error('Error creating emergency volunteer:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - 代打応募取り消し
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const emergencyRequestId = searchParams.get('emergency_request_id');
    const userId = searchParams.get('user_id');

    if (!id && (!emergencyRequestId || !userId)) {
      return NextResponse.json(
        { error: 'Either volunteer ID or both emergency_request_id and user_id are required' },
        { status: 400 }
      );
    }

    let query = supabase.from('emergency_volunteers').delete();

    if (id) {
      query = query.eq('id', id);
    } else {
      query = query.eq('emergency_request_id', emergencyRequestId).eq('user_id', userId);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting emergency volunteer:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Emergency volunteer deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 