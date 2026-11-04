import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

// The team portal opens at #team or #admin. It keeps its own session, so a team
// login can never replace a member's anonymous account in the same browser.
export const isTeamRoute = ['#team', '#admin'].includes(window.location.hash);

export const supabase = isConfigured
  ? createClient(url, key, {
      auth: {
        storageKey: `naa-samasthanam:${isTeamRoute ? 'team-session' : 'session'}`,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

const messages = {
  alias_taken: 'Someone in the circle already uses that alias. Try another.',
  alias_reserved: 'That name is reserved.',
  alias_invalid: 'That alias doesn’t fit the rules above.',
  not_accepting: 'She isn’t accepting new messages right now.',
  already_requested: 'You’ve already reached out to her.',
  not_allowed: 'That isn’t possible right now.',
  already_reported: 'You’ve already reported this comment.',
  already_appealed: 'Your appeal is already with the team.',
};

export function friendlyError(error) {
  const code = Object.keys(messages).find((item) => error?.message?.includes(item));
  return code ? messages[code] : 'Something went wrong. Check your connection and try again.';
}

// Null when there's no account on this device, or it never chose an alias.
export async function fetchProfile() {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

// Creates the anonymous account on first use: no email, no phone, no real name.
export async function claimMember(alias, reasons) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error(friendlyError(error));
  }
  const { data, error } = await supabase.rpc('claim_alias', { p_alias: alias, p_reasons: reasons });
  if (error) throw new Error(friendlyError(error));
  return data;
}

export async function updateProfile(id, change) {
  const { data, error } = await supabase
    .from('profiles')
    .update(change)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(friendlyError(error));
  return data;
}

export async function recordStrike() {
  const { data, error } = await supabase.rpc('record_strike');
  if (error) throw new Error(friendlyError(error));
  return data;
}

export const signOutLocally = () => supabase.auth.signOut({ scope: 'local' });
