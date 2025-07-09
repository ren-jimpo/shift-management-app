import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - 店舗一覧取得
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select(`
        *,
        user_stores(
          user_id,
          is_flexible,
          users(id, name, role, skill_level)
        )
      `)
      .order('name');

    if (error) {
      console.error('Error fetching stores:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - 新規店舗作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, required_staff } = body;

    // バリデーション
    if (!id || !name || !required_staff) {
      return NextResponse.json(
        { error: 'Required fields: id, name, required_staff' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('stores')
      .insert({
        id,
        name,
        required_staff
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating store:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - 店舗更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, required_staff } = body;

    if (!id) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('stores')
      .update({
        name,
        required_staff,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating store:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - 店舗削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting store:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Store deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 