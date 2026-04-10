import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  HeadingLevel, BorderStyle, TabStopPosition, TabStopType,
} from 'docx';
import type { Agreement, PenaltyRate } from '@/types';

const PRODUCER_COMPANY = '(주) 그리고 엔터테인먼트';
const PRODUCER_ADDRESS = '서울특별시 마포구 성지3길 55, 3층';
const PRODUCER_REPRESENTATIVE = '김현준';

function numberToKorean(n: number): string {
  if (n === 0) return '영';
  const units = ['', '만', '억', '조'];
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const subUnits = ['', '십', '백', '천'];

  let result = '';
  let unitIndex = 0;
  let remaining = Math.floor(n);

  while (remaining > 0) {
    const chunk = remaining % 10000;
    if (chunk > 0) {
      let chunkStr = '';
      let c = chunk;
      for (let i = 0; i < 4 && c > 0; i++) {
        const d = c % 10;
        if (d > 0) {
          const digitStr = (d === 1 && i > 0) ? '' : digits[d];
          chunkStr = digitStr + subUnits[i] + chunkStr;
        }
        c = Math.floor(c / 10);
      }
      result = chunkStr + units[unitIndex] + result;
    }
    remaining = Math.floor(remaining / 10000);
    unitIndex++;
  }
  return result;
}

function formatAmount(amount: number): string {
  return `금 ${numberToKorean(amount)} 원 (₩${amount.toLocaleString('ko-KR')})`;
}

function formatAmountWithVat(amount: number, vatType: string): string {
  const vatLabel = vatType === 'exclusive' ? 'VAT 별도' : 'VAT 포함';
  return `금 ${numberToKorean(amount)} 원 (₩${amount.toLocaleString('ko-KR')} / ${vatLabel})`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '[    ]년 [  ]월 [  ]일';
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function bold(text: string, size = 22): TextRun {
  return new TextRun({ text, bold: true, size, font: 'Malgun Gothic' });
}

function normal(text: string, size = 22): TextRun {
  return new TextRun({ text, size, font: 'Malgun Gothic' });
}

function emptyLine(): Paragraph {
  return new Paragraph({ children: [normal('')] });
}

function articleTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 100 },
    children: [bold(text, 22)],
  });
}

function numberedItem(num: number, runs: TextRun[]): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [normal(`${num}. `), ...runs],
    indent: { left: 200 },
  });
}

function bulletItem(runs: TextRun[]): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [normal('   - '), ...runs],
    indent: { left: 400 },
  });
}

