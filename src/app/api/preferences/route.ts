import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const {
      peopleCount,
      mealsPerDay,
      budgetChf,
      dietaryRestrictions,
      cuisinePreferences,
      cookingSkillLevel
    } = body

    if (!peopleCount || !mealsPerDay || !cookingSkillLevel) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate data types and ranges
    if (typeof peopleCount !== 'number' || peopleCount < 1 || peopleCount > 8) {
      return NextResponse.json(
        { error: 'People count must be between 1 and 8' },
        { status: 400 }
      )
    }

    if (typeof mealsPerDay !== 'number' || mealsPerDay < 1 || mealsPerDay > 3) {
      return NextResponse.json(
        { error: 'Meals per day must be between 1 and 3' },
        { status: 400 }
      )
    }

    if (budgetChf && (typeof budgetChf !== 'number' || budgetChf < 0)) {
      return NextResponse.json(
        { error: 'Budget must be a positive number' },
        { status: 400 }
      )
    }

    if (!['beginner', 'intermediate', 'advanced'].includes(cookingSkillLevel)) {
      return NextResponse.json(
        { error: 'Invalid cooking skill level' },
        { status: 400 }
      )
    }

    // Save preferences to database
    const preferences = await db.userPreferences.create({
      data: {
        peopleCount,
        mealsPerDay,
        budgetChf,
        dietaryRestrictions: dietaryRestrictions || [],
        cuisinePreferences: cuisinePreferences || [],
        cookingSkillLevel
      }
    })

    return NextResponse.json({ 
      success: true, 
      preferences: {
        id: preferences.id,
        peopleCount: preferences.peopleCount,
        mealsPerDay: preferences.mealsPerDay,
        budgetChf: preferences.budgetChf,
        dietaryRestrictions: preferences.dietaryRestrictions,
        cuisinePreferences: preferences.cuisinePreferences,
        cookingSkillLevel: preferences.cookingSkillLevel
      },
      message: 'Preferences saved successfully' 
    })

  } catch (error) {
    console.error('Error saving preferences:', error)
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get the most recent preferences
    const preferences = await db.userPreferences.findFirst({
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!preferences) {
      return NextResponse.json(
        { error: 'No preferences found' },
        { status: 404 }
      )
    }

    return NextResponse.json(preferences)

  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}