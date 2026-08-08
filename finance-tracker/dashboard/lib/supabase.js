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

export async function updateDbTransaction(userId, id, { date, type, category, amount, note }) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("transactions")
    .update({ date, type, category, amount, note })
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating transaction in Supabase:", error.message);
    throw error;
  }
  return data;
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

// Wallet Helpers
export async function getDbWallets(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Error fetching wallets:", error.message);
    return [];
  }
  return data || [];
}

export async function addDbWallet(userId, wallet) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("wallets")
    .insert([{ ...wallet, user_id: userId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addDbWalletTransfer(userId, { from_wallet_id, to_wallet_id, amount, note, date }) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("wallet_transfers")
    .insert([{ user_id: userId, from_wallet_id, to_wallet_id, amount, note, date: date || new Date().toISOString().split("T")[0] }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Debt Helpers
export async function getDbDebts(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching debts:", error.message);
    return [];
  }
  return data || [];
}

export async function addDbDebt(userId, debt) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("debts")
    .insert([{ ...debt, user_id: userId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function settleDbDebt(userId, debtId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("debts")
    .update({ settled: true, settled_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", debtId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDbDebt(userId, debtId) {
  if (!supabase) return;
  const { error } = await supabase.from("debts").delete().eq("user_id", userId).eq("id", debtId);
  if (error) throw error;
}

// Recurring Helpers
export async function getDbRecurring(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("recurring_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

export async function addDbRecurring(userId, item) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("recurring_transactions")
    .insert([{ ...item, user_id: userId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleDbRecurring(userId, id, isActive) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("recurring_transactions")
    .update({ is_active: isActive })
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDbRecurring(userId, id) {
  if (!supabase) return;
  const { error } = await supabase.from("recurring_transactions").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

// Savings Goals Helpers
export async function getDbGoals(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

export async function addDbGoal(userId, goal) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("savings_goals")
    .insert([{ ...goal, user_id: userId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addDbGoalContribution(userId, goalId, amount, note) {
  if (!supabase) return null;
  // 1. Add contribution
  const { error: contribError } = await supabase
    .from("goal_contributions")
    .insert([{ goal_id: goalId, user_id: userId, amount, note }]);
  if (contribError) throw contribError;

  // 2. Fetch current goal & increment amount
  const { data: goal } = await supabase.from("savings_goals").select("current_amount, target_amount").eq("id", goalId).single();
  if (goal) {
    const newAmount = (Number(goal.current_amount) || 0) + Number(amount);
    const isCompleted = newAmount >= Number(goal.target_amount);
    const { data: updatedGoal, error: updateError } = await supabase
      .from("savings_goals")
      .update({ current_amount: newAmount, is_completed: isCompleted })
      .eq("id", goalId)
      .select()
      .single();
    if (updateError) throw updateError;
    return updatedGoal;
  }
  return null;
}

export async function deleteDbGoal(userId, goalId) {
  if (!supabase) return;
  const { error } = await supabase.from("savings_goals").delete().eq("user_id", userId).eq("id", goalId);
  if (error) throw error;
}

// Custom Categories Helpers
export async function getDbCategories(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId);
  if (error) return [];
  return data || [];
}

export async function addDbCategory(userId, { name, emoji, color, type }) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("categories")
    .upsert({ user_id: userId, name, emoji: emoji || "🏷️", color: color || "#8E8E93", type: type || "Expense" }, { onConflict: "user_id, name" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDbCategory(userId, categoryId) {
  if (!supabase) return;
  const { error } = await supabase.from("categories").delete().eq("user_id", userId).eq("id", categoryId);
  if (error) throw error;
}
