import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getR2Client } from '@/lib/r2/client';
import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

export async function POST(request: Request) {
  try {
    // 0. CSRF protection — verify request origin
    const origin = request.headers.get('origin') || '';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    if (!origin || !siteUrl || !origin.startsWith(siteUrl.replace(/\/$/, ''))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Verify user via anon client (cookie-based auth)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const admin = createAdminClient();

    // 2. Get all user's projects
    const { data: projects } = await admin
      .from('projects')
      .select('id')
      .eq('user_id', userId);

    // 3. Delete all R2 files under userId/ prefix
    try {
      const r2 = getR2Client();
      const bucket = process.env.R2_BUCKET_NAME!;
      let continuationToken: string | undefined;

      do {
        const listResult = await r2.send(new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: `${userId}/`,
          ContinuationToken: continuationToken,
        }));

        if (listResult.Contents && listResult.Contents.length > 0) {
          await r2.send(new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
              Objects: listResult.Contents.map(obj => ({ Key: obj.Key! })),
              Quiet: true,
            },
          }));
        }

        continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
      } while (continuationToken);
    } catch {
      // R2 deletion failure shouldn't block account deletion
    }

    // 4. Delete saved_projects where project belongs to user (others' saves of user's pages)
    if (projects && projects.length > 0) {
      const projectIds = projects.map(p => p.id);
      await admin
        .from('saved_projects')
        .delete()
        .in('project_id', projectIds);
    }

    // 5. Delete saved_projects by user (user's own saves)
    await admin
      .from('saved_projects')
      .delete()
      .eq('user_id', userId);

    // 6. Delete projects
    await admin
      .from('projects')
      .delete()
      .eq('user_id', userId);

    // 7. Delete purchases
    await admin
      .from('purchases')
      .delete()
      .eq('user_id', userId);

    // 8. Delete coin_transactions
    await admin
      .from('coin_transactions')
      .delete()
      .eq('user_id', userId);

    // 9. Delete saved_templates
    await admin
      .from('saved_templates')
      .delete()
      .eq('user_id', userId);

    // 10. Delete profile
    await admin
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    // 11. Delete auth user
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      return NextResponse.json(
        { error: 'Kullanıcı hesabı silinemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Hesap silme hatası' },
      { status: 500 }
    );
  }
}
