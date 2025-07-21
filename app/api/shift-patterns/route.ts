import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - シフトパターン一覧取得
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('shift_patterns')
      .select('*')
      .order('start_time');

    if (error) {
      console.error('Shift patterns fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch shift patterns' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Shift patterns API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - 新規シフトパターン作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, start_time, end_time, color, break_time } = body;

    // バリデーション
    if (!id || !name || !start_time || !end_time || !color) {
      return NextResponse.json(
        { error: 'Required fields: id, name, start_time, end_time, color' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('shift_patterns')
      .insert({
        id,
        name,
        start_time,
        end_time,
        color,
        break_time: break_time || 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating shift pattern:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - シフトパターン更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, start_time, end_time, color, break_time } = body;

    if (!id) {
      return NextResponse.json({ error: 'Pattern ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('shift_patterns')
      .update({
        name,
        start_time,
        end_time,
        color,
        break_time,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating shift pattern:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - シフトパターン削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Pattern ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('shift_patterns')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting shift pattern:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Shift pattern deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 