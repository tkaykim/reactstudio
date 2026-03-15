import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { Quote, QuoteItem } from '@/types';

// Register a font if needed (using built-in Helvetica for compatibility)
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'Helvetica',
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
  brandName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#FF4D00',
  },
  brandSub: {
    fontSize: 9,
    color: '#666666',
    marginTop: 3,
  },
  docTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  docNumber: {
    fontSize: 9,
    color: '#666666',
    textAlign: 'right',
    marginTop: 3,
  },
  infoSection: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  infoBox: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
  },
  infoLabel: {
    fontSize: 8,
    color: '#888888',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  infoText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  infoSub: {
    fontSize: 9,
    color: '#666666',
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    padding: '8 10',
    marginBottom: 0,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    padding: '8 10',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'center' },
  col3: { flex: 1.5, textAlign: 'right' },
  col4: { flex: 1.5, textAlign: 'right' },
  totalSection: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: 250,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 9,
    color: '#666666',
  },
  totalValue: {
    fontSize: 9,
  },
  totalFinalRow: {
    flexDirection: 'row',
    width: 250,
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: '#FF4D00',
    marginTop: 4,
  },
  totalFinalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  totalFinalValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#FF4D00',
  },
  notes: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#fff8f5',
    borderLeftWidth: 3,
    borderLeftColor: '#FF4D00',
  },
  notesLabel: {
    fontSize: 8,
    color: '#FF4D00',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 9,
    color: '#444444',
    lineHeight: 1.6,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#aaaaaa',
  },
});

function formatKRW(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

interface QuoteDocumentProps {
  quote: Quote & { inquiries?: { name?: string; company?: string; project_title?: string } };
  clientName?: string;
  clientCompany?: string;
  projectTitle?: string;
}

// Named export for use in renderToBuffer (server-side PDF generation)
export function buildQuoteDocument(props: QuoteDocumentProps) {
  return QuoteDocument(props);
}

export default function QuoteDocument({ quote, clientName, clientCompany, projectTitle }: QuoteDocumentProps) {
  const today = new Date().toLocaleDateString('ko-KR');
  const docNumber = `RS-${String(quote.id).padStart(6, '0')}`;
  const title = projectTitle || quote.inquiries?.project_title;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>REACT STUDIO</Text>
            <Text style={styles.brandSub}>영상제작 프로덕션</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>견 적 서</Text>
            <Text style={styles.docNumber}>No. {docNumber}</Text>
          </View>
        </View>

        {title ? (
          <View style={{ marginBottom: 20, padding: 12, backgroundColor: '#111111', borderRadius: 4 }}>
            <Text style={{ color: '#FF4D00', fontSize: 8, marginBottom: 4 }}>PROJECT</Text>
            <Text style={{ color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' }}>{title}</Text>
          </View>
        ) : null}

        {/* Client + Date info */}
        <View style={styles.infoSection}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>수신</Text>
            <Text style={styles.infoText}>{clientName || '고객'} 님</Text>
            {clientCompany ? <Text style={styles.infoSub}>{clientCompany}</Text> : null}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>발행일</Text>
            <Text style={styles.infoText}>{today}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>유효기간</Text>
            <Text style={styles.infoText}>
              {quote.valid_until
                ? new Date(quote.valid_until).toLocaleDateString('ko-KR')
                : '발행일로부터 30일'}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.col1]}>품목</Text>
          <Text style={[styles.tableHeaderText, styles.col2]}>수량</Text>
          <Text style={[styles.tableHeaderText, styles.col3]}>단가</Text>
          <Text style={[styles.tableHeaderText, styles.col4]}>금액</Text>
        </View>
        {quote.items.map((item: QuoteItem, i: number) => (
          <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={styles.col1}>{item.name}</Text>
            <Text style={[styles.col2, { textAlign: 'center' }]}>{item.qty}</Text>
            <Text style={[styles.col3, { textAlign: 'right' }]}>{formatKRW(item.unit_price)}</Text>
            <Text style={[styles.col4, { textAlign: 'right' }]}>{formatKRW(item.amount)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>공급가액</Text>
            <Text style={styles.totalValue}>{formatKRW(quote.supply_amount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>부가세 (10%)</Text>
            <Text style={styles.totalValue}>{formatKRW(quote.vat)}</Text>
          </View>
          <View style={styles.totalFinalRow}>
            <Text style={styles.totalFinalLabel}>합계</Text>
            <Text style={styles.totalFinalValue}>{formatKRW(quote.total_amount)}</Text>
          </View>
        </View>

        {/* Notes */}
        {quote.notes ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>비고</Text>
            <Text style={styles.notesText}>{quote.notes}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>React Studio | contact@reactstudio.kr</Text>
          <Text style={styles.footerText}>{docNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
