import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { addMonths, addYears } from "date-fns"; // npm install date-fns

const resend = new Resend(process.env.RESEND_API_KEY);

const generateTempPassword = () => crypto.randomBytes(4).toString("hex");
const generateLabCode = (name: string) => name.substring(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900);

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-wc-webhook-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const rawBody = await req.text();
    const secret = process.env.WP_WEBHOOK_SECRET;
    
    if (!secret) throw new Error("WP_WEBHOOK_SECRET is missing");

    // 1. Verify WooCommerce Signature
    const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 2. Parse Order Data
    const order = JSON.parse(rawBody);

    // Only process completed or processing orders
    if (!["processing", "completed"].includes(order.status)) {
      return NextResponse.json({ message: "Order not paid, ignoring." }, { status: 200 });
    }

    const customerEmail = order.billing.email;
    const customerName = `${order.billing.first_name} ${order.billing.last_name}`.trim();
    const customerPhone = order.billing.phone;
    const labName = order.billing.company || `${customerName} Diagnostics`;

    // Extract License Number from Woo Checkout Custom Fields (or use placeholder)
    const licenseMeta = order.meta_data?.find((m: any) => m.key === "lab_license_number");
    const licenseNumber = licenseMeta?.value || `PENDING-${Date.now()}`;

    // Idempotency Check: Did we already process this WooCommerce Order?
    const existingPayment = await prisma.payment.findFirst({
      where: { invoiceNumber: `WOO-${order.id}` }
    });
    if (existingPayment) {
      return NextResponse.json({ message: "Order already processed." }, { status: 200 });
    }

    // 3. Identify the Plan from the WooCommerce Order Items
    // Ensure your WooCommerce Product SKUs perfectly match the Prisma `Plan.name`
    const mainItem = order.line_items[0]; 
    const planSku = mainItem.sku; // e.g., "GROWTH_MONTHLY"

    const plan = await prisma.plan.findUnique({
      where: { name: planSku }
    });

    if (!plan) {
      console.error(`Plan mapping failed. SKU ${planSku} not found in database.`);
      return NextResponse.json({ error: "Plan not found" }, { status: 400 });
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Calculate Subscription End Date based on Prisma Schema Enum
    const startDate = new Date();
    const endDate = plan.billingCycle === "YEARLY" ? addYears(startDate, 1) : addMonths(startDate, 1);

    // 4. THE MASSIVE PROVISIONING TRANSACTION
    await prisma.$transaction(async (tx) => {
      
      // A. Check if User exists, if not, create
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
            onboardingStatus: "REGISTERED"
          },
        });
      }

      // B. Create the Lab Workspace
      const lab = await tx.lab.create({
        data: {
          name: labName,
          email: customerEmail,
          phone: customerPhone,
          labCode: generateLabCode(labName),
          address: order.billing.address_1,
          city: order.billing.city,
          state: order.billing.state,
          pincode: order.billing.postcode,
          licenseNumber: licenseNumber,
          ownerId: user.id,
          isActive: true,
        },
      });

      // C. Create Default Main Branch
      const mainBranch = await tx.branch.create({
        data: {
          labId: lab.id,
          name: "Main Branch",
          branchCode: "01",
          isMainBranch: true,
          address: order.billing.address_1,
          city: order.billing.city,
          state: order.billing.state,
          pincode: order.billing.postcode,
          isActive: true,
        }
      });

      // D. Register Owner as Staff 
      await tx.labStaff.create({
        data: {
          labId: lab.id,
          userId: user.id,
          branchId: mainBranch.id,
          employeeId: `EMP-${Date.now().toString().slice(-6)}`,
          position: "Lab Owner",
          isActive: true,
        }
      });

      // E. Create the Subscription
      const subscription = await tx.subscription.create({
        data: {
          labId: lab.id,
          planId: plan.id,
          status: "ACTIVE",
          startDate: startDate,
          endDate: endDate,
        }
      });

      // F. Initialize Current Usage Tracker (Required by schema)
      await tx.currentUsage.create({
        data: { subscriptionId: subscription.id }
      });

      // G. Record the Payment Ledger
      await tx.payment.create({
        data: {
          subscriptionId: subscription.id,
          amount: parseFloat(order.total),
          currency: order.currency,
          status: "SUCCESS",
          invoiceNumber: `WOO-${order.id}`,
          billingSnapshot: order, // Save full woo-commerce receipt payload
        }
      });
    });

    // 5. Fire Welcome Email with secure Magic Credentials
    await resend.emails.send({
      from: "Patholab Cloud <onboarding@patholab.cloud>", 
      to: customerEmail,
      subject: "Welcome to Patholab Cloud! Your workspace is ready 🚀",
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">Workspace Activated!</h2>
          <p>Hi ${customerName},</p>
          <p>Your subscription to the <strong>${plan.displayName}</strong> is confirmed. Your laboratory workspace (<strong>${labName}</strong>) is fully provisioned.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 10px 0;"><strong>Dashboard URL:</strong> <a href="https://app.patholab.cloud/login" style="color:#059669;">app.patholab.cloud/login</a></p>
            <p style="margin: 0 0 10px 0;"><strong>Login Email:</strong> ${customerEmail}</p>
            <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${tempPassword}</code></p>
          </div>

          <p style="color: #64748b; font-size: 13px;"><em>For security, please change your password from the Settings menu upon your first login.</em></p>
        </div>
      `,
    });

    console.log(`[WEBHOOK SUCCESS] Provisioned ${labName} for ${customerEmail}`);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error("[WEBHOOK FATAL ERROR]:", error);
    return NextResponse.json({ error: "Provisioning failed" }, { status: 500 });
  }
}