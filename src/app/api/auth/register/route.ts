import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendOTPEmail } from "@/lib/mail";

// Helper to generate a 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, phone, labName } = body;

    // 1. Validate all required fields
    if (!name || !email || !password || !phone || !labName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. Normalize the email to prevent case-sensitivity mismatches
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const hashedPassword = await bcrypt.hash(password, 12);
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 minutes

    // ============================================================================
    // SCENARIO A: Existing User (Edge Case: Never Verified)
    // ============================================================================
    if (existingUser) {
      if (existingUser.emailVerified) {
        return NextResponse.json({ error: "Email is already registered. Please log in." }, { status: 400 });
      } else {
        // User exists but NEVER VERIFIED. Update credentials, lab info, and resend OTP.
        await prisma.$transaction(async (tx) => {
          // Update User
          await tx.user.update({
            where: { email: normalizedEmail },
            data: { name, password: hashedPassword, phone },
          });

          // Upsert Lab (In case they changed the lab name on their second attempt)
          const lab = await tx.lab.upsert({
            where: { ownerId: existingUser.id },
            update: { name: labName, phone },
            create: {
              name: labName,
              phone,
              email: normalizedEmail,
              ownerId: existingUser.id,
              isActive: true,
            }
          });

          // Ensure Wallet Exists (Self-Healing)
          await tx.labWallet.upsert({
            where: { labId: lab.id },
            update: {},
            create: {
              labId: lab.id,
              balance: 0,
              validityEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
              isActive: true,
            }
          });

          // Refresh OTP
          await tx.oTP.upsert({
            where: { userId: existingUser.id },
            update: { code: otpCode, expiresAt, type: "EMAIL_VERIFICATION" },
            create: { userId: existingUser.id, code: otpCode, expiresAt, type: "EMAIL_VERIFICATION" },
          });
        });

        // Send Email
        const { success, error } = await sendOTPEmail(normalizedEmail, otpCode, name);

        if (!success) {
          console.error("Email API Error:", error);
          return NextResponse.json({ 
            success: true, 
            warning: "Account updated, but OTP email failed to send.",
          }, { status: 200 });
        }

        return NextResponse.json({ 
          success: true, 
          message: "Verification email resent! Please check your inbox for the new OTP." 
        }, { status: 200 });
      }
    }

    // ============================================================================
    // SCENARIO B: Brand New User
    // ============================================================================
    await prisma.$transaction(async (tx) => {
      // 1. Create the User
      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          password: hashedPassword,
          phone,
          emailVerified: false,
          onboardingStatus: "REGISTERED", 
        },
      });

      // 2. Create the Lab tied to this owner
      const lab = await tx.lab.create({
        data: {
          name: labName,
          phone,
          email: normalizedEmail,
          ownerId: user.id,
          isActive: true,
        }
      });

      // 3. Create the Wallet for this Lab instantly (Zero Balance)
      await tx.labWallet.create({
        data: {
          labId: lab.id,
          balance: 0,
          validityEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          isActive: true,
        }
      });

      // 4. Create the Verification OTP
      await tx.oTP.create({
        data: {
          userId: user.id,
          code: otpCode,
          expiresAt,
          type: "EMAIL_VERIFICATION",
        },
      });
    });

    // Send the Welcome OTP Email
    const { success, error } = await sendOTPEmail(normalizedEmail, otpCode, name);

    if (!success) {
      console.error("Email API Error:", error);
      return NextResponse.json({ 
        success: true, 
        warning: "User registered, but OTP email failed to send.",
      }, { status: 201 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Registration successful! Please check your email for the verification code." 
    }, { status: 201 });

  } catch (error: any) {
    console.error("Registration Server Error:", error);
    // Specifically catch Prisma unique constraint errors just in case
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "An account with these details already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}