export async function generateContractDocx(agreement: Agreement): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children: [
        // Title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [bold('영 상 제 작 계 약 서', 32)],
        }),

        emptyLine(),

        // Preamble
        new Paragraph({
          spacing: { after: 200 },
          children: [
            bold(agreement.client_company),
            normal('(이하 "발주자")와 '),
            bold(PRODUCER_COMPANY),
            normal('(이하 "제작사")는 본 영상 제작 프로젝트를 수행함에 있어 상호 신뢰를 바탕으로 다음과 같이 계약을 체결한다.'),
          ],
        }),

        // 제1조
        articleTitle('제1조 (목적 및 업무 범위)'),
        numberedItem(1, [
          normal('본 계약은 "발주자"가 의뢰한 영상 콘텐츠 제작을 위하여 "제작사"가 제공하는 용역의 범위와 절차, 권리 의무 관계를 규정함에 목적이 있다.'),
        ]),
        numberedItem(2, [
          bold('과업 내용'),
          normal(`: ${agreement.task_description || '[ ]'}`),
        ]),
        numberedItem(3, [
          bold('최종 결과물'),
          normal(`: ${agreement.deliverables}`),
        ]),

        // 제2조
        articleTitle('제2조 (제작 일정)'),
        new Paragraph({
          spacing: { after: 100 },
          children: [normal('본 프로젝트의 주요 일정은 다음과 같으며, 원활한 진행을 위해 상호 협의 하에 조정할 수 있다.')],
          indent: { left: 200 },
        }),
        numberedItem(1, [bold('촬영 예정일'), normal(`: ${formatDate(agreement.shooting_date)}`)]),
        numberedItem(2, [bold('납품 예정일'), normal(`: ${formatDate(agreement.delivery_date)}`)]),
        numberedItem(3, [bold('릴리즈 예정일'), normal(`: ${formatDate(agreement.release_date)}`)]),

        // 제3조
        articleTitle('제3조 (계약 금액 및 지급 조건)'),
        numberedItem(1, [
          bold('총 계약 금액'),
          normal(`: `),
          bold(formatAmountWithVat(agreement.total_amount, agreement.vat_type)),
        ]),
        numberedItem(2, [bold('지급 시기 및 방법'), normal(':')]),
        bulletItem([
          bold(`선금 (${agreement.deposit_rate}%)`),
          normal(`: ${formatAmount(agreement.deposit_amount)} - ${agreement.deposit_condition}`),
        ]),
        bulletItem([
          bold(`잔금 (${agreement.balance_rate}%)`),
          normal(`: ${formatAmount(agreement.balance_amount)} - `),
          bold(agreement.balance_condition),
        ]),

        // 제4조
        articleTitle('제4조 (제작 운영의 효율성)'),
        numberedItem(1, [
          normal('"제작사"는 사전에 협의된 영상의 완성도를 보장하는 범위 내에서, 현장 투입 인력의 규모 및 장비 구성을 전문적 판단에 따라 효율적으로 운영할 수 있다.'),
        ]),
        numberedItem(2, [
          normal('전항에 따른 제작 자원의 유동적 운용은 사전 협의된 품질을 충족하는 한, 본 계약 금액의 증감 사유가 되지 아니한다.'),
        ]),

        // 제5조
        articleTitle('제5조 (검수 및 수정)'),
        numberedItem(1, [
          normal(`"제작사"는 편집본 납품 후 "발주자"의 의견을 반영하여 `),
          bold(`총 ${agreement.free_revision_count}회의 무상 수정`),
          normal('을 진행한다.'),
        ]),
        new Paragraph({
          spacing: { after: 60 },
          children: [normal('단, 수정의 범위는 자막, 컷 길이 조정 등 통상적인 편집 보완 작업에 한한다.')],
          indent: { left: 400 },
        }),
        numberedItem(2, [
          normal('기획안의 전면적인 변경이나 무상 수정 횟수를 초과하는 요청에 대해서는 양사가 별도로 협의하여 추가 비용을 산정할 수 있다.'),
        ]),

        // 제6조
        articleTitle('제6조 (재촬영 및 일정 변경)'),
        numberedItem(1, [
          normal('"제작사"의 귀책 사유가 없는 상태에서 "발주자"의 요청에 의해 재촬영을 진행할 경우, 이에 소요되는 추가 인건비 및 제작 실비는 양사가 합리적으로 협의하여 별도 정산한다.'),
        ]),

        // 제7조
        articleTitle('제7조 (계약의 해지 및 위약금)'),
        new Paragraph({
          spacing: { after: 100 },
          children: [normal('본 계약 체결 후 "발주자"의 사정으로 인하여 계약이 해지될 경우, "제작사"의 기투입 자원 및 기회비용을 고려하여 다음과 같이 손해배상금을 산정한다.')],
          indent: { left: 200 },
        }),
        ...agreement.penalty_rates.map((p: PenaltyRate, i: number) =>
          numberedItem(i + 1, [
            bold(p.label),
            normal(`: 총 계약 금액의 `),
            bold(`${p.rate}%`),
          ])
        ),

        // 제8조
        articleTitle('제8조 (저작권 및 포트폴리오 활용)'),
        numberedItem(1, [
          normal('본 계약에 의해 제작된 최종 결과물의 저작권은 "발주자"에게 귀속된다.'),
        ]),
        numberedItem(2, [
          normal('"제작사"는 본 프로젝트의 제작사로서 참여한 사실을 대외적으로 고지할 수 있으며, 해당 결과물을 "제작사"의 포트폴리오 용도로 활용할 수 있다.'),
        ]),

        // 제9조
        articleTitle('제9조 (비밀 유지)'),
        new Paragraph({
          spacing: { after: 200 },
          children: [normal('양사는 본 계약 이행 과정에서 취득한 상대방의 업무상 비밀 및 아티스트 관련 정보를 상대방의 서면 동의 없이 제3자에게 공개하거나 누설하지 아니한다.')],
          indent: { left: 200 },
        }),

        emptyLine(),

        // 날짜
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 400 },
          children: [bold(formatDate(agreement.contract_date))],
        }),

        emptyLine(),

        // 발주자 서명란
        new Paragraph({
          spacing: { after: 80 },
          children: [bold('[발주자]  '), bold(agreement.client_company)],
        }),
        new Paragraph({
          spacing: { after: 80 },
          children: [normal(`주소: ${agreement.client_address || ''}`)],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [normal(`대표이사: ${agreement.client_representative || ''} (인)`)],
        }),

        emptyLine(),

        // 제작사 서명란
        new Paragraph({
          spacing: { after: 80 },
          children: [bold('[제작사]  '), bold(PRODUCER_COMPANY)],
        }),
        new Paragraph({
          spacing: { after: 80 },
          children: [normal(`주소: ${PRODUCER_ADDRESS}`)],
        }),
        new Paragraph({
          spacing: { after: 0 },
          children: [normal(`대표이사: `), bold(PRODUCER_REPRESENTATIVE), normal(' (인)')],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
