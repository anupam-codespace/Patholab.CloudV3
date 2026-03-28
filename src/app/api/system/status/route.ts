import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import os from 'os';

export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET() {
  try {
    // 1. Check DB Connection
    // We run a simple query to ensure the database is actually reachable
    await prisma.$queryRaw`SELECT 1`;
    const dbStatus = 'Connected';

    // 2. Get Server Info
    const hostname = os.hostname();
    
    // 3. Get DB Name (Safe parsing from ENV)
    const dbUrl = process.env.DATABASE_URL || '';
    const dbName = dbUrl.split('/').pop()?.split('?')[0] || 'patholab';

    // 4. Return the JSON
    return NextResponse.json({
      status: 'online',
      dbStatus,
      dbName,
      server: hostname,
    });

  } catch (error) {
    console.error("System Status Error:", error);
    // Even if it fails, return JSON (not HTML) so the sidebar doesn't crash
    return NextResponse.json({ 
      status: 'issue', 
      dbStatus: 'Disconnected',
      dbName: 'Error',
      server: 'Unknown'
    }, { status: 500 });
  }
}