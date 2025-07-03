import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const preferences = await db.userPreferences.findMany({
      select: {
        id: true,
        peopleCount: true,
        mealsPerDay: true,
        budgetChf: true,
        dietaryRestrictions: true,
        cuisinePreferences: true,
        cookingSkillLevel: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      preferences,
      count: preferences.length
    })

  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch preferences',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}