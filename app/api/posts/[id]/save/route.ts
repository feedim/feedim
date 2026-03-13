import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeError } from '@/lib/apiError';
import { checkEmailVerified } from '@/lib/emailGate';
import { getTranslations } from 'next-intl/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const { id } = await params;
    const postId = Number(id);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const admin = createAdminClient();

    // Private account access check
    const { data: postAccess } = await admin
      .from('posts')
      .select('author_id, profiles!posts_author_id_fkey(account_private)')
      .eq('id', postId).single();
    if (postAccess) {
      const _a = Array.isArray(postAccess.profiles) ? postAccess.profiles[0] : postAccess.profiles;
      if ((_a as any)?.account_private && postAccess.author_id !== user.id) {
        const { data: _f } = await admin.from('follows').select('id')
          .eq('follower_id', user.id).eq('following_id', postAccess.author_id).maybeSingle();
        if (!_f) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 403 });
      }
    }

    // Email verification check
    const emailCheck = await checkEmailVerified(admin, user.id, 'save');
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: 403 });
    }

    // Check if already saved
    const { data: existing } = await admin
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single();

    if (existing) {
      // Unsave
      await admin.from('bookmarks').delete().eq('id', existing.id);
      const { count } = await admin.from('bookmarks').select('id', { count: 'exact', head: true }).eq('post_id', postId);
      return NextResponse.json({ saved: false, save_count: count || 0 });
    }

    // Save
    const { error } = await admin
      .from('bookmarks')
      .insert({ user_id: user.id, post_id: postId });

    if (error) {
      return safeError(error);
    }

    const { count } = await admin.from('bookmarks').select('id', { count: 'exact', head: true }).eq('post_id', postId);
    return NextResponse.json({ saved: true, save_count: count || 0 });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
