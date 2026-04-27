import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { getAdminUser } from '@/lib/admin-auth';

const KINDS = ['business_registration', 'bank_account'];

export async function GET(req: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const kind = req.nextUrl.searchParams.get('kind');
  if (!kind || !KINDS.includes(kind)) {
    return NextResponse.json({ error: 'invalid kind' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: doc, error } = await supabase
    .from('company_documents')
    .select('*')
    .eq('kind', kind)
    .maybeSingle();

  if (error || !doc) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: blob, error: dlErr } = await supabase.storage
    .from('company-docs')
    .download(doc.storage_path);

  if (dlErr || !blob) return NextResponse.json({ error: dlErr?.message ?? 'download failed' }, { status: 500 });

  const buf = Buffer.from(await blob.arrayBuffer());
  const encoded = encodeURIComponent(doc.filename);

  return new NextResponse(buf, {
    headers: {
      'Content-Type': doc.mime_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
      'Content-Length': String(buf.length),
    },
  });
}
