import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { addMonths, addYears } from "date-fns";

// Helper to generate a secure 8-character temporary password
const generateTempPassword = () => crypto.randomBytes(4).toString("hex");

// Helper to generate a 3-letter lab code (e.g., GLO123)
const generateLabCode = (name: string) => {
  const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'LAB';
  return prefix + Math.floor(100 + Math.random() * 900);
};

export async function POST(req: NextRequest) {
  let webhookLogId = "";

  try {
    const rawBody = await req.text();
    const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET; 
    const signature = req.headers.get("x-wc-webhook-signature");

    if (!secret || !signature) {
      return NextResponse.json({ error: "Missing secret or signature" }, { status: 401 });
    }

    const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
    if (signature !== expectedSignature) {
      console.error("Webhook signature mismatch!");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const order = JSON.parse(rawBody);

    // Ping Bypass
    if (order.webhook_id) {
      console.log("Received WooCommerce Ping. Webhook is successfully linked!");
      return NextResponse.json({ message: "Ping successful" }, { status: 200 });
    }

    // 1. INSTANTLY LOG THE INCOMING WEBHOOK (MONITORING SYSTEM)
    const log = await prisma.webhookLog.create({
      data: {
        event: `ORDER_${order.status ? order.status.toUpperCase() : 'UNKNOWN'}`,
        payload: order,
        status: "PENDING"
      }
    });
    webhookLogId = log.id;

    // Only process orders that are successfully paid
    if (order.status !== "processing" && order.status !== "completed") {
      await prisma.webhookLog.update({ where: { id: webhookLogId }, data: { status: "IGNORED", errorMessage: "Order not paid yet." } });
      return NextResponse.json({ message: "Order not paid, ignoring." }, { status: 200 });
    }

    // Idempotency Check: Did we already process this exact order?
    const existingPayment = await prisma.payment.findUnique({
      where: { invoiceNumber: `WOO-${order.id}` }
    });
    if (existingPayment) {
      await prisma.webhookLog.update({ where: { id: webhookLogId }, data: { status: "IGNORED", errorMessage: "Order already provisioned." } });
      return NextResponse.json({ message: "Order already provisioned." }, { status: 200 });
    }

    // 3. Extract Customer & Plan Details
    const customerEmail = order.billing.email;
    const customerName = `${order.billing.first_name} ${order.billing.last_name}`.trim();
    const customerPhone = order.billing.phone || "0000000000";
    
    const labNameMeta = order.meta_data.find((m: any) => m.key === "lab_name");
    const labName = labNameMeta?.value || order.billing.company || `${customerName} Diagnostics`;

    // 4. Analyze Line Items for Plans, Add-ons, and Boosters
    let mainPlanSku = "";
    let isYearly = false;
    let hasSetupAddon = false;

    const unlockedFeatures: string[] = [];
    let extraBranches = 0;
    let extraStaff = 0;
    let extraStorage = 0;
    const purchasedItemNames: string[] = [];

    order.line_items.forEach((item: any) => {
      const sku = item.sku || "";
      
      if (sku.includes("BASIC") || sku.includes("GROWTH") || sku.includes("PREMIUM")) {
        mainPlanSku = sku;
        if (sku.includes("YEARLY")) isYearly = true;
        purchasedItemNames.push(item.name);
      }
      if (sku === "SUPPORT_SETUP") {
        hasSetupAddon = true;
        purchasedItemNames.push(item.name);
      }
      if (sku.startsWith("ADDON_")) {
        unlockedFeatures.push(sku);
        purchasedItemNames.push(item.name);
      }
      if (sku === "BOOSTER_BRANCH_1") { extraBranches += 1; purchasedItemNames.push(item.name); }
      if (sku === "BOOSTER_STAFF_5") { extraStaff += 5; purchasedItemNames.push(item.name); }
      if (sku === "BOOSTER_STORAGE_10") { extraStorage += 10.0; purchasedItemNames.push(item.name); }
    });

    // 5. CHECK IF USER ALREADY EXISTS (UPGRADE / ADD-ON LOGIC)
    const existingUser = await prisma.user.findUnique({
      where: { email: customerEmail },
      include: { lab: { include: { subscription: true } } }
    });

    // SCENARIO A: User bought ONLY Add-ons/Boosters (No Core Plan)
    if (!mainPlanSku && (unlockedFeatures.length > 0 || extraBranches > 0 || extraStaff > 0 || extraStorage > 0 || hasSetupAddon)) {
      if (!existingUser || !existingUser.lab?.subscription) {
        throw new Error("Security Block: Attempted to buy an add-on without an active base subscription.");
      }

      // Safe Add-on Append: Update existing subscription without creating a new lab
      await prisma.subscription.update({
        where: { id: existingUser.lab.subscription.id },
        data: {
          unlockedFeatures: { push: unlockedFeatures },
          boosterBranches: { increment: extraBranches },
          boosterStaff: { increment: extraStaff },
          boosterStorage: { increment: extraStorage }
        }
      });
      
      await prisma.payment.create({
        data: { subscriptionId: existingUser.lab.subscription.id, amount: parseFloat(order.total), currency: order.currency, status: "SUCCESS", invoiceNumber: `WOO-${order.id}`, billingSnapshot: order }
      });

      await prisma.webhookLog.update({ where: { id: webhookLogId }, data: { status: "SUCCESS" } });
      
      // We return here because an add-on purchase doesn't need a full welcome email with a new password
      return NextResponse.json({ success: true, type: "ADDON_ONLY_UPGRADE" }, { status: 200 });
    }

    // SCENARIO B: User bought a Base Plan (New User OR Plan Upgrade)
    if (!mainPlanSku) {
      throw new Error("No valid SaaS plan or add-on found in order");
    }

    const plan = await prisma.plan.findUnique({ where: { name: mainPlanSku } });
    if (!plan) throw new Error(`Plan SKU [${mainPlanSku}] not found in database.`);

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const startDate = new Date();
    const endDate = isYearly ? addYears(startDate, 1) : addMonths(startDate, 1);

    // THE MASSIVE PRISMA TRANSACTION
    await prisma.$transaction(async (tx) => {
      
      // If user exists, UPGRADE their subscription.
      if (existingUser && existingUser.lab) {
        const sub = await tx.subscription.upsert({
          where: { labId: existingUser.lab.id },
          update: { 
            planId: plan.id, 
            endDate: endDate, 
            unlockedFeatures: { push: unlockedFeatures }, 
            boosterBranches: { increment: extraBranches },
            boosterStaff: { increment: extraStaff },
            boosterStorage: { increment: extraStorage }
          },
          create: { 
            labId: existingUser.lab.id, 
            planId: plan.id, 
            startDate: startDate, 
            endDate: endDate, 
            unlockedFeatures, 
            boosterBranches: extraBranches,
            boosterStaff: extraStaff,
            boosterStorage: extraStorage
          }
        });
        
        await tx.payment.create({ data: { subscriptionId: sub.id, amount: parseFloat(order.total), currency: order.currency, status: "SUCCESS", invoiceNumber: `WOO-${order.id}`, billingSnapshot: order } });

      } else {
        // Create entirely new User & Lab
        const newUser = await tx.user.create({
          data: { name: customerName, email: customerEmail, phone: customerPhone, password: hashedPassword, role: "LAB_OWNER", isActive: true, onboardingStatus: hasSetupAddon ? "PENDING_LAB_SETUP" : "REGISTERED" },
        });

        const newLab = await tx.lab.create({
          data: { name: labName, email: customerEmail, phone: customerPhone, labCode: generateLabCode(labName), address: order.billing.address_1 || "Address Pending", city: order.billing.city || "City Pending", state: order.billing.state || "State Pending", pincode: order.billing.postcode || "000000", licenseNumber: `PENDING-${Date.now()}`, ownerId: newUser.id, isActive: true },
        });

        const mainBranch = await tx.branch.create({
          data: { labId: newLab.id, name: "Main Branch", isMainBranch: true, address: order.billing.address_1 || "Address Pending", city: order.billing.city || "City Pending", state: order.billing.state || "State Pending", pincode: order.billing.postcode || "000000", isActive: true }
        });

        await tx.labStaff.create({
          data: { labId: newLab.id, userId: newUser.id, branchId: mainBranch.id, position: "Lab Owner", isActive: true }
        });

        const subscription = await tx.subscription.create({
          data: { labId: newLab.id, planId: plan.id, status: "ACTIVE", startDate: startDate, endDate: endDate, unlockedFeatures: unlockedFeatures, boosterBranches: extraBranches, boosterStaff: extraStaff, boosterStorage: extraStorage }
        });

        await tx.currentUsage.create({ data: { subscriptionId: subscription.id } });

        await tx.payment.create({
          data: { subscriptionId: subscription.id, amount: parseFloat(order.total), currency: order.currency, status: "SUCCESS", invoiceNumber: `WOO-${order.id}`, billingSnapshot: order }
        });
      }
    });

    // Mark Webhook as Success
    await prisma.webhookLog.update({ where: { id: webhookLogId }, data: { status: "SUCCESS" } });

    // Generate the HTML list for unlocked add-ons to show in the email
    const addonListHtml = purchasedItemNames.length > 1 
      ? `<div style="margin-top: 20px; font-size: 14px; color: #475569;">
           <strong>Unlocked Modules & Services:</strong>
           <ul style="margin-top: 5px; padding-left: 20px;">
             ${purchasedItemNames.map(name => `<li>${name}</li>`).join('')}
           </ul>
         </div>`
      : '';

    // 7. CONFIGURE NODEMAILER & SEND WELCOME EMAIL
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Determine the subject based on whether they are a new or existing user
    const emailSubject = existingUser ? `🚀 Your Patholab Cloud Workspace has been Updated!` : `🚀 Welcome to Patholab Cloud, ${customerName}!`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Patholab Cloud" <patholab@globizhub.com>',
      to: customerEmail,
      subject: emailSubject,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-w: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          
          <div style="background-color: #059669; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Workspace Activated!</h1>
          </div>

          <div style="padding: 30px; color: #334155;">
            <p style="font-size: 16px;">Hello <strong>${customerName}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6;">Thank you for your purchase of <strong>${plan.displayName}</strong>. Your laboratory workspace for <strong>${labName}</strong> is ready for use.</p>
            
            ${addonListHtml}

            <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 20px; border-radius: 4px; margin: 25px 0;">
              <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Secure Login URL:</strong> <br>
                 <a href="https://app.patholab.cloud/login" style="color: #059669; text-decoration: none; font-weight: bold;">https://app.patholab.cloud/login</a>
              </p>
              <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Your Email:</strong> <br>${customerEmail}</p>
              ${!existingUser ? `<p style="margin: 0; font-size: 15px;"><strong>Temporary Password:</strong> <br>
                 <span style="background-color: #e2e8f0; padding: 5px 10px; border-radius: 4px; font-family: monospace; font-size: 16px; font-weight: bold; letter-spacing: 1px;">${tempPassword}</span>
              </p>` : `<p style="margin: 0; font-size: 15px; color: #64748b;"><em>Use your existing password to log in.</em></p>`}
            </div>

            ${hasSetupAddon ? `<p style="background-color: #fffbeb; color: #b45309; padding: 15px; border-radius: 6px; font-size: 14px;"><strong>Note:</strong> We noticed you purchased the "Done-For-You Lab Setup". Our engineering team will contact you within 24 hours to begin migrating your data.</p>` : ''}

            ${!existingUser ? `<p style="font-size: 14px; color: #64748b; margin-top: 30px;"><em>For security purposes, please log in and change your password immediately from your Settings panel.</em></p>` : ''}
          </div>
        </div>
      `,
    });

    console.log(`[SUCCESS] Processed order for ${customerEmail} via Nodemailer`);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error("[WEBHOOK ERROR]:", error);
    // Mark Webhook as Failed with exact error trace
    if (webhookLogId) {
      await prisma.webhookLog.update({
        where: { id: webhookLogId },
        data: { status: "FAILED", errorMessage: error.message || "Unknown server error" }
      });
    }
    return NextResponse.json({ error: "Server error during provisioning" }, { status: 500 });
  }
}