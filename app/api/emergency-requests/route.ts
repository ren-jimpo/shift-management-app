import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - 代打募集取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
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

    // 特定のIDで検索する場合
    if (id) {
      query = query.eq('id', id);
      const { data, error } = await query.single();
      
      if (error) {
        console.error('Error fetching emergency request by ID:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data }, { status: 200 });
    }

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

// PATCH - 代打応募者承認（シフト表自動更新）
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { emergency_request_id, volunteer_id, action } = body;

    if (!emergency_request_id || !volunteer_id || !action) {
      return NextResponse.json(
        { error: 'Required fields: emergency_request_id, volunteer_id, action' },
        { status: 400 }
      );
    }

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "accept" or "reject"' },
        { status: 400 }
      );
    }

    if (action === 'reject') {
      // 応募者を削除
      const { error: deleteError } = await supabase
        .from('emergency_volunteers')
        .delete()
        .eq('id', volunteer_id);

      if (deleteError) {
        console.error('Error deleting volunteer:', deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      return NextResponse.json({ message: 'Volunteer rejected successfully' }, { status: 200 });
    }

    // action === 'accept' の場合の処理
    
    // 1. 代打募集情報と応募者情報を取得
    const { data: emergencyRequest, error: requestError } = await supabase
      .from('emergency_requests')
      .select(`
        *,
        emergency_volunteers!inner(
          id,
          user_id,
          users(id, name)
        )
      `)
      .eq('id', emergency_request_id)
      .eq('emergency_volunteers.id', volunteer_id)
      .single();

    if (requestError || !emergencyRequest) {
      console.error('Error fetching emergency request:', requestError);
      return NextResponse.json({ error: 'Emergency request not found' }, { status: 404 });
    }

    const volunteer = emergencyRequest.emergency_volunteers[0];
    if (!volunteer) {
      return NextResponse.json({ error: 'Volunteer not found' }, { status: 404 });
    }

    // 承認前に応募者が同じ日に他のシフトを持っていないかチェック
    const { data: existingShifts } = await supabase
      .from('shifts')
      .select(`
        id,
        store_id,
        status,
        stores(id, name)
      `)
      .eq('user_id', volunteer.user_id)
      .eq('date', emergencyRequest.date);

    if (existingShifts && existingShifts.length > 0) {
      const existingShift = existingShifts[0];
      const storeData = existingShift.stores as { name?: string } | null;
      
      return NextResponse.json(
        { 
          error: `Cannot approve volunteer: ${volunteer.users?.name || 'User'} already has a ${existingShift.status} shift at ${storeData?.name || '不明な店舗'} on this date`,
          conflictingStore: storeData?.name || '不明な店舗',
          conflictingStoreId: existingShift.store_id,
          conflictType: existingShift.status
        },
        { status: 409 }
      );
    }

    // 2. 該当するシフトを検索・更新
    const { data: existingShift, error: shiftFindError } = await supabase
      .from('shifts')
      .select('id')
      .eq('user_id', emergencyRequest.original_user_id)
      .eq('store_id', emergencyRequest.store_id)
      .eq('date', emergencyRequest.date)
      .eq('pattern_id', emergencyRequest.shift_pattern_id)
      .single();

    if (shiftFindError || !existingShift) {
      console.error('Error finding shift:', shiftFindError);
      return NextResponse.json({ error: 'Original shift not found' }, { status: 404 });
    }

    // 3. シフトの担当者を代打応募者に変更
    const { data: updatedShift, error: shiftUpdateError } = await supabase
      .from('shifts')
      .update({
        user_id: volunteer.user_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingShift.id)
      .select(`
        *,
        users(id, name, role, skill_level),
        stores(id, name),
        shift_patterns(id, name, start_time, end_time, color, break_time)
      `)
      .single();

    if (shiftUpdateError) {
      console.error('Error updating shift:', shiftUpdateError);
      return NextResponse.json({ error: shiftUpdateError.message }, { status: 500 });
    }

    // 4. 代打募集のステータスを'filled'に更新
    const { data: updatedRequest, error: statusUpdateError } = await supabase
      .from('emergency_requests')
      .update({ status: 'filled' })
      .eq('id', emergency_request_id)
      .select(`
        *,
        original_user:users!emergency_requests_original_user_id_fkey(id, name, role),
        stores(id, name),
        shift_patterns(id, name, start_time, end_time, color)
      `)
      .single();

    if (statusUpdateError) {
      console.error('Error updating emergency request status:', statusUpdateError);
      return NextResponse.json({ error: statusUpdateError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data: {
        emergency_request: updatedRequest,
        updated_shift: updatedShift,
        volunteer: volunteer
      },
      message: 'Volunteer accepted and shift updated successfully'
    }, { status: 200 });

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