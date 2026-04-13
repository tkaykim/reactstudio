import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import '@/lib/pdf-fonts';
import type { Contract, QuoteItem } from '@/types';
import { CONTRACT_TYPES } from '@/types';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'NanumGothic',
    backgroundColor: '#ffffff',
    fontSize: 10,
    color: '#111111',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#FF4D00',
  },
  brandName: { fontSize: 22, fontWeight: 700, color: '#FF4D00' },
  brandSub: { fontSize: 9, color: '#666666', marginTop: 3 },
  docTitle: { fontSize: 14, fontWeight: 700, textAlign: 'right' },
  docNumber: { fontSize: 9, color: '#666666', textAlign: 'right', marginTop: 3 },
  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  infoBox: { flex: 1, padding: 10, backgroundColor: '#f8f8f8', borderRadius: 4 },
  infoLabel: { fontSize: 8, color: '#888888', marginBottom: 4 },
  infoValue: { fontSize: 11, fontWeight: 700 },
  infoSub: { fontSize: 9, color: '#666666', marginTop: 2 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#111111', padding: '8 10' },
  tableHeaderText: { color: '#ffffff', fontSize: 9, fontWeight: 700 },
  tableRow: { flexDirection: 'row', padding: '8 10', borderBottomWidth: 1, borderBottomColor: '#eeeeee' },
  tableRowAlt: { backgroundColor: '#fafafa' },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'center' },
  col3: { flex: 1.5, textAlign: 'right' },
  col4: { flex: 1.5, textAlign: 'right' },
  totalSection: { marginTop: 16, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', width: 250, justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: 9, color: '#666666' },
  totalValue: { fontSize: 9 },
  totalFinalRow: {
    flexDirection: 'row', width: 250, justifyContent: 'space-between',
    paddingVertical: 8, borderTopWidth: 2, borderTopColor: '#FF4D00', marginTop: 4,
  },
  totalFinalLabel: { fontSize: 12, fontWeight: 700 },
  totalFinalValue: { fontSize: 12, fontWeight: 700, color: '#FF4D00' },
  depositSection: { marginTop: 12, alignItems: 'flex-end' },
  depositRow: { flexDirection: 'row', width: 250, justifyContent: 'space-between', paddingVertical: 3 },
  depositLabel: { fontSize: 9, color: '#444444' },
  depositValue: { fontSize: 9, fontWeight: 700 },
  terms: {
    marginTop: 24, padding: 12, backgroundColor: '#fff8f5',
    borderLeftWidth: 3, borderLeftColor: '#FF4D00',
  },
  termsLabel: { fontSize: 8, color: '#FF4D00', fontWeight: 700, marginBottom: 4 },
  termsText: { fontSize: 9, color: '#444444', lineHeight: 1.6 },
  footer: {
    position: 'absolute', bottom: 30, left: 50, right: 50,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#eeeeee', paddingTop: 10,
  },
  footerText: { fontSize: 8, color: '#aaaaaa' },
});

function formatKRW(amount: number | null | undefined): string {
  return (amount ?? 0).toLocaleString('ko-KR') + '원';
}

interface ContractDocumentProps {
  contract: Contract;
}

export function buildContractDocument(props: ContractDocumentProps) {
  return ContractDocument(props);
}

export default function ContractDocument({ contract }: ContractDocumentProps) {
  const today = new Date().toLocaleDateString('ko-KR');
  const docNumber = `RS-C${String(contract.id).padStart(5, '0')}`;
  const typeLabel = CONTRACT_TYPES.find((t) => t.value === contract.contract_type)?.label || '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>REACT STUDIO</Text>
            <Text style={styles.brandSub}>(주) 그리고 엔터테인먼트 영상프로덕션</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>견 적 서</Text>
            <Text style={styles.docNumber}>No. {docNumber}</Text>
          </View>
        </View>

        {/* Issuer Info */}
        <View style={{ flexDirection: 'row', marginBottom: 24, gap: 12 }}>
          <View style={{ flex: 1, padding: 10, backgroundColor: '#f8f8f8', borderRadius: 4, borderLeftWidth: 3, borderLeftColor: '#FF4D00' }}>
            <Text style={{ fontSize: 8, color: '#888888', marginBottom: 4 }}>발행자</Text>
            <Text style={{ fontSize: 11, fontWeight: 700 }}>(주) 그리고 엔터테인먼트</Text>
            <Text style={{ fontSize: 8, color: '#666666', marginTop: 4 }}>사업자등록번호 116-81-96848</Text>
            <Text style={{ fontSize: 8, color: '#666666', marginTop: 2 }}>업태 : 정보통신업  종목 : 미디어콘텐츠창작업</Text>
            <Text style={{ fontSize: 8, color: '#666666', marginTop: 2 }}>서울특별시 마포구 성지3길 55, 3층</Text>
            <Text style={{ fontSize: 8, color: '#666666', marginTop: 2 }}>대표자명 : 김현준</Text>
          </View>
        </View>

        <View style={{ marginBottom: 20, padding: 12, backgroundColor: '#111111', borderRadius: 4 }}>
          <Text style={{ color: '#FF4D00', fontSize: 8, marginBottom: 4 }}>ESTIMATE</Text>
          <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 700 }}>{contract.title}</Text>
          {typeLabel ? <Text style={{ color: '#888888', fontSize: 9, marginTop: 3 }}>{typeLabel}</Text> : null}
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>수신</Text>
            <Text style={styles.infoValue}>{contract.client_name} 님</Text>
            {contract.client_company ? <Text style={styles.infoSub}>{contract.client_company}</Text> : null}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>발행일</Text>
            <Text style={styles.infoValue}>{today}</Text>
          </View>
          {contract.start_date ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>기간</Text>
              <Text style={styles.infoValue}>{contract.start_date}</Text>
              {contract.end_date ? <Text style={styles.infoSub}>~ {contract.end_date}</Text> : null}
            </View>
          ) : null}
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.col1]}>품목</Text>
          <Text style={[styles.tableHeaderText, styles.col2]}>수량</Text>
          <Text style={[styles.tableHeaderText, styles.col3]}>단가</Text>
          <Text style={[styles.tableHeaderText, styles.col4]}>금액</Text>
        </View>
        {(contract.items ?? []).map((item: QuoteItem, i: number) => (
          <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={styles.col1}>{item.name}</Text>
            <Text style={[styles.col2, { textAlign: 'center' }]}>{item.qty}</Text>
            <Text style={[styles.col3, { textAlign: 'right' }]}>{formatKRW(item.unit_price)}</Text>
            <Text style={[styles.col4, { textAlign: 'right' }]}>{formatKRW(item.amount)}</Text>
          </View>
        ))}

        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>공급가액</Text>
            <Text style={styles.totalValue}>{formatKRW(contract.supply_amount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>부가세 (10%)</Text>
            <Text style={styles.totalValue}>{formatKRW(contract.vat)}</Text>
          </View>
          <View style={styles.totalFinalRow}>
            <Text style={styles.totalFinalLabel}>합계</Text>
            <Text style={styles.totalFinalValue}>{formatKRW(contract.total_amount)}</Text>
          </View>
        </View>

        <View style={styles.depositSection}>
          <View style={styles.depositRow}>
            <Text style={styles.depositLabel}>선금</Text>
            <Text style={styles.depositValue}>{formatKRW(contract.deposit_amount)}</Text>
          </View>
          <View style={styles.depositRow}>
            <Text style={styles.depositLabel}>잔금</Text>
            <Text style={styles.depositValue}>{formatKRW(contract.balance_amount)}</Text>
          </View>
        </View>

        {contract.terms ? (
          <View style={styles.terms}>
            <Text style={styles.termsLabel}>특이사항</Text>
            <Text style={styles.termsText}>{contract.terms}</Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>(주) 그리고 엔터테인먼트 | React Studio | react.studio.kr@gmail.com</Text>
          <Text style={styles.footerText}>{docNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
