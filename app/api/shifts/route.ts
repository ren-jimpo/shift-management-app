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

    // 重複チェック（同じユーザー・日付）- 確定済みシフトの優先度を考慮
    const { data: existingShifts } = await supabase
      .from('shifts')
      .select(`
        id,
        store_id,
        status,
        stores(id, name)
      `)
      .eq('user_id', user_id)
      .eq('date', date);

    if (existingShifts && existingShifts.length > 0) {
      // 確定済みシフトがある場合は完全に阻止
      const confirmedShift = existingShifts.find(shift => shift.status === 'confirmed');
      if (confirmedShift) {
        const storeData = confirmedShift.stores as { name?: string } | null;
      return NextResponse.json(
        { 
            error: 'Cannot create shift: User has a confirmed shift on this date',
          conflictingStore: storeData?.name || '不明な店舗',
            conflictingStoreId: confirmedShift.store_id,
            conflictType: 'confirmed'
        },
        { status: 409 }
      );
      }

      // 新規シフトが確定の場合、既存の下書きシフトを削除
      if (status === 'confirmed') {
        const draftShifts = existingShifts.filter(shift => shift.status === 'draft');
        if (draftShifts.length > 0) {
          // 下書きシフトを削除
          const { error: deleteError } = await supabase
            .from('shifts')
            .delete()
            .in('id', draftShifts.map(shift => shift.id));

          if (deleteError) {
            console.error('Error deleting draft shifts:', deleteError);
            return NextResponse.json({ error: 'Failed to replace draft shifts' }, { status: 500 });
          }

          console.log(`Deleted ${draftShifts.length} draft shifts for user ${user_id} on ${date}`);
        }
      } else {
        // 新規シフトが下書きの場合、既存の下書きシフトがあれば阻止
        const draftShift = existingShifts[0];
        const storeData = draftShift.stores as { name?: string } | null;
        return NextResponse.json(
          { 
            error: 'Cannot create shift: User already has a shift on this date',
            conflictingStore: storeData?.name || '不明な店舗',
            conflictingStoreId: draftShift.store_id,
            conflictType: 'draft'
          },
          { status: 409 }
        );
      }
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

    // 現在のシフトを取得
    const { data: currentShift, error: currentShiftError } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', id)
      .single();

    if (currentShiftError) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // 重複チェック（ユーザー・日付・店舗が変更される場合）
    if (currentShift.user_id !== user_id || currentShift.date !== date || currentShift.store_id !== store_id) {
      const { data: conflictingShifts } = await supabase
        .from('shifts')
        .select(`
          id,
          store_id,
          status,
          stores(id, name)
        `)
        .eq('user_id', user_id)
        .eq('date', date)
        .neq('id', id); // 現在のシフトは除外

      if (conflictingShifts && conflictingShifts.length > 0) {
        // 確定済みシフトがある場合は完全に阻止
        const confirmedConflict = conflictingShifts.find(shift => shift.status === 'confirmed');
        if (confirmedConflict) {
          const storeData = confirmedConflict.stores as { name?: string } | null;
          return NextResponse.json(
            { 
              error: 'Cannot modify shift: User has a confirmed shift on this date',
              conflictingStore: storeData?.name || '不明な店舗',
              conflictingStoreId: confirmedConflict.store_id,
              conflictType: 'confirmed'
            },
            { status: 409 }
          );
        }

        // 更新シフトが確定の場合、既存の下書きシフトを削除
        if (status === 'confirmed') {
          const draftConflicts = conflictingShifts.filter(shift => shift.status === 'draft');
          if (draftConflicts.length > 0) {
            // 下書きシフトを削除
            const { error: deleteError } = await supabase
              .from('shifts')
              .delete()
              .in('id', draftConflicts.map(shift => shift.id));

            if (deleteError) {
              console.error('Error deleting conflicting draft shifts:', deleteError);
              return NextResponse.json({ error: 'Failed to replace draft shifts' }, { status: 500 });
            }

            console.log(`Deleted ${draftConflicts.length} conflicting draft shifts for user ${user_id} on ${date}`);
          }
        } else {
          // 更新シフトが下書きの場合、既存の下書きシフトがあれば阻止
          const draftConflict = conflictingShifts[0];
          const storeData = draftConflict.stores as { name?: string } | null;
          return NextResponse.json(
            { 
              error: 'Cannot modify shift: User already has a shift on this date',
              conflictingStore: storeData?.name || '不明な店舗',
              conflictingStoreId: draftConflict.store_id,
              conflictType: 'draft'
            },
            { status: 409 }
          );
        }
      }
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
    const { store_id, week_start, week_end, status } = body;

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