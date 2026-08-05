import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { addMonths, addYears } from "date-fns";
import nodemailer from "nodemailer";

const generateTempPassword = () => crypto.randomBytes(4).toString("hex");
const generateLabCode = (name: string) => (name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'LAB') + Math.floor(100 + Math.random() * 900);

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: "Order ID required" }, { status: 400 });

    // 1. Fetch Order directly from WooCommerce API
    const wooUrl = process.env.WOOCOMMERCE_URL;
    const wooKey = process.env.WOOCOMMERCE_KEY;
    const wooSecret = process.env.WOOCOMMERCE_SECRET;

    const authHeader = `Basic ${Buffer.from(`${wooKey}:${wooSecret}`).toString('base64')}`;
    
    const response = await fetch(`${wooUrl}/wp-json/wc/v3/orders/${orderId}`, {
      headers: { 'Authorization': authHeader }
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Order not found in WooCommerce" }, { status: 404 });
    }

    const order = await response.json();

    // 2. Validate Order Status & Idempotency
    if (order.status !== "processing" && order.status !== "completed") {
      return NextResponse.json({ error: `Order is currently marked as ${order.status}. It must be paid.` }, { status: 400 });
    }

    const existingPayment = await prisma.payment.findUnique({ where: { invoiceNumber: `WOO-${order.id}` } });
    if (existingPayment) {
      return NextResponse.json({ error: "Order has already been synced and provisioned." }, { status: 400 });
    }

    // 3. Extract Data (Same logic as Webhook)
    const customerEmail = order.billing.email;
    const customerName = `${order.billing.first_name} ${order.billing.last_name}`.trim();
    const customerPhone = order.billing.phone || "0000000000";
    const labNameMeta = order.meta_data.find((m: any) => m.key === "lab_name");
    const labName = labNameMeta?.value || order.billing.company || `${customerName} Diagnostics`;

    let mainPlanSku = "";
    let isYearly = false;
    let hasSetupAddon = false;
    const unlockedFeatures: string[] = [];
    let extraBranches = 0, extraStaff = 0, extraStorage = 0;

    order.line_items.forEach((item: any) => {
      const sku = item.sku || "";
      if (sku.includes("BASIC") || sku.includes("GROWTH") || sku.includes("PREMIUM")) {
        mainPlanSku = sku;
        if (sku.includes("YEARLY")) isYearly = true;
      }
      if (sku === "SUPPORT_SETUP") hasSetupAddon = true;
      if (sku.startsWith("ADDON_")) unlockedFeatures.push(sku);
      if (sku === "BOOSTER_BRANCH_1") extraBranches += 1;
      if (sku === "BOOSTER_STAFF_5") extraStaff += 5;
      if (sku === "BOOSTER_STORAGE_10") extraStorage += 10.0;
    });

    // 4. Execute Provisioning
    const existingUser = await prisma.user.findUnique({
      where: { email: customerEmail },
      include: { lab: { include: { subscription: true } } }
    });

    // Add-on Only Sync
    if (!mainPlanSku && (unlockedFeatures.length > 0 || extraBranches > 0 || extraStaff > 0 || extraStorage > 0 || hasSetupAddon)) {
      if (!existingUser || !existingUser.lab?.subscription) throw new Error("Add-on purchased without base plan.");
      
      await prisma.subscription.update({
        where: { id: existingUser.lab.subscription.id },
        data: { unlockedFeatures: { push: unlockedFeatures }, boosterBranches: { increment: extraBranches }, boosterStaff: { increment: extraStaff }, boosterStorage: { increment: extraStorage } }
      });
      await prisma.payment.create({ data: { subscriptionId: existingUser.lab.subscription.id, amount: parseFloat(order.total), currency: order.currency, status: "SUCCESS", invoiceNumber: `WOO-${order.id}` } });
      
      return NextResponse.json({ success: true, message: "Add-ons manually synced to existing lab." }, { status: 200 });
    }

    // Full Plan Sync
    if (!mainPlanSku) throw new Error("No valid SaaS plan found in order.");
    const plan = await prisma.plan.findUnique({ where: { name: mainPlanSku } });
    if (!plan) throw new Error(`Plan SKU [${mainPlanSku}] not found.`);

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const startDate = new Date();
    const endDate = isYearly ? addYears(startDate, 1) : addMonths(startDate, 1);

    await prisma.$transaction(async (tx) => {
      if (existingUser && existingUser.lab) {
        const sub = await tx.subscription.upsert({
          where: { labId: existingUser.lab.id },
          update: { planId: plan.id, endDate, unlockedFeatures: { push: unlockedFeatures }, boosterBranches: { increment: extraBranches }, boosterStaff: { increment: extraStaff }, boosterStorage: { increment: extraStorage } },
          create: { labId: existingUser.lab.id, planId: plan.id, startDate, endDate, unlockedFeatures, boosterBranches: extraBranches, boosterStaff: extraStaff, boosterStorage: extraStorage }
        });
        await tx.payment.create({ data: { subscriptionId: sub.id, amount: parseFloat(order.total), currency: order.currency, status: "SUCCESS", invoiceNumber: `WOO-${order.id}` } });
      } else {
        const newUser = await tx.user.create({ data: { name: customerName, email: customerEmail, phone: customerPhone, password: hashedPassword, role: "LAB_OWNER", isActive: true, onboardingStatus: hasSetupAddon ? "PENDING_LAB_SETUP" : "REGISTERED" } });
        const newLab = await tx.lab.create({ data: { name: labName, email: customerEmail, phone: customerPhone, labCode: generateLabCode(labName), address: "Pending", city: "Pending", state: "Pending", pincode: "000000", licenseNumber: `PENDING-${Date.now()}`, ownerId: newUser.id, isActive: true } });
        const mainBranch = await tx.branch.create({ data: { labId: newLab.id, name: "Main Branch", isMainBranch: true, address: "Pending", city: "Pending", state: "Pending", pincode: "000000", isActive: true } });
        await tx.labStaff.create({ data: { labId: newLab.id, userId: newUser.id, branchId: mainBranch.id, position: "Lab Owner", isActive: true } });
        const subscription = await tx.subscription.create({ data: { labId: newLab.id, planId: plan.id, status: "ACTIVE", startDate, endDate, unlockedFeatures, boosterBranches: extraBranches, boosterStaff: extraStaff, boosterStorage: extraStorage } });
        await tx.currentUsage.create({ data: { subscriptionId: subscription.id } });
        await tx.payment.create({ data: { subscriptionId: subscription.id, amount: parseFloat(order.total), currency: order.currency, status: "SUCCESS", invoiceNumber: `WOO-${order.id}` } });
      }
    });

    // Send Welcome Email
    const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 465, secure: Number(process.env.SMTP_PORT) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Patholab Cloud" <patholab@globizhub.com>',
      to: customerEmail,
      subject: existingUser ? `🚀 Workspace Updated!` : `🚀 Welcome to Patholab Cloud!`,
      html: `<div style="padding: 30px;"><h2>Workspace Activated</h2><p>Your workspace is ready. ${!existingUser ? `Password: <strong>${tempPassword}</strong>` : ''}</p><p><a href="https://app.patholab.cloud/login">Login Here</a></p></div>`,
    });

    // Log manual execution
    await prisma.webhookLog.create({ data: { event: `MANUAL_SYNC_${order.id}`, payload: order, status: "SUCCESS" } });

    return NextResponse.json({ success: true, message: "Order manually synced and provisioned successfully!" }, { status: 200 });

  } catch (error: any) {
    console.error("Manual Sync Error:", error);
    return NextResponse.json({ error: error.message || "Failed to sync order" }, { status: 500 });
  }
}