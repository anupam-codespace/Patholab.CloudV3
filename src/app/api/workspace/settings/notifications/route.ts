import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";
import { nowIST } from "@/lib/timezone";

export const dynamic = "force-dynamic";

// ============================================================================
// GET: Return WhatsApp / SMS / SMTP notification settings for the lab
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lab = await prisma.lab.findUnique({
      where: { id: user.labId },
      select: {
        id: true,
        name: true,
        whatsappApiKey: true,
        whatsappPhoneId: true,
        smsApiKey: true,
        smsSenderId: true,
        email: true,
        phone: true,
      },
    });

    if (!lab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 });
    }

    // Mask sensitive keys for display (show last 4 chars only)
    const mask = (val: string | null | undefined) => {
      if (!val) return "";
      if (val.length <= 6) return "•".repeat(val.length);
      return "•".repeat(val.length - 4) + val.slice(-4);
    };

    // Pull SMTP config from the global SystemConfig table
    const sysConfig = await prisma.systemConfig.findFirst({
      select: {
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        systemEmail: true,
      },
    });

    return NextResponse.json({
      whatsapp: {
        apiKey: mask(lab.whatsappApiKey),
        phoneId: lab.whatsappPhoneId || "",
        configured: !!lab.whatsappApiKey,
      },
      sms: {
        apiKey: mask(lab.smsApiKey),
        senderId: lab.smsSenderId || "",
        configured: !!lab.smsApiKey,
      },
      smtp: {
        host: sysConfig?.smtpHost || "",
        port: sysConfig?.smtpPort || 587,
        user: sysConfig?.smtpUser || "",
        from: sysConfig?.systemEmail || lab.email,
        configured: !!sysConfig?.smtpHost,
      },
      email: lab.email,
      phone: lab.phone,
    });
  } catch (error: any) {
    console.error("[NOTIFICATIONS_SETTINGS_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT: Update WhatsApp / SMS / SMTP notification settings (lab owner only)
// ============================================================================
export async function PUT(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      user.role !== "LAB_OWNER" &&
      user.role !== "SUPER_ADMIN" &&
      user.role !== "LAB_MANAGER"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      whatsappApiKey,
      whatsappPhoneId,
      smsApiKey,
      smsSenderId,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpFrom,
    } = body || {};

    // Only overwrite fields that the user actually submitted (skip blanks so we
    // don't accidentally wipe a stored secret when the masked placeholder is sent back).
    const patch: any = {};
    if (whatsappApiKey && !whatsappApiKey.startsWith("•")) {
      patch.whatsappApiKey = whatsappApiKey.trim();
    }
    if (whatsappPhoneId !== undefined) {
      patch.whatsappPhoneId = whatsappPhoneId?.trim() || null;
    }
    if (smsApiKey && !smsApiKey.startsWith("•")) {
      patch.smsApiKey = smsApiKey.trim();
    }
    if (smsSenderId !== undefined) {
      patch.smsSenderId = smsSenderId?.trim() || null;
    }

    const updatedLab = await prisma.lab.update({
      where: { id: user.labId },
      data: patch,
    });

    // SMTP — these live on the global SystemConfig (single row).
    if (
      smtpHost !== undefined ||
      smtpPort !== undefined ||
      smtpUser !== undefined ||
      smtpPassword !== undefined ||
      smtpFrom !== undefined
    ) {
      const sysConfig = await prisma.systemConfig.findFirst();
      if (sysConfig) {
        const sysPatch: any = {};
        if (smtpHost !== undefined) sysPatch.smtpHost = smtpHost?.trim() || null;
        if (smtpPort !== undefined)
          sysPatch.smtpPort = smtpPort ? Number(smtpPort) : null;
        if (smtpUser !== undefined) sysPatch.smtpUser = smtpUser?.trim() || null;
        if (smtpPassword && !smtpPassword.startsWith("•")) {
          sysPatch.smtpPassword = smtpPassword;
        }
        if (smtpFrom !== undefined) sysPatch.systemEmail = smtpFrom?.trim() || null;
        await prisma.systemConfig.update({
          where: { id: sysConfig.id },
          data: sysPatch,
        });
      }
    }

    // Activity log entry
    await prisma.activityLog.create({
      data: {
        labId: user.labId,
        userId: user.userId,
        action: "NOTIFICATIONS_SETTINGS_UPDATED",
        entity: "Lab",
        entityId: user.labId,
        entityType: "LAB",
        description: "Updated WhatsApp/SMS/SMTP notification settings",
        details: JSON.stringify({
          whatsapp: !!patch.whatsappApiKey,
          sms: !!patch.smsApiKey,
          smtp: !!smtpHost,
          at: nowIST().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Notification settings saved successfully",
      lab: {
        whatsappConfigured: !!updatedLab.whatsappApiKey,
        smsConfigured: !!updatedLab.smsApiKey,
      },
    });
  } catch (error: any) {
    console.error("[NOTIFICATIONS_SETTINGS_PUT]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: Send a test notification (WhatsApp / SMS / Email)
// Body: { channel: "WHATSAPP" | "SMS" | "EMAIL", to: string, message?: string }
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { channel, to, message } = body || {};

    if (!channel || !to) {
      return NextResponse.json(
        { error: "channel and to are required" },
        { status: 400 }
      );
    }

    const lab = await prisma.lab.findUnique({
      where: { id: user.labId },
      select: {
        name: true,
        whatsappApiKey: true,
        whatsappPhoneId: true,
        smsApiKey: true,
        smsSenderId: true,
        email: true,
      },
    });

    if (!lab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 });
    }

    const testMessage =
      message ||
      `Test notification from ${lab.name} — your channel is correctly configured.`;

    if (channel === "WHATSAPP") {
      if (!lab.whatsappApiKey || !lab.whatsappPhoneId) {
        return NextResponse.json(
          { error: "WhatsApp API key / Phone ID not configured" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        channel: "WHATSAPP",
        to,
        message: "WhatsApp test message queued (sandbox stub).",
        sentAt: nowIST().toISOString(),
      });
    }

    if (channel === "SMS") {
      if (!lab.smsApiKey) {
        return NextResponse.json(
          { error: "SMS API key not configured" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        channel: "SMS",
        to,
        senderId: lab.smsSenderId || "PATHLB",
        message: "SMS test message queued (sandbox stub).",
        sentAt: nowIST().toISOString(),
      });
    }

    if (channel === "EMAIL") {
      return NextResponse.json({
        success: true,
        channel: "EMAIL",
        to,
        message: "Email test message queued (sandbox stub).",
        sentAt: nowIST().toISOString(),
      });
    }

    return NextResponse.json(
      { error: "Invalid channel. Use WHATSAPP | SMS | EMAIL." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[NOTIFICATIONS_TEST_SEND]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
