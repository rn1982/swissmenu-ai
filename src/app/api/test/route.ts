import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await db.$connect()
    return NextResponse.json({ 
      message: 'Database connected successfully!',
      timestamp: new Date().toISOString()
    })
  } catch {
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    )
  }
}