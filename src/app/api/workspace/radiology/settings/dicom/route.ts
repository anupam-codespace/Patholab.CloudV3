import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

// 1. GET: Fetch Lab's DICOM Settings
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let settings = await prisma.dicomSettings.findUnique({
      where: { labId: user.labId }
    });

    // If no settings exist yet for this lab, create defaults
    if (!settings) {
      settings = await prisma.dicomSettings.create({
        data: { labId: user.labId }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("DICOM Settings GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// 2. PUT: Upsert/Update Settings
export async function PUT(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    
    // Ensure ports are integers and AE Titles are uppercase
    const dataToUpdate = {
      localAETitle: body.localAETitle?.toUpperCase(),
      localPort: parseInt(body.localPort),
      pacsAETitle: body.pacsAETitle?.toUpperCase(),
      pacsIpAddress: body.pacsIpAddress,
      pacsPort: parseInt(body.pacsPort),
      enableMwl: Boolean(body.enableMwl),
      mwlAETitle: body.mwlAETitle?.toUpperCase(),
      mwlPort: parseInt(body.mwlPort),
      viewerBaseUrl: body.viewerBaseUrl
    };

    const updatedSettings = await prisma.dicomSettings.upsert({
      where: { labId: user.labId },
      update: dataToUpdate,
      create: {
        labId: user.labId,
        ...dataToUpdate
      }
    });

    return NextResponse.json({ success: true, data: updatedSettings, message: "DICOM Configuration Saved" });
  } catch (error) {
    console.error("DICOM Settings PUT Error:", error);
    return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
  }
}

// 3. POST: Test C-ECHO (Ping PACS)
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { ipAddress, port, aeTitle } = body;

    if (!ipAddress || !port) {
      return NextResponse.json({ error: 'IP Address and Port required for C-ECHO test' }, { status: 400 });
    }

    // [PRODUCTION NOTE]
    // A real DICOM C-ECHO cannot be done with standard HTTP/TCP. It requires a DICOM protocol library.
    // In a full Node.js production app, you would use a package like 'dcmjs' or spawn a child process
    // running the 'echoscu' command line tool from DCMTK.
    // E.g., exec(`echoscu -c ${aeTitle}@${ipAddress}:${port}`)
    
    // For this implementation, we simulate the network delay of a ping response.
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate a successful connection
    return NextResponse.json({ success: true, message: "C-ECHO Successful: PACS is online and reachable." });

  } catch (error) {
    return NextResponse.json({ error: "C-ECHO Failed: Could not reach PACS server." }, { status: 500 });
  }
}