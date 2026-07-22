'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export interface ReadingInput {
  date: string;
  category: 'TX1' | 'TX2';
  val_plus_5: number;
  val_plus_15: number;
  val_minus_15: number;
}

export interface ReadingRecord extends ReadingInput {
  id: string;
  created_at: string;
}

/**
 * Inserts a new daily power supply reading for a category (TX1 or TX2).
 * Returns success status or error details.
 */
export async function addReading(data: ReadingInput) {
  try {
    // Input validation
    if (!data.date) {
      return { success: false, error: 'Date is required.' };
    }

    const category = data.category === 'TX2' ? 'TX2' : 'TX1';

    const dateParsed = new Date(data.date);
    if (isNaN(dateParsed.getTime())) {
      return { success: false, error: 'Invalid date value.' };
    }

    // Standardize date format to YYYY-MM-DD for PG date type
    const formattedDate = dateParsed.toISOString().split('T')[0];

    const plus5 = Number(data.val_plus_5);
    const plus15 = Number(data.val_plus_15);
    const minus15 = Number(data.val_minus_15);

    if (isNaN(plus5) || isNaN(plus15) || isNaN(minus15)) {
      return { success: false, error: 'All voltage values must be valid numbers.' };
    }

    // Insert to Supabase readings table (forces 2 decimal places rounding at insertion)
    const { error } = await supabase.from('readings').insert({
      date: formattedDate,
      category: category,
      val_plus_5: parseFloat(plus5.toFixed(2)),
      val_plus_15: parseFloat(plus15.toFixed(2)),
      val_minus_15: parseFloat(minus15.toFixed(2)),
    });

    if (error) {
      // 23505 is PostgreSQL's code for unique constraint violation (duplicate key)
      if (error.code === '23505') {
        return { 
          success: false, 
          error: `A power supply reading already exists for category ${category} on date ${formattedDate}.` 
        };
      }
      return { success: false, error: error.message };
    }

    // Clear Next.js cache for page re-renders
    revalidatePath('/');
    revalidatePath('/display');

    return { success: true };
  } catch (err: any) {
    return { 
      success: false, 
      error: err?.message || 'An unexpected error occurred while saving the reading.' 
    };
  }
}

/**
 * Fetches all daily power supply readings.
 */
export async function getReadings() {
  try {
    const { data, error } = await supabase
      .from('readings')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] as ReadingRecord[] };
    }

    return { success: true, data: (data || []) as ReadingRecord[] };
  } catch (err: any) {
    return { 
      success: false, 
      error: err?.message || 'An unexpected error occurred while fetching readings.', 
      data: [] as ReadingRecord[] 
    };
  }
}
