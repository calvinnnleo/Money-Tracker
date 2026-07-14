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

export async function addTransaction({ date, type, category, amount, note }) {
  const { error } = await client()
    .from("transactions")
    .insert([{ date, type, category, amount, note }]);
    
  if (error) throw error;
}

export async function getAllTransactions() {
  const { data, error } = await client()
    .from("transactions")
    .select("date, type, category, amount, note, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  // Return array of arrays matching sheets layout [date, type, category, amount, note, created_at]
  return (data || []).map((t) => [
    t.date,
    t.type,
    t.category,
    t.amount,
    t.note || "",
    t.created_at
  ]);
}

export async function getBudgets() {
  const { data, error } = await client()
    .from("budgets")
    .select("category, budget");

  if (error) throw error;
  return (data || []).map((b) => ({
    category: b.category,
    budget: Number(b.budget) || 0,
  }));
}

export async function getLastTransaction() {
  const { data, error } = await client()
    .from("transactions")
    .select("id, date, type, category, amount, note, created_at")
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

export async function deleteLastTransaction() {
  const last = await getLastTransaction();
  if (!last) return null;

  const { error } = await client()
    .from("transactions")
    .delete()
    .eq("id", last.id);

  if (error) throw error;
  return last;
}

export async function setBudget(category, amount) {
  // Upsert on category
  const { error } = await client()
    .from("budgets")
    .upsert(
      { category, budget: amount },
      { onConflict: "category" }
    );

  if (error) throw error;
}

export async function deleteBudget(category) {
  const { error } = await client()
    .from("budgets")
    .delete()
    .eq("category", category);

  if (error) throw error;
}

export async function getBudgetStatus() {
  const budgets = await getBudgets();
  // Get raw transactions to calculate monthly status
  const { data: transactions, error } = await client()
    .from("transactions")
    .select("date, type, category, amount");

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
