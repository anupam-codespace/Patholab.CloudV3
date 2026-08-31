import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/export-csv?resource=labs&from=2026-01-01&to=2026-12-31&status=active&format=csv
 * 
 * Resources: labs, recharges, deductions, users, invoices, payments, activity, leads, plans
 * Filters: from, to (date range), status, search, role, state
 * Format: csv (default), excel
 * 
 * Super Admin only.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "Unauthorized — Super Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const resource = searchParams.get('resource') || 'labs';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');

    // Build date filter
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) { const endDate = new Date(to); endDate.setHours(23, 59, 59, 999); dateFilter.lte = endDate; }

    let rows: any[] = [];
    let headers: string[] = [];
    let filename = '';

    switch (resource) {
      // ==========================================
      // LABS — Full details with mobile, email, wallet, branch info
      // ==========================================
      case 'labs': {
        const where: any = {};
        if (status === 'active') where.isActive = true;
        if (status === 'inactive') where.isActive = false;
        if (search) {
          where.OR = [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
            { city: { contains: search } },
            { state: { contains: search } },
          ];
        }
        if (from || to) where.createdAt = dateFilter;

        const labs = await prisma.lab.findMany({
          where,
          include: {
            wallet: true,
            branches: { select: { id: true, name: true, city: true, phone: true, isActive: true } },
            owner: { select: { name: true, email: true, phone: true } },
            _count: { select: { patients: true, tests: true, invoices: true, staff: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        headers = ['Lab Name', 'Owner Name', 'Email', 'Phone', 'Address', 'City', 'State', 'Pincode', 'License No', 'GST No', 'Status', 'Wallet Balance', 'Wallet Validity', 'Branches Count', 'Total Patients', 'Total Tests', 'Total Invoices', 'Total Staff', 'Registered Date', 'Branch Details'];
        rows = labs.map(l => ({
          'Lab Name': l.name,
          'Owner Name': l.owner?.name || '',
          'Email': l.email || '',
          'Phone': l.phone || '',
          'Address': l.address || '',
          'City': l.city || '',
          'State': l.state || '',
          'Pincode': l.pincode || '',
          'License No': l.licenseNumber || '',
          'GST No': l.gstNumber || '',
          'Status': l.isActive ? 'Active' : 'Inactive',
          'Wallet Balance': Number(l.wallet?.balance || 0).toFixed(2),
          'Wallet Validity': l.wallet?.validityEndDate ? new Date(l.wallet.validityEndDate).toLocaleDateString('en-IN') : '',
          'Branches Count': l.branches.length,
          'Total Patients': l._count.patients,
          'Total Tests': l._count.tests,
          'Total Invoices': l._count.invoices,
          'Total Staff': l._count.staff,
          'Registered Date': new Date(l.createdAt).toLocaleDateString('en-IN'),
          'Branch Details': l.branches.map(b => `${b.name} (${b.city}, ${b.phone})`).join(' | '),
        }));
        filename = `Labs_${new Date().toISOString().slice(0, 10)}`;
        break;
      }

      // ==========================================
      // RECHARGES — Wallet recharge history
      // ==========================================
      case 'recharges': {
        const where: any = {};
        if (from || to) where.createdAt = dateFilter;
        if (search) {
          where.OR = [
            { description: { contains: search } },
            { wallet: { lab: { name: { contains: search } } } },
          ];
        }

        const txns = await prisma.walletTransaction.findMany({
          where: { ...where, type: 'RECHARGE' },
          include: {
            wallet: { include: { lab: { select: { name: true, email: true, phone: true, city: true, state: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        });

        headers = ['Date', 'Lab Name', 'Email', 'Phone', 'City', 'State', 'Amount', 'Closing Balance', 'Description', 'Type'];
        rows = txns.map(t => ({
          'Date': new Date(t.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          'Lab Name': t.wallet?.lab?.name || '',
          'Email': t.wallet?.lab?.email || '',
          'Phone': t.wallet?.lab?.phone || '',
          'City': t.wallet?.lab?.city || '',
          'State': t.wallet?.lab?.state || '',
          'Amount': Number(t.amount).toFixed(2),
          'Closing Balance': Number(t.closingBalance).toFixed(2),
          'Description': t.description || '',
          'Type': t.type,
        }));
        filename = `Recharges_${new Date().toISOString().slice(0, 10)}`;
        break;
      }

      // ==========================================
      // DEDUCTIONS — Wallet deduction history
      // ==========================================
      case 'deductions': {
        const where: any = {};
        if (from || to) where.createdAt = dateFilter;
        if (search) {
          where.OR = [
            { description: { contains: search } },
            { wallet: { lab: { name: { contains: search } } } },
          ];
        }

        const txns = await prisma.walletTransaction.findMany({
          where: { ...where, type: 'DEDUCTION' },
          include: {
            wallet: { include: { lab: { select: { name: true, email: true, phone: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        });

        headers = ['Date', 'Lab Name', 'Email', 'Phone', 'Amount', 'Closing Balance', 'Description'];
        rows = txns.map(t => ({
          'Date': new Date(t.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          'Lab Name': t.wallet?.lab?.name || '',
          'Email': t.wallet?.lab?.email || '',
          'Phone': t.wallet?.lab?.phone || '',
          'Amount': Number(t.amount).toFixed(2),
          'Closing Balance': Number(t.closingBalance).toFixed(2),
          'Description': t.description || '',
        }));
        filename = `Deductions_${new Date().toISOString().slice(0, 10)}`;
        break;
      }

      // ==========================================
      // ACTIVE LABS — Only active labs with mobile & email
      // ==========================================
      case 'active-labs': {
        const labs = await prisma.lab.findMany({
          where: { isActive: true, deletedAt: null, ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }, { phone: { contains: search } }] } : {}) },
          include: { wallet: true, owner: { select: { name: true, email: true, phone: true } } },
          orderBy: { createdAt: 'desc' },
        });

        headers = ['Lab Name', 'Owner Name', 'Owner Email', 'Owner Phone', 'Lab Email', 'Lab Phone', 'City', 'State', 'Wallet Balance', 'Registered Date'];
        rows = labs.map(l => ({
          'Lab Name': l.name,
          'Owner Name': l.owner?.name || '',
          'Owner Email': l.owner?.email || '',
          'Owner Phone': l.owner?.phone || '',
          'Lab Email': l.email || '',
          'Lab Phone': l.phone || '',
          'City': l.city || '',
          'State': l.state || '',
          'Wallet Balance': Number(l.wallet?.balance || 0).toFixed(2),
          'Registered Date': new Date(l.createdAt).toLocaleDateString('en-IN'),
        }));
        filename = `Active_Labs_${new Date().toISOString().slice(0, 10)}`;
        break;
      }

      // ==========================================
      // USERS — All platform users
      // ==========================================
      case 'users': {
        const where: any = {};
        if (role) where.role = role;
        if (status === 'active') where.isActive = true;
        if (status === 'inactive') where.isActive = false;
        if (search) {
          where.OR = [{ name: { contains: search } }, { email: { contains: search } }, { phone: { contains: search } }];
        }
        if (from || to) where.createdAt = dateFilter;

        const users = await prisma.user.findMany({
          where,
          include: { lab: { select: { name: true, city: true, state: true } } },
          orderBy: { createdAt: 'desc' },
        });

        headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Lab Name', 'City', 'State', 'Registered Date'];
        rows = users.map(u => ({
          'Name': u.name,
          'Email': u.email,
          'Phone': u.phone || '',
          'Role': u.role,
          'Status': u.isActive ? 'Active' : 'Inactive',
          'Lab Name': u.lab?.name || '',
          'City': u.lab?.city || '',
          'State': u.lab?.state || '',
          'Registered Date': new Date(u.createdAt).toLocaleDateString('en-IN'),
        }));
        filename = `Users_${new Date().toISOString().slice(0, 10)}`;
        break;
      }

      // ==========================================
      // INVOICES — All platform invoices
      // ==========================================
      case 'invoices': {
        const where: any = {};
        if (status) where.paymentStatus = status;
        if (from || to) where.createdAt = dateFilter;
        if (search) {
          where.OR = [{ invoiceNumber: { contains: search } }, { lab: { name: { contains: search } } }, { patient: { name: { contains: search } } }];
        }

        const invoices = await prisma.invoice.findMany({
          where,
          include: {
            lab: { select: { name: true, email: true, phone: true } },
            patient: { select: { name: true, patientId: true, phone: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        headers = ['Invoice No', 'Date', 'Lab Name', 'Lab Email', 'Lab Phone', 'Patient Name', 'Patient ID', 'Patient Phone', 'Subtotal', 'Discount', 'Grand Total', 'Payment Status', 'Payment Mode'];
        rows = invoices.map(i => ({
          'Invoice No': i.invoiceNumber,
          'Date': new Date(i.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          'Lab Name': i.lab?.name || '',
          'Lab Email': i.lab?.email || '',
          'Lab Phone': i.lab?.phone || '',
          'Patient Name': i.patient?.name || '',
          'Patient ID': i.patient?.patientId || '',
          'Patient Phone': i.patient?.phone || '',
          'Subtotal': Number(i.subtotal).toFixed(2),
          'Discount': Number(i.discount).toFixed(2),
          'Grand Total': Number(i.grandTotal).toFixed(2),
          'Payment Status': i.paymentStatus,
          'Payment Mode': i.paymentMode || '',
        }));
        filename = `Invoices_${new Date().toISOString().slice(0, 10)}`;
        break;
      }

      // ==========================================
      // ACTIVITY LOGS — Audit trail
      // ==========================================
      case 'activity': {
        const where: any = {};
        if (from || to) where.createdAt = dateFilter;
        if (search) where.description = { contains: search };

        const logs = await prisma.activityLog.findMany({
          where,
          include: { user: { select: { name: true, email: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10000,
        });

        headers = ['Date', 'User Name', 'User Email', 'Role', 'Action', 'Entity', 'Entity ID', 'Description'];
        rows = logs.map(l => ({
          'Date': new Date(l.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          'User Name': l.user?.name || 'System',
          'User Email': l.user?.email || '',
          'Role': l.user?.role || '',
          'Action': l.action,
          'Entity': l.entity,
          'Entity ID': l.entityId,
          'Description': l.description,
        }));
        filename = `Activity_Logs_${new Date().toISOString().slice(0, 10)}`;
        break;
      }

      // ==========================================
      // LEADS — Sales leads
      // ==========================================
      case 'leads': {
        const where: any = {};
        if (status) where.status = status;
        if (from || to) where.createdAt = dateFilter;

        const leads = await prisma.supportTicket.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        });

        headers = ['Date', 'Subject', 'Description', 'Status', 'Priority'];
        rows = leads.map(l => ({
          'Date': new Date(l.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          'Subject': l.subject,
          'Description': l.description,
          'Status': l.status,
          'Priority': l.priority,
        }));
        filename = `Leads_${new Date().toISOString().slice(0, 10)}`;
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 400 });
    }

    // Build CSV
    const csvEscape = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [
      headers.map(csvEscape).join(','),
      ...rows.map(row => headers.map(h => csvEscape(row[h as keyof typeof row])).join(',')),
    ];
    const csv = '\uFEFF' + csvLines.join('\n'); // BOM for Excel UTF-8

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("CSV Export Error:", error);
    return NextResponse.json({ error: "Export failed: " + error.message }, { status: 500 });
  }
}
