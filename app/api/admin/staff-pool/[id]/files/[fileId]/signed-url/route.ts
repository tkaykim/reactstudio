import { NextRequest, NextResponse } from 'next/server';
import { apiRequireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { STAFF_FILES_BUCKET } from '@/lib/staff-pool';

type StaffFileForDownload = {
  id: number;
  application_id: number;
  bucket: string | null;
  object_path: string;
  file_name: string;
};

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string; fileId: string }> }
) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { id: idParam, fileId: fileIdParam } = await context.params;
  const id = Number(idParam);
  const fileId = Number(fileIdParam);
  if (!Number.isFinite(id) || !Number.isFinite(fileId)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: fileData, error } = await supabase
    .from('react_staff_files')
    .select('id,application_id,bucket,object_path,file_name,react_staff_applications!inner(bu_code)')
    .eq('id', fileId)
    .eq('application_id', id)
    .eq('react_staff_applications.bu_code', ADMIN_BU)
    .single();

  if (error || !fileData) {
    return NextResponse.json({ error: error?.message ?? '파일을 찾을 수 없습니다.' }, { status: 404 });
  }

  const file = fileData as StaffFileForDownload;
  const { data, error: signedError } = await supabase.storage
    .from(file.bucket || STAFF_FILES_BUCKET)
    .createSignedUrl(file.object_path, 60 * 5, {
      download: file.file_name,
    });

  if (signedError || !data?.signedUrl) {
    return NextResponse.json({ error: signedError?.message ?? '파일 URL 생성에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
