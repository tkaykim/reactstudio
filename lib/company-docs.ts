import { createSupabaseAdminClient } from '@/lib/supabase';

export type CompanyDocKind = 'business_registration' | 'bank_account';

export interface CompanyDocAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export async function loadCompanyDocAttachments(
  kinds: CompanyDocKind[] | undefined | null
): Promise<CompanyDocAttachment[]> {
  if (!kinds?.length) return [];
  const supabase = createSupabaseAdminClient();

  const { data: docs } = await supabase
    .from('company_documents')
    .select('*')
    .in('kind', kinds);

  if (!docs?.length) return [];

  const result: CompanyDocAttachment[] = [];
  for (const doc of docs) {
    const { data: blob } = await supabase.storage
      .from('company-docs')
      .download(doc.storage_path);
    if (!blob) continue;
    result.push({
      filename: doc.filename,
      content: Buffer.from(await blob.arrayBuffer()),
      contentType: doc.mime_type || 'application/octet-stream',
    });
  }
  return result;
}
