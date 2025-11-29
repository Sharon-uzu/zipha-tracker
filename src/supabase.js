import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wgfidvtzcblzcnstkyae.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZmlkdnR6Y2JsemNuc3RreWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTg4MjcwODUsImV4cCI6MjAxNDQwMzA4NX0.EIuY79aR1zwOC0hL4C5obxBcRn0VuNdVoEa-5J907zo'
export const supabase = createClient(supabaseUrl, supabaseKey)


/**
 * Update a trade by its id in Supabase
 * @param {string} tradeId - id of the trade
 * @param {object} updatedTrade - object with updated fields
 * @returns updated trade record
 */
export async function updateTradeInSupabase(tradeId, updatedTrade) {
    const { data, error } = await supabase
        .from('zipha-tracker')  
        .update(updatedTrade)
        .eq('id', tradeId)
        .select(); 

    if (error) {
        throw error;
    }
    return data[0];
}
