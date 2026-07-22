'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export interface CategoryVoltages {
  val_plus_5: number;
  val_plus_15: number;
  val_minus_15: number;
}

export interface SaveDailyReadingsInput {
  date: string;
  tx1?: CategoryVoltages;
  tx2?: CategoryVoltages;
  allowOverwrite?: boolean;
}

export interface ReadingInput {
  date: string;
  category: 'TX1' | 'TX2';
  val_plus_5: number;
  val_plus_15: number;
  val_minus_15: number;
}

export interface ReadingRecord {
  id: string;
  date: string;
  category: 'TX1' | 'TX2';
  val_plus_5: number;
  val_plus_15: number;
  val_minus_15: number;
  created_at: string;
}

/**
 * Saves power supply readings for TX1 and/or TX2 together for a specific date.
 */
export async function saveDailyReadings(data: SaveDailyReadingsInput) {
  try {
    if (!data.date) {
      return { success: false, error: 'Date is required.' };
    }

    const dateParsed = new Date(data.date);
    if (isNaN(dateParsed.getTime())) {
      return { success: false, error: 'Invalid date value.' };
    }

    const formattedDate = dateParsed.toISOString().split('T')[0];

    if (!data.tx1 && !data.tx2) {
      return { success: false, error: 'Please fill in voltage values for at least TX1 or TX2.' };
    }

    // Check for duplicate date entries if allowOverwrite is not true
    if (!data.allowOverwrite) {
      const { data: existing } = await supabase
        .from('readings')
        .select('id')
        .eq('date', formattedDate);

      if (existing && existing.length > 0) {
        return {
          success: false,
          error: `Data for date ${formattedDate.replace(/-/g, '/')} already exists. Duplicate date entries are not allowed. You can edit existing logs from Telemetry History.`,
        };
      }
    }

    const recordsToUpsert: Array<{
      date: string;
      category: 'TX1' | 'TX2';
      val_plus_5: number;
      val_plus_15: number;
      val_minus_15: number;
    }> = [];

    if (data.tx1) {
      const v5 = Number(data.tx1.val_plus_5);
      const v15 = Number(data.tx1.val_plus_15);
      const vNeg15 = Number(data.tx1.val_minus_15);

      if (isNaN(v5) || isNaN(v15) || isNaN(vNeg15)) {
        return { success: false, error: 'All TX1 voltage values must be valid numbers.' };
      }

      recordsToUpsert.push({
        date: formattedDate,
        category: 'TX1',
        val_plus_5: parseFloat(v5.toFixed(2)),
        val_plus_15: parseFloat(v15.toFixed(2)),
        val_minus_15: parseFloat(vNeg15.toFixed(2)),
      });
    }

    if (data.tx2) {
      const v5 = Number(data.tx2.val_plus_5);
      const v15 = Number(data.tx2.val_plus_15);
      const vNeg15 = Number(data.tx2.val_minus_15);

      if (isNaN(v5) || isNaN(v15) || isNaN(vNeg15)) {
        return { success: false, error: 'All TX2 voltage values must be valid numbers.' };
      }

      recordsToUpsert.push({
        date: formattedDate,
        category: 'TX2',
        val_plus_5: parseFloat(v5.toFixed(2)),
        val_plus_15: parseFloat(v15.toFixed(2)),
        val_minus_15: parseFloat(vNeg15.toFixed(2)),
      });
    }

    const { error } = await supabase
      .from('readings')
      .upsert(recordsToUpsert, { onConflict: 'date,category' });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/display');

    return { success: true };
  } catch (err: any) {
    return { 
      success: false, 
      error: err?.message || 'An unexpected error occurred while saving readings.' 
    };
  }
}

/**
 * Single reading insertion helper for backwards compatibility.
 */
export async function addReading(data: ReadingInput) {
  return saveDailyReadings({
    date: data.date,
    tx1: data.category === 'TX1' ? { val_plus_5: data.val_plus_5, val_plus_15: data.val_plus_15, val_minus_15: data.val_minus_15 } : undefined,
    tx2: data.category === 'TX2' ? { val_plus_5: data.val_plus_5, val_plus_15: data.val_plus_15, val_minus_15: data.val_minus_15 } : undefined,
  });
}

/**
 * Deletes readings for a specific date and optional category.
 */
export async function deleteDailyReading(date: string, category?: 'TX1' | 'TX2') {
  try {
    const formattedDate = date.replace(/\//g, '-');
    let query = supabase.from('readings').delete().eq('date', formattedDate);
    if (category) {
      query = query.eq('category', category);
    }
    const { data, error } = await query.select();
    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Deletion affected 0 rows. Please verify DELETE permissions/RLS policies in Supabase.'
      };
    }

    revalidatePath('/');
    revalidatePath('/display');
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to delete record.'
    };
  }
}

/**
 * Fetches all daily power supply readings, bypassing Supabase 1,000 row limits automatically.
 */
export async function getReadings() {
  try {
    const chunkSize = 1000;
    
    // Fetch initial chunk and exact total row count
    const { data, error, count } = await supabase
      .from('readings')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .range(0, chunkSize - 1);

    if (error) {
      return { success: false, error: error.message, data: [] as ReadingRecord[] };
    }

    let allRecords: ReadingRecord[] = (data || []) as ReadingRecord[];

    // If total rows in database exceed 1,000 limit, fetch remaining chunks in parallel
    if (count && count > allRecords.length) {
      const promises = [];
      for (let offset = chunkSize; offset < count; offset += chunkSize) {
        promises.push(
          supabase
            .from('readings')
            .select('*')
            .order('date', { ascending: false })
            .range(offset, offset + chunkSize - 1)
        );
      }

      const results = await Promise.all(promises);
      for (const res of results) {
        if (res.data) {
          allRecords = allRecords.concat(res.data as ReadingRecord[]);
        }
      }
    }

    return { success: true, data: allRecords };
  } catch (err: any) {
    return { 
      success: false, 
      error: err?.message || 'An unexpected error occurred while fetching readings.', 
      data: [] as ReadingRecord[] 
    };
  }
}
