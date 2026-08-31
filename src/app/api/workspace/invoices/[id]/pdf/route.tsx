import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { formatIST, formatISTWithSeconds } from '@/lib/timezone';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToStream,
  Image,
} from '@react-pdf/renderer';

export const dynamic = 'force-dynamic';

// ============================================================================
// Generate a printable PDF invoice for a patient
// ============================================================================
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id, labId: user.labId },
      include: {
        patient: {
          select: {
            name: true,
            phone: true,
            email: true,
            patientId: true,
            age: true,
            ageUnit: true,
            gender: true,
            address: true,
            doctor: { select: { name: true } },
            agency: { select: { agencyName: true } },
          },
        },
        lab: {
          select: {
            name: true,
            logo: true,
            address: true,
            city: true,
            state: true,
            phone: true,
            email: true,
            gstNumber: true,
            licenseNumber: true,
          },
        },
        items: true,
        tests: {
          select: {
            id: true,
            testName: true,
            testCode: true,
            status: true,
            price: true,
            finalPrice: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Build PDF document
    const styles = StyleSheet.create({
      page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#1e293b',
      },
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 2,
        borderBottomColor: '#3b82f6',
        paddingBottom: 15,
        marginBottom: 20,
      },
      labInfo: {
        flex: 1,
      },
      labLogo: {
        width: 80,
        height: 60,
        objectFit: 'contain',
        marginBottom: 8,
      },
      labName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e3a8a',
        marginBottom: 4,
      },
      labText: {
        fontSize: 9,
        color: '#64748b',
        marginBottom: 2,
      },
      invoiceTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1e3a8a',
        textAlign: 'right',
      },
      invoiceNumber: {
        fontSize: 11,
        color: '#64748b',
        textAlign: 'right',
        marginTop: 4,
      },
      sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1e3a8a',
        marginBottom: 6,
        marginTop: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      },
      patientBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 6,
        marginBottom: 20,
      },
      patientCol: {
        flex: 1,
      },
      row: {
        flexDirection: 'row',
        marginBottom: 3,
      },
      label: {
        fontSize: 9,
        color: '#64748b',
        width: 90,
      },
      value: {
        fontSize: 9,
        color: '#1e293b',
        fontWeight: '500',
        flex: 1,
      },
      tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#1e3a8a',
        padding: 8,
        borderRadius: 4,
      },
      tableHeaderCell: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
      },
      tableRow: {
        flexDirection: 'row',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
      },
      tableCell: {
        fontSize: 9,
        color: '#1e293b',
      },
      totalsSection: {
        marginTop: 20,
        alignSelf: 'flex-end',
        width: 240,
      },
      totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
      },
      totalLabel: {
        fontSize: 10,
        color: '#64748b',
      },
      totalValue: {
        fontSize: 10,
        color: '#1e293b',
        fontWeight: '600',
      },
      grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        marginTop: 4,
        borderTopWidth: 2,
        borderTopColor: '#1e3a8a',
      },
      grandTotalLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1e3a8a',
      },
      grandTotalValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1e3a8a',
      },
      footer: {
        marginTop: 30,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        alignItems: 'center',
      },
      footerText: {
        fontSize: 8,
        color: '#94a3b8',
        marginBottom: 2,
      },
      statusBadge: {
        fontSize: 10,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        marginTop: 6,
        alignSelf: 'flex-end',
      },
    });

    const subtotal = Number(invoice.subtotal || 0);
    const taxAmount = Number(invoice.totalTax || 0);
    const discountAmount = Number(invoice.discountAmount || 0);
    const grandTotal = Number(invoice.grandTotal || 0);

    const StatusBadge = ({ status }: { status: string }) => {
      const bgColor = status === 'PAID' ? '#10b981' : status === 'CANCELLED' ? '#ef4444' : '#f59e0b';
      return (
        <View style={[styles.statusBadge, { backgroundColor: bgColor, color: '#fff' }]}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{status}</Text>
        </View>
      );
    };

    const MyDocument = () => (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.labInfo}>
              {invoice.lab?.logo ? (
                <Image style={styles.labLogo} src={invoice.lab.logo} />
              ) : null}
              <Text style={styles.labName}>{invoice.lab?.name || 'Lab Name'}</Text>
              {invoice.lab?.address && <Text style={styles.labText}>{invoice.lab.address}</Text>}
              {(invoice.lab?.city || invoice.lab?.state) && (
                <Text style={styles.labText}>
                  {[invoice.lab?.city, invoice.lab?.state].filter(Boolean).join(', ')}
                </Text>
              )}
              {invoice.lab?.phone && <Text style={styles.labText}>Phone: {invoice.lab.phone}</Text>}
              {invoice.lab?.email && <Text style={styles.labText}>Email: {invoice.lab.email}</Text>}
              {invoice.lab?.gstNumber && <Text style={styles.labText}>GST: {invoice.lab.gstNumber}</Text>}
              {invoice.lab?.licenseNumber && <Text style={styles.labText}>License: {invoice.lab.licenseNumber}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.invoiceTitle}>INVOICE</Text>
              <Text style={styles.invoiceNumber}>#{invoice.invoiceNumber}</Text>
              <Text style={[styles.labText, { marginTop: 6 }]}>Date: {formatIST(invoice.createdAt)}</Text>
              <StatusBadge status={invoice.status} />
            </View>
          </View>

          {/* Patient Info */}
          <Text style={styles.sectionTitle}>Bill To</Text>
          <View style={styles.patientBox}>
            <View style={styles.patientCol}>
              <View style={styles.row}>
                <Text style={styles.label}>Patient Name:</Text>
                <Text style={styles.value}>{invoice.patient?.name || 'N/A'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Patient ID:</Text>
                <Text style={styles.value}>{invoice.patient?.patientId || 'N/A'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value}>{invoice.patient?.phone || 'N/A'}</Text>
              </View>
              {invoice.patient?.age !== null && (
                <View style={styles.row}>
                  <Text style={styles.label}>Age/Gender:</Text>
                  <Text style={styles.value}>
                    {invoice.patient?.age} {invoice.patient?.ageUnit} / {invoice.patient?.gender}
                  </Text>
                </View>
              )}
              {invoice.patient?.address && (
                <View style={styles.row}>
                  <Text style={styles.label}>Address:</Text>
                  <Text style={styles.value}>{invoice.patient.address}</Text>
                </View>
              )}
            </View>
            <View style={styles.patientCol}>
              {invoice.patient?.doctor?.name && (
                <View style={styles.row}>
                  <Text style={styles.label}>Ref. Doctor:</Text>
                  <Text style={styles.value}>{invoice.patient.doctor.name}</Text>
                </View>
              )}
              {invoice.patient?.agency?.agencyName && (
                <View style={styles.row}>
                  <Text style={styles.label}>Agency:</Text>
                  <Text style={styles.value}>{invoice.patient.agency.agencyName}</Text>
                </View>
              )}
              <View style={styles.row}>
                <Text style={styles.label}>Tests:</Text>
                <Text style={styles.value}>{invoice.tests?.length || 0} test(s)</Text>
              </View>
            </View>
          </View>

          {/* Tests Table */}
          <Text style={styles.sectionTitle}>Test Details</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { flex: 4 }]}>Test Name</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Code</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Price</Text>
          </View>
          {invoice.tests?.map((test, idx) => (
            <View key={test.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>{idx + 1}</Text>
              <Text style={[styles.tableCell, { flex: 4 }]}>{test.testName}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{test.testCode || '—'}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                ₹{Number(test.finalPrice || test.price || 0).toFixed(2)}
              </Text>
            </View>
          ))}

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>₹{subtotal.toFixed(2)}</Text>
            </View>
            {discountAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.totalValue}>- ₹{discountAmount.toFixed(2)}</Text>
              </View>
            )}
            {taxAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax</Text>
                <Text style={styles.totalValue}>₹{taxAmount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
              <Text style={styles.grandTotalValue}>₹{grandTotal.toFixed(2)}</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              This is a computer-generated invoice and does not require a physical signature.
            </Text>
            <Text style={styles.footerText}>
              Generated on {formatISTWithSeconds(new Date())} • {invoice.lab?.name}
            </Text>
            {invoice.lab?.phone && (
              <Text style={styles.footerText}>For queries, contact: {invoice.lab.phone}</Text>
            )}
          </View>
        </Page>
      </Document>
    );

    const stream = await renderToStream(<MyDocument />);

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Invoice_${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('[INVOICE_PDF_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice PDF', details: error.message },
      { status: 500 }
    );
  }
}
