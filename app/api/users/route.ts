import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - ユーザー一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');
    const role = searchParams.get('role');

    let query = supabase
      .from('users')
      .select(`
        *,
        user_stores!inner(
          store_id,
          is_flexible,
          stores(id, name)
        )
      `);

    // 店舗でフィルタリング
    if (storeId) {
      query = query.eq('user_stores.store_id', storeId);
    }

    // ロールでフィルタリング
    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - 新規ユーザー作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, role, skill_level, memo, stores } = body;

    // バリデーション
    if (!name || !phone || !email || !role || !skill_level) {
      return NextResponse.json(
        { error: 'Required fields: name, phone, email, role, skill_level' },
        { status: 400 }
      );
    }

    // 名前の長さチェック
    if (name.trim().length < 2 || name.trim().length > 50) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 50 characters' },
        { status: 400 }
      );
    }

    // メールアドレスの基本的なフォーマットチェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // 電話番号の基本チェック（数字とハイフンのみ）
    const phoneRegex = /^[\d\-\+\(\)\s]+$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // 役割の有効性チェック
    if (!['manager', 'staff'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be either "manager" or "staff"' },
        { status: 400 }
      );
    }

    // スキルレベルの有効性チェック
    if (!['training', 'regular', 'veteran'].includes(skill_level)) {
      return NextResponse.json(
        { error: 'Skill level must be "training", "regular", or "veteran"' },
        { status: 400 }
      );
    }

    // ユーザー作成
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        role,
        skill_level,
        memo: memo ? memo.trim() : null
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      // 重複エラーの場合、よりわかりやすいメッセージを返す
      if (userError.code === '23505' && userError.message.includes('email')) {
        return NextResponse.json({ error: 'This email address is already registered' }, { status: 409 });
      }
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // 店舗関連を作成
    if (stores && stores.length > 0) {
      const userStoreRelations = stores.map((storeId: string) => ({
        user_id: user.id,
        store_id: storeId,
        is_flexible: false
      }));

      const { error: relationError } = await supabase
        .from('user_stores')
        .insert(userStoreRelations);

      if (relationError) {
        console.error('Error creating user-store relations:', relationError);
        // ユーザーは作成されているので、関連のみエラー
        return NextResponse.json({ 
          data: user,
          warning: 'User created but store relations failed'
        }, { status: 201 });
      }
    }

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - ユーザー更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, phone, email, role, skill_level, memo, stores } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // バリデーション（POSTと同様）
    if (name && (name.trim().length < 2 || name.trim().length > 50)) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 50 characters' },
        { status: 400 }
      );
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    if (phone) {
      const phoneRegex = /^[\d\-\+\(\)\s]+$/;
      if (!phoneRegex.test(phone)) {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400 }
        );
      }
    }

    if (role && !['manager', 'staff'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be either "manager" or "staff"' },
        { status: 400 }
      );
    }

    if (skill_level && !['training', 'regular', 'veteran'].includes(skill_level)) {
      return NextResponse.json(
        { error: 'Skill level must be "training", "regular", or "veteran"' },
        { status: 400 }
      );
    }

    // ユーザー情報更新
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name) updateData.name = name.trim();
    if (phone) updateData.phone = phone.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (role) updateData.role = role;
    if (skill_level) updateData.skill_level = skill_level;
    if (memo !== undefined) updateData.memo = memo ? memo.trim() : null;

    const { data: user, error: userError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (userError) {
      console.error('Error updating user:', userError);
      if (userError.code === '23505' && userError.message.includes('email')) {
        return NextResponse.json({ error: 'This email address is already registered' }, { status: 409 });
      }
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // 店舗関連を更新（既存削除 → 新規追加）
    if (stores && Array.isArray(stores)) {
      try {
        // 既存の関連を削除
        const { error: deleteError } = await supabase
          .from('user_stores')
          .delete()
          .eq('user_id', id);

        if (deleteError) {
          console.error('Error deleting user-store relations:', deleteError);
          // 削除エラーは警告として扱う（主要処理は成功）
        }

        // 新しい関連を追加
        if (stores.length > 0) {
          const userStoreRelations = stores.map((storeId: string) => ({
            user_id: id,
            store_id: storeId,
            is_flexible: false
          }));

          const { error: relationError } = await supabase
            .from('user_stores')
            .insert(userStoreRelations);

          if (relationError) {
            console.error('Error creating user-store relations:', relationError);
            // 関連作成エラーも警告として扱う
          }
        }
      } catch (relationError) {
        console.error('Error updating store relations:', relationError);
        // 店舗関連の更新失敗は警告として扱い、ユーザー更新は成功として返す
      }
    }

    return NextResponse.json({ data: user }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - ユーザー削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 