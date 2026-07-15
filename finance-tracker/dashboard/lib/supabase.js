import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;

if (url && key && url.startsWith("http")) {
  try {
    supabase = createClient(url, key);
  } catch (err) {
    console.error("⚠️ Gagal inisialisasi Supabase client:", err.message);
  }
}

export function getSupabaseClient() {
  return supabase;
}

export function hasSupabaseConfig() {
  return (
    supabase !== null &&
    url && 
    key && 
    url !== "PlaceholderUrlHere" && 
    key !== "PlaceholderKeyHere"
  );
}

// Profile Helpers
export async function getDbProfile(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, telegram_id")
    .eq("id", userId)
    .single();

  if (error) {
    console.warn("Gagal fetch profile dari database:", error.message);
    return null;
  }
  return data;
}

export async function updateDbProfile(userId, displayName) {
  if (!supabase) return;
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", userId);

  if (error) {
    console.error("Gagal update profile di Supabase:", error.message);
    throw error;
  }
}

// Transaction Helpers
export async function getDbTransactions(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("transactions")
    .select("id, date, type, category, amount, note, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transactions from Supabase:", error.message);
    throw error;
  }
  return data || [];
}

export async function addDbTransaction(userId, { date, type, category, amount, note }) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("transactions")
    .insert([{ user_id: userId, date, type, category, amount, note }])
    .select()
    .single();

  if (error) {
    console.error("Error adding transaction to Supabase:", error.message);
    throw error;
  }
  return data;
}

export async function deleteDbTransaction(userId, transactionId) {
  if (!supabase) return;
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("user_id", userId)
    .eq("id", transactionId);

  if (error) {
    console.error("Error deleting transaction from Supabase:", error.message);
    throw error;
  }
}

// Budget Helpers
export async function getDbBudgets(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("budgets")
    .select("category, budget")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching budgets from Supabase:", error.message);
    throw error;
  }
  return data || [];
}

export async function saveDbBudget(userId, category, budget) {
  if (!supabase) return;
  const { error } = await supabase
    .from("budgets")
    .upsert({ user_id: userId, category, budget }, { onConflict: "user_id, category" });

  if (error) {
    console.error("Error saving budget to Supabase:", error.message);
    throw error;
  }
}

export async function deleteDbBudget(userId, category) {
  if (!supabase) return;
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("user_id", userId)
    .eq("category", category);

  if (error) {
    console.error("Error deleting budget from Supabase:", error.message);
    throw error;
  }
}
