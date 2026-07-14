import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

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

// Transaction Helpers
export async function getDbTransactions() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("transactions")
    .select("date, type, category, amount, note, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transactions from Supabase:", error.message);
    throw error;
  }
  return data || [];
}

export async function addDbTransaction({ date, type, category, amount, note }) {
  if (!supabase) return;
  const { error } = await supabase
    .from("transactions")
    .insert([{ date, type, category, amount, note }]);

  if (error) {
    console.error("Error adding transaction to Supabase:", error.message);
    throw error;
  }
}

// Budget Helpers
export async function getDbBudgets() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("budgets")
    .select("category, budget");

  if (error) {
    console.error("Error fetching budgets from Supabase:", error.message);
    throw error;
  }
  return data || [];
}

export async function saveDbBudget(category, budget) {
  if (!supabase) return;
  const { error } = await supabase
    .from("budgets")
    .upsert({ category, budget }, { onConflict: "category" });

  if (error) {
    console.error("Error saving budget to Supabase:", error.message);
    throw error;
  }
}

export async function deleteDbBudget(category) {
  if (!supabase) return;
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("category", category);

  if (error) {
    console.error("Error deleting budget from Supabase:", error.message);
    throw error;
  }
}
