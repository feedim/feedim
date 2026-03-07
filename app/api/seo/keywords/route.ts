import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateMetaKeywordsAI } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';

export async function POST(request: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const { title, content, tags } = await request.json();
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: tErrors("titleRequired") }, { status: 400 });
    }

    const keyword = await generateMetaKeywordsAI(
      title.trim(),
      content || '',
      { tags: Array.isArray(tags) ? tags : [] }
    );

    return NextResponse.json({ keyword });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
