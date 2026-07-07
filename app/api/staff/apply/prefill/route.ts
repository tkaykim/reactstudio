import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import type { StaffApplicantType, StaffCapability } from '@/lib/staff-pool';
import { CURRENT_BU_CODE } from '@/types';

type CandidateSnapshot = {
  from_name?: unknown;
  from_email?: unknown;
  subject?: unknown;
  body_excerpt?: unknown;
  draft_summary?: unknown;
  summary_struct?: {
    situation?: unknown;
    context?: unknown;
    reply_intent?: unknown;
  } | null;
};

function clean(value: unknown, max = 1600) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}

function compactName(value: string) {
  return value
    .replace(/["<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function urlsFrom(text: string) {
  const matches = text.match(/(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi) ?? [];
  return Array.from(
    new Set(
      matches
        .map((url) => url.replace(/[.,;:!?]+$/g, ''))
        .map((url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`))
    )
  ).slice(0, 12);
}

function linesMatching(text: string, pattern: RegExp) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && pattern.test(line))
    .slice(0, 8)
    .join('\n');
}

function inferApplicantType(text: string): StaffApplicantType {
  if (/제작사|프로덕션|스튜디오|회사|법인|사업자|대표|업체/i.test(text)) return 'company';
  if (/팀|크루|crew|단체/i.test(text)) return 'team';
  return 'individual';
}

function inferCapabilities(text: string): StaffCapability[] {
  const capabilities: StaffCapability[] = [];
  if (/기획|구성안|콘티|프리프로덕션|디렉팅/i.test(text)) capabilities.push('planning');
  if (/촬영|촬감|\bdp\b|fx3|a7s3|카메라|짐벌|지미집|드론|멀티캠|조명|감독/i.test(text)) capabilities.push('shooting');
  if (/편집|프리미어|premiere|다빈치|davinci|컷편집|자막|색보정/i.test(text)) capabilities.push('editing');
  if (/mogrt|템플릿|모션그래픽|after effects|애프터|ae\b/i.test(text)) capabilities.push('template_motion');
  if (/cg|vfx|3d|합성|블렌더|blender|cinema 4d/i.test(text)) capabilities.push('custom_cg');
  if (/ai|생성형|runway|kling|higgsfield|comfyui|midjourney|chatgpt/i.test(text)) capabilities.push('generative_ai');
  return Array.from(new Set(capabilities));
}

function inferTools(text: string) {
  const candidates = [
    'Premiere Pro',
    'After Effects',
    'DaVinci Resolve',
    'Final Cut Pro',
    'Photoshop',
    'Illustrator',
    'Blender',
    'Cinema 4D',
    'Runway',
    'Kling',
    'Higgsfield',
    'ComfyUI',
    'Midjourney',
    'ChatGPT',
  ];
  return candidates.filter((tool) => new RegExp(tool.replace(/\s+/g, '\\s*'), 'i').test(text)).join('\n');
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim();
  if (!token || token.length < 12) {
    return NextResponse.json({ error: '유효하지 않은 링크입니다.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('react_staff_availability_polls')
    .select('token,application_id,invitee_name,invitee_email,invitee_phone,source_subject,candidate_snapshot')
    .eq('token', token)
    .eq('bu_code', CURRENT_BU_CODE)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: '유효하지 않은 링크입니다.' }, { status: 404 });

  const snapshot = (data.candidate_snapshot ?? {}) as CandidateSnapshot;
  const body = clean(snapshot.body_excerpt, 2200);
  const draftSummary = clean(snapshot.draft_summary, 800);
  const context = clean(snapshot.summary_struct?.context, 800);
  const subject = clean(data.source_subject || snapshot.subject, 200);
  const fullText = [subject, body, draftSummary, context].filter(Boolean).join('\n');
  const email = clean(data.invitee_email || snapshot.from_email, 160);
  const nameFromEmail = email ? email.split('@')[0].replace(/[._-]+/g, ' ') : '';
  const displayName = compactName(clean(data.invitee_name || snapshot.from_name, 120) || nameFromEmail);
  const portfolioUrls = urlsFrom(fullText);
  const equipmentLines = linesMatching(
    fullText,
    /장비|카메라|렌즈|조명|짐벌|드론|마이크|오디오|녹음|sony|canon|blackmagic|fx3|a7|ronin|dji/i
  );
  const summary = [draftSummary, body].filter(Boolean).join('\n\n').slice(0, 1800);

  return NextResponse.json({
    prefill: {
      already_registered: Boolean(data.application_id),
      source_subject: subject,
      application: {
        applicant_type: inferApplicantType(fullText),
        display_name: displayName,
        email,
        phone: clean(data.invitee_phone, 80),
        portfolio_urls: portfolioUrls.join('\n'),
        social_links: portfolioUrls.filter((url) => /instagram|youtu|vimeo|notion|linktr/i.test(url)).join('\n'),
        summary,
        equipment_detail: equipmentLines,
        tools: inferTools(fullText),
        preferred_project_types: /댄스|dance/i.test(fullText) ? '댄스 영상\n공연 영상' : '',
      },
      capabilities: inferCapabilities(fullText),
    },
  });
}
