import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { addMonths, addYears } from "date-fns";

// Initialize Resend with your API Key from .env
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to generate a secure 8-character temporary password
const generateTempPassword = () => crypto.randomBytes(4).toString("hex");

// Helper to generate a 3-letter lab code (e.g., GLO123)
const generateLabCode = (name: string) => {
  const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'LAB';
  return prefix + Math.floor(100 + Math.random() * 900);
};

export async function POST(req: NextRequest) {
  try {
    // 1. Verify WooCommerce Signature
    const signature = req.headers.get("x-wc-webhook-signature");
    const rawBody = await req.text();
    const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET; 

    if (!secret || !signature) {
      return NextResponse.json({ error: "Missing secret or signature" }, { status: 401 });
    }

    const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
    if (signature !== expectedSignature) {
      console.error("Webhook signature mismatch!");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 2. Parse WooCommerce Order Data
    const order = JSON.parse(rawBody);

    // Only process orders that are successfully paid
    if (order.status !== "processing" && order.status !== "completed") {
      return NextResponse.json({ message: "Order not paid, ignoring." }, { status: 200 });
    }

    // Idempotency Check: Did we already process this exact order?
    const existingPayment = await prisma.payment.findUnique({
      where: { invoiceNumber: `WOO-${order.id}` }
    });
    if (existingPayment) {
      return NextResponse.json({ message: "Order already provisioned." }, { status: 200 });
    }

    // 3. Extract Customer & Plan Details
    const customerEmail = order.billing.email;
    const customerName = `${order.billing.first_name} ${order.billing.last_name}`.trim();
    const customerPhone = order.billing.phone || "0000000000";
    
    // Check if you added a custom field for Lab Name in CartFlows, otherwise fallback to billing company
    const labNameMeta = order.meta_data.find((m: any) => m.key === "lab_name");
    const labName = labNameMeta?.value || order.billing.company || `${customerName} Diagnostics`;

    // 4. Analyze Line Items for Plans, Add-ons, and Boosters
    let mainPlanSku = "";
    let isYearly = false;
    let hasSetupAddon = false;

    // --- NEW: Track unlocked features and capacity boosters ---
    const unlockedFeatures: string[] = [];
    let extraBranches = 0;
    let extraStaff = 0;
    let extraStorage = 0;
    const purchasedItemNames: string[] = []; // For the welcome email

    // Loop through the cart to find exactly what they bought
    order.line_items.forEach((item: any) => {
      const sku = item.sku || "";
      
      // A. Detect Core Plan
      if (sku.includes("BASIC") || sku.includes("GROWTH") || sku.includes("PREMIUM")) {
        mainPlanSku = sku;
        if (sku.includes("YEARLY")) isYearly = true;
        purchasedItemNames.push(item.name);
      }
      
      // B. Detect Support Setup
      if (sku === "SUPPORT_SETUP") {
        hasSetupAddon = true;
        purchasedItemNames.push(item.name);
      }

      // C. Detect Feature Add-ons (e.g., ADDON_INVENTORY, ADDON_RADIOLOGY)
      if (sku.startsWith("ADDON_")) {
        unlockedFeatures.push(sku);
        purchasedItemNames.push(item.name);
      }

      // D. Detect Capacity Boosters
      if (sku === "BOOSTER_BRANCH_1") extraBranches += 1;
      if (sku === "BOOSTER_STAFF_5") extraStaff += 5;
      if (sku === "BOOSTER_STORAGE_10") extraStorage += 10.0;
    });

    if (!mainPlanSku) {
      return NextResponse.json({ error: "No valid SaaS plan found in order" }, { status: 400 });
    }

    // Find the Plan in Prisma
    const plan = await prisma.plan.findUnique({
      where: { name: mainPlanSku }
    });

    if (!plan) {
      console.error(`Plan SKU [${mainPlanSku}] not found in database.`);
      return NextResponse.json({ error: "Plan not configured in DB" }, { status: 500 });
    }

    // 5. Generate Credentials & Dates
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const startDate = new Date();
    const endDate = isYearly ? addYears(startDate, 1) : addMonths(startDate, 1);

    // 6. THE MASSIVE PRISMA TRANSACTION
    await prisma.$transaction(async (tx) => {
      
      // A. Create or Find User
      let user = await tx.user.findUnique({ where: { email: customerEmail } });
      if (!user) {
        user = await tx.user.create({
          data: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            password: hashedPassword,
            role: "LAB_OWNER",
            isActive: true,
            onboardingStatus: hasSetupAddon ? "PENDING_LAB_SETUP" : "REGISTERED"
          },
        });
      }

      // B. Create the Lab
      const lab = await tx.lab.create({
        data: {
          name: labName,
          email: customerEmail,
          phone: customerPhone,
          labCode: generateLabCode(labName),
          address: order.billing.address_1 || "Address Pending",
          city: order.billing.city || "City Pending",
          state: order.billing.state || "State Pending",
          pincode: order.billing.postcode || "000000",
          licenseNumber: `PENDING-${Date.now()}`,
          ownerId: user.id,
          isActive: true,
        },
      });

      // C. Create Main Branch & Link Staff
      const mainBranch = await tx.branch.create({
        data: {
          labId: lab.id,
          name: "Main Branch",
          isMainBranch: true,
          address: order.billing.address_1 || "Address Pending",
          city: order.billing.city || "City Pending",
          state: order.billing.state || "State Pending",
          pincode: order.billing.postcode || "000000",
          isActive: true,
        }
      });

      await tx.labStaff.create({
        data: {
          labId: lab.id,
          userId: user.id,
          branchId: mainBranch.id,
          position: "Lab Owner",
          isActive: true,
        }
      });

      // D. Create the Subscription & Usage Tracker (NEW ADD-ON LOGIC HERE)
      const subscription = await tx.subscription.create({
        data: {
          labId: lab.id,
          planId: plan.id,
          status: "ACTIVE",
          startDate: startDate,
          endDate: endDate,
          
          unlockedFeatures: unlockedFeatures, // Saves the ADDON_ array
          boosterBranches: extraBranches,     // Saves extra branches
          boosterStaff: extraStaff,           // Saves extra staff
          boosterStorage: extraStorage,       // Saves extra storage
        }
      });

      await tx.currentUsage.create({
        data: { subscriptionId: subscription.id }
      });

      // E. Log the Payment
      await tx.payment.create({
        data: {
          subscriptionId: subscription.id,
          amount: parseFloat(order.total),
          currency: order.currency,
          status: "SUCCESS",
          invoiceNumber: `WOO-${order.id}`,
          billingSnapshot: order, 
        }
      });
    });

    // Generate the HTML list for unlocked add-ons to show in the email
    const addonListHtml = purchasedItemNames.length > 1 
      ? `<div style="margin-top: 20px; font-size: 14px; color: #475569;">
           <strong>Unlocked Modules & Services:</strong>
           <ul style="margin-top: 5px; padding-left: 20px;">
             ${purchasedItemNames.map(name => `<li>${name}</li>`).join('')}
           </ul>
         </div>`
      : '';

    // 7. SEND THE CINEMATIC WELCOME EMAIL
    await resend.emails.send({
      from: "Patholab Cloud <support@patholab.cloud>", 
      to: customerEmail,
      subject: `🚀 Welcome to Patholab Cloud, ${customerName}!`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-w: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          
          <div style="background-color: #059669; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Workspace Activated!</h1>
          </div>

          <div style="padding: 30px; color: #334155;">
            <p style="font-size: 16px;">Hello <strong>${customerName}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6;">Thank you for upgrading to the <strong>${plan.displayName}</strong>. Your laboratory workspace for <strong>${labName}</strong> has been successfully provisioned and is ready for use.</p>
            
            ${addonListHtml}

            <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 20px; border-radius: 4px; margin: 25px 0;">
              <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Secure Login URL:</strong> <br>
                 <a href="https://app.patholab.cloud/login" style="color: #059669; text-decoration: none; font-weight: bold;">https://app.patholab.cloud/login</a>
              </p>
              <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Your Email:</strong> <br>${customerEmail}</p>
              <p style="margin: 0; font-size: 15px;"><strong>Temporary Password:</strong> <br>
                 <span style="background-color: #e2e8f0; padding: 5px 10px; border-radius: 4px; font-family: monospace; font-size: 16px; font-weight: bold; letter-spacing: 1px;">${tempPassword}</span>
              </p>
            </div>

            ${hasSetupAddon ? `<p style="background-color: #fffbeb; color: #b45309; padding: 15px; border-radius: 6px; font-size: 14px;"><strong>Note:</strong> We noticed you purchased the "Done-For-You Lab Setup". Our engineering team will contact you within 24 hours to begin migrating your data.</p>` : ''}

            <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
              <em>For security purposes, please log in and change your password immediately from your Settings panel.</em>
            </p>
          </div>
        </div>
      `,
    });

    console.log(`[SUCCESS] Provisioned ${labName} and emailed ${customerEmail}`);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error("[WEBHOOK ERROR]:", error);
    return NextResponse.json({ error: "Server error during provisioning" }, { status: 500 });
  }
}