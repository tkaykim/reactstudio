import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import {
  STAFF_APPLICANT_TYPES,
  STAFF_CAPABILITY_OPTIONS,
  STAFF_FILES_BUCKET,
  type StaffApplicationPayload,
  type StaffCapabilityInput,
  type StaffRateCardInput,
  type StaffSkillEntryInput,
} from '@/lib/staff-pool';
import { CURRENT_BU_CODE } from '@/types';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 8;

function parseJson<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function asCleanArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function nullableDate(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text : null;
}

function nullableText(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text : null;
}

function numericOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeFileName(name: string) {
  const cleaned = name
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|#%{}[\]^~`]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'file';
}

function fileEntries(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((item): item is File => item instanceof File && item.size > 0);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const application = parseJson<StaffApplicationPayload | null>(
      formData.get('application'),
      null
    );
    const capabilities = parseJson<StaffCapabilityInput[]>(
      formData.get('capabilities'),
      []
    );
    const skillEntries = parseJson<StaffSkillEntryInput[]>(
      formData.get('skill_entries'),
      []
    );
    const rateCards = parseJson<StaffRateCardInput[]>(
      formData.get('rate_cards'),
      []
    );

    if (!application) {
      return NextResponse.json({ error: '지원서 정보가 비어 있습니다.' }, { status: 400 });
    }

    const allowedTypes = STAFF_APPLICANT_TYPES.map((item) => item.value);
    if (!allowedTypes.includes(application.applicant_type)) {
      return NextResponse.json({ error: '지원 유형을 다시 선택해 주세요.' }, { status: 400 });
    }

    const displayName = application.display_name?.trim();
    const email = application.email?.trim();
    const phone = application.phone?.trim();
    if (!displayName || !email || !phone) {
      return NextResponse.json({ error: '이름 또는 회사명, 이메일, 연락처는 필수입니다.' }, { status: 400 });
    }

    const uploads = [
      ...fileEntries(formData, 'business_license').map((file) => ({
        file,
        document_type: 'business_license',
      })),
      ...fileEntries(formData, 'portfolio_files').map((file) => ({
        file,
        document_type: 'portfolio',
      })),
    ];

    if (uploads.length > MAX_FILES) {
      return NextResponse.json({ error: `첨부파일은 최대 ${MAX_FILES}개까지 가능합니다.` }, { status: 400 });
    }

    const tooLarge = uploads.find((item) => item.file.size > MAX_FILE_BYTES);
    if (tooLarge) {
      return NextResponse.json({ error: `${tooLarge.file.name} 파일이 10MB를 초과합니다.` }, { status: 400 });
    }

    const capabilityTags = Array.from(
      new Set([
        ...asCleanArray(capabilities.map((item) => item.category)),
        ...asCleanArray(skillEntries.map((item) => item.group)),
        ...asCleanArray(skillEntries.map((item) => item.skill_name)),
      ])
    );

    const supabase = createSupabaseAdminClient();
    const { data: created, error: appError } = await supabase
      .from('react_staff_applications')
      .insert({
        bu_code: CURRENT_BU_CODE,
        applicant_type: application.applicant_type,
        display_name: displayName,
        legal_name: nullableText(application.legal_name),
        company_name: nullableText(application.company_name),
        representative_name: nullableText(application.representative_name),
        contact_name: nullableText(application.contact_name),
        phone,
        email,
        birth_date: nullableDate(application.birth_date),
        business_registration_number: nullableText(application.business_registration_number),
        opened_on: nullableDate(application.opened_on),
        region: nullableText(application.region),
        website_url: nullableText(application.website_url),
        social_links: asCleanArray(application.social_links),
        portfolio_urls: asCleanArray(application.portfolio_urls),
        summary: nullableText(application.summary),
        availability: nullableText(application.availability),
        preferred_project_types: asCleanArray(application.preferred_project_types),
        equipment: asCleanArray(application.equipment),
        equipment_detail: nullableText(application.equipment_detail),
        tools: asCleanArray(application.tools),
        ai_tools: asCleanArray(application.ai_tools),
        capability_tags: capabilityTags,
        raw_payload: {
          application,
          capabilities,
          skill_entries: skillEntries,
          rate_cards: rateCards,
        },
        status: 'new',
      })
      .select('id')
      .single();

    if (appError || !created) {
      console.error('[staff/apply] application insert failed', appError);
      return NextResponse.json({ error: '지원서 저장에 실패했습니다.' }, { status: 500 });
    }

    const applicationId = created.id as number;

    const capabilityRows = capabilities
      .filter((item) => STAFF_CAPABILITY_OPTIONS.some((opt) => opt.value === item.category))
      .map((item) => ({
        application_id: applicationId,
        category: item.category,
        proficiency: item.proficiency || null,
        role_detail: nullableText(item.role_detail),
        portfolio_urls: asCleanArray(item.portfolio_urls),
        tools: asCleanArray(item.tools),
        equipment: asCleanArray(item.equipment),
        notes: nullableText(item.notes),
      }));

    if (capabilityRows.length) {
      const { error } = await supabase.from('react_staff_capabilities').insert(capabilityRows);
      if (error) console.error('[staff/apply] capability insert failed', error);
    }

    const skillRows = skillEntries
      .filter((item) => item.group && item.skill_name)
      .map((item) => ({
        application_id: applicationId,
        skill_group: item.group,
        skill_name: item.skill_name.trim(),
        experience_level: item.experience_level || null,
        years_experience: numericOrNull(item.years_experience),
        role_detail: nullableText(item.role_detail),
        representative_work_url: nullableText(item.representative_work_url),
        tools: asCleanArray(item.tools),
        equipment: asCleanArray(item.equipment),
        notes: nullableText(item.notes),
      }));

    if (skillRows.length) {
      const { error } = await supabase.from('react_staff_skill_entries').insert(skillRows);
      if (error) console.error('[staff/apply] skill insert failed', error);
    }

    const rateRows = rateCards
      .filter((item) => item.skill_group)
      .map((item) => ({
        application_id: applicationId,
        skill_group: item.skill_group,
        skill_name: nullableText(item.skill_name),
        rate_unit: item.rate_unit || 'per_day',
        currency: 'KRW',
        min_amount: numericOrNull(item.min_amount),
        max_amount: numericOrNull(item.max_amount),
        is_negotiable: item.is_negotiable !== false,
        includes_equipment: item.includes_equipment === true,
        notes: nullableText(item.notes),
      }));

    if (rateRows.length) {
      const { error } = await supabase.from('react_staff_rate_cards').insert(rateRows);
      if (error) console.error('[staff/apply] rate insert failed', error);
    }

    for (const upload of uploads) {
      const fileName = safeFileName(upload.file.name);
      const objectPath = `${applicationId}/${upload.document_type}/${randomUUID()}-${fileName}`;
      const buffer = Buffer.from(await upload.file.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from(STAFF_FILES_BUCKET)
        .upload(objectPath, buffer, {
          contentType: upload.file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        console.error('[staff/apply] file upload failed', uploadError);
        continue;
      }

      const { error: fileError } = await supabase.from('react_staff_files').insert({
        application_id: applicationId,
        document_type: upload.document_type,
        bucket: STAFF_FILES_BUCKET,
        object_path: objectPath,
        file_name: fileName,
        mime_type: upload.file.type || null,
        size_bytes: upload.file.size,
      });

      if (fileError) console.error('[staff/apply] file row insert failed', fileError);
    }

    return NextResponse.json({ success: true, id: applicationId });
  } catch (error) {
    console.error('[staff/apply] unexpected error', error);
    return NextResponse.json({ error: '지원서 제출 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
