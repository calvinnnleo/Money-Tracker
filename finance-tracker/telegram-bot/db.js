import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

if (url && key) {
  supabase = createClient(url, key);
} else {
  console.warn("⚠️ Kredensial Supabase tidak lengkap di .env. Program bot berjalan dengan database kosong.");
}

function client() {
  if (!supabase) {
    throw new Error("Supabase client belum dikonfigurasi. Hubungkan database di .env.");
  }
  return supabase;
}

export async function addTransaction(userId, { date, type, category, amount, note }) {
  const { error } = await client()
    .from("transactions")
    .insert([{ user_id: userId, date, type, category, amount, note }]);
    
  if (error) throw error;
}

export async function getAllTransactions(userId) {
  const { data, error } = await client()
    .from("transactions")
    .select("date, type, category, amount, note, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map((t) => [
    t.date,
    t.type,
    t.category,
    t.amount,
    t.note || "",
    t.created_at
  ]);
}

export async function getBudgets(userId) {
  const { data, error } = await client()
    .from("budgets")
    .select("category, budget")
    .eq("user_id", userId);

  if (error) throw error;
  return (data || []).map((b) => ({
    category: b.category,
    budget: Number(b.budget) || 0,
  }));
}

export async function getLastTransaction(userId) {
  const { data, error } = await client()
    .from("transactions")
    .select("id, date, type, category, amount, note, created_at")
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(1);

  if (error) throw error;
  if (!data || data.length === 0) return null;
  const last = data[0];
  return {
    id: last.id,
    date: last.date,
    type: last.type,
    category: last.category,
    amount: Number(last.amount) || 0,
    note: last.note || "",
    timestamp: last.created_at,
  };
}

export async function deleteLastTransaction(userId) {
  const last = await getLastTransaction(userId);
  if (!last) return null;

  const { error } = await client()
    .from("transactions")
    .delete()
    .eq("id", last.id);

  if (error) throw error;
  return last;
}

export async function setBudget(userId, category, amount) {
  const { error } = await client()
    .from("budgets")
    .upsert(
      { user_id: userId, category, budget: amount },
      { onConflict: "user_id, category" }
    );

  if (error) throw error;
}

export async function deleteBudget(userId, category) {
  const { error } = await client()
    .from("budgets")
    .delete()
    .eq("user_id", userId)
    .eq("category", category);

  if (error) throw error;
}

export async function getBudgetStatus(userId) {
  const budgets = await getBudgets(userId);
  const { data: transactions, error } = await client()
    .from("transactions")
    .select("date, type, category, amount")
    .eq("user_id", userId);

  if (error) throw error;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const spentMap = {};
  let totalSpent = 0;

  for (const t of (transactions || [])) {
    if (!t.date || !t.date.startsWith(thisMonth)) continue;
    if (t.type !== "Expense") continue;

    const amt = Number(t.amount) || 0;
    spentMap[t.category] = (spentMap[t.category] || 0) + amt;
    totalSpent += amt;
  }

  const status = budgets.map((b) => {
    const spent = spentMap[b.category] || 0;
    const percentage = b.budget ? (spent / b.budget) * 100 : 0;
    return {
      category: b.category,
      budget: b.budget,
      spent,
      percentage,
    };
  });

  for (const [cat, spent] of Object.entries(spentMap)) {
    if (!budgets.some((b) => b.category.toLowerCase() === cat.toLowerCase())) {
      status.push({
        category: cat,
        budget: 0,
        spent,
        percentage: 0,
      });
    }
  }

  return {
    thisMonth,
    totalSpent,
    status: status.sort((a, b) => b.spent - a.spent),
  };
}

// Telegram OTP Linking Helpers
export async function createLinkCode(telegramId, telegramName) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Deactivate any old active codes for this telegram id
  await client()
    .from("telegram_link_codes")
    .update({ used: true })
    .eq("telegram_id", telegramId);

  const { error } = await client()
    .from("telegram_link_codes")
    .insert([{ code, telegram_id: telegramId, telegram_name: telegramName }]);

  if (error) throw error;
  return code;
}

export async function getUserIdByTelegramId(telegramId) {
  const { data, error } = await client()
    .from("profiles")
    .select("id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) {
    console.error("❌ Gagal getUserIdByTelegramId:", error.message);
    return null;
  }
  return data ? data.id : null;
}

export async function getTransactionsByCategory(userId, category) {
  const { data, error } = await client()
    .from("transactions")
    .select("date, type, category, amount, note, created_at")
    .eq("user_id", userId)
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}

export async function getTransactionsForExport(userId) {
  const { data, error } = await client()
    .from("transactions")
    .select("date, type, category, amount, note")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getProfileInfo(userId) {
  const { data, error } = await client()
    .from("profiles")
    .select("display_name, telegram_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getRecentTransactions(userId, limit = 5) {
  const { data, error } = await client()
    .from("transactions")
    .select("id, date, type, category, amount, note, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function deleteTransactionById(userId, transactionId) {
  const { error } = await client()
    .from("transactions")
    .delete()
    .eq("user_id", userId)
    .eq("id", transactionId);

  if (error) throw error;
}

