import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';

// GET: Return the authenticated user's own copyright claims
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    const { data: claims } = await admin
      .from('copyright_claims')
      .select('*, post:posts!copyright_claims_post_id_fkey(id, title, slug), matched_post:posts!copyright_claims_matched_post_id_fkey(id, title, slug)')
      .eq('claimant_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({ claims: claims || [] });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST: Submit a copyright verification form for a pending claim
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    const body = await request.json();
    const { post_id, owner_name, owner_email, company_name, proof_description, proof_urls } = body;

    // Validate required fields
    if (!post_id || !owner_name || !owner_email || !proof_description) {
      return NextResponse.json({ error: 'Eksik bilgi: post_id, owner_name, owner_email ve proof_description gerekli' }, { status: 400 });
    }

    // Validate proof_urls max 5
    if (proof_urls && Array.isArray(proof_urls) && proof_urls.length > 5) {
      return NextResponse.json({ error: 'En fazla 5 kanıt URL\'i gönderilebilir' }, { status: 400 });
    }

    // Verify the post belongs to the user
    const { data: post } = await admin
      .from('posts')
      .select('id, author_id')
      .eq('id', Number(post_id))
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Gönderi bulunamadı' }, { status: 404 });
    }

    if (post.author_id !== user.id) {
      return NextResponse.json({ error: 'Bu gönderi size ait değil' }, { status: 403 });
    }

    // Check there's an existing pending copyright_claim for this post
    const { data: existingClaim } = await admin
      .from('copyright_claims')
      .select('id, status')
      .eq('post_id', Number(post_id))
      .eq('claimant_id', user.id)
      .eq('status', 'pending')
      .single();

    if (!existingClaim) {
      return NextResponse.json({ error: 'Bu gönderi için bekleyen bir telif hakkı talebi bulunamadı' }, { status: 404 });
    }

    // Update the copyright_claim with verification details
    const sanitizedProofUrls = Array.isArray(proof_urls)
      ? proof_urls.filter((u: unknown) => typeof u === 'string' && (u as string).trim()).slice(0, 5)
      : [];

    const { error: updateError } = await admin
      .from('copyright_claims')
      .update({
        owner_name: String(owner_name).trim().slice(0, 200),
        owner_email: String(owner_email).trim().slice(0, 200),
        company_name: company_name ? String(company_name).trim().slice(0, 200) : null,
        proof_description: String(proof_description).trim().slice(0, 2000),
        proof_urls: sanitizedProofUrls,
        status: 'pending',
      })
      .eq('id', existingClaim.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Send notification to the user confirming submission
    await createNotification({
      admin,
      user_id: user.id,
      actor_id: user.id,
      type: 'copyright_claim_submitted',
      object_type: 'post',
      object_id: Number(post_id),
      content: 'Telif hakkı doğrulama formunuz başarıyla gönderildi. İnceleme sonucu size bildirilecektir.',
    });

    return NextResponse.json({ success: true, message: 'Telif hakkı doğrulama formu gönderildi' });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
