import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { getAdminUser } from '@/lib/admin-auth';

const BUCKET = 'company-docs';
const KINDS = ['business_registration', 'bank_account'] as const;
type Kind = (typeof KINDS)[number];

function isKind(v: unknown): v is Kind {
  return typeof v === 'string' && (KINDS as readonly string[]).includes(v);
}

function extractExt(filename: string, mime: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot >= 0 && dot < filename.length - 1) {
    const ext = filename.slice(dot + 1).toLowerCase();
    if (/^[a-z0-9]{1,8}$/.test(ext)) return ext;
  }
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'bin';
}

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('company_documents')
    .select('*')
    .order('kind');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ docs: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData();
  const kind = form.get('kind');
  const file = form.get('file');

  if (!isKind(kind)) return NextResponse.json({ error: 'invalid kind' }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 });

  const supabase = createSupabaseAdminClient();

  const { data: existing } = await supabase
    .from('company_documents')
    .select('storage_path')
    .eq('kind', kind)
    .maybeSingle();

  const ext = extractExt(file.name, file.type);
  const storagePath = `${kind}/${crypto.randomUUID()}.${ext}`;
  const arrayBuf = await file.arrayBuffer();

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuf, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const row = {
    kind,
    filename: file.name,
    storage_path: storagePath,
    public_url: urlData.publicUrl,
    mime_type: file.type || 'application/octet-stream',
    size: file.size,
    uploaded_at: new Date().toISOString(),
  };

  const { data: saved, error: saveErr } = await supabase
    .from('company_documents')
    .upsert(row, { onConflict: 'kind' })
    .select()
    .single();

  if (saveErr) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: saveErr.message }, { status: 500 });
  }

  if (existing?.storage_path && existing.storage_path !== storagePath) {
    await supabase.storage.from(BUCKET).remove([existing.storage_path]);
  }

  return NextResponse.json({ doc: saved });
}

export async function DELETE(req: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const kind = req.nextUrl.searchParams.get('kind');
  if (!isKind(kind)) return NextResponse.json({ error: 'invalid kind' }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data: existing } = await supabase
    .from('company_documents')
    .select('storage_path')
    .eq('kind', kind)
    .maybeSingle();

  if (existing?.storage_path) {
    await supabase.storage.from(BUCKET).remove([existing.storage_path]);
  }

  await supabase.from('company_documents').delete().eq('kind', kind);
  return NextResponse.json({ success: true });
}
