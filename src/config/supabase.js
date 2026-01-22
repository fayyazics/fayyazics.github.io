import { createClient } from '@supabase/supabase-js';

// Replace these with your Supabase credentials from .env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Supabase storage helpers
export const getPartyData = async (partyId) => {
  const { data, error } = await supabase
    .from('game_parties')
    .select('party_data')
    .eq('id', partyId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching party:', error);
    return null;
  }
  
  return data ? data.party_data : null;
};

export const setPartyData = async (partyId, partyData) => {
  const { error } = await supabase
    .from('game_parties')
    .upsert({
      id: partyId,
      party_data: partyData,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    });
  
  if (error) {
    console.error('Error saving party:', error);
    throw error;
  }
};

export const deleteParty = async (partyId) => {
  const { error } = await supabase
    .from('game_parties')
    .delete()
    .eq('id', partyId);
  
  if (error) {
    console.error('Error deleting party:', error);
  }
};
