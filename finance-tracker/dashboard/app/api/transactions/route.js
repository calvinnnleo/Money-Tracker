export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getDbTransactions, getDbBudgets, addDbTransaction, hasSupabaseConfig } from "../../../lib/supabase";

async function getAuthUser(cookieStore) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

const DUMMY_DATA = {
  transactions: [
    { date: `${new Date().toISOString().slice(0, 7)}-01`, type: "Income", category: "Gaji", amount: 5000000, note: "Gaji Utama Bulanan" },
    { date: `${new Date().toISOString().slice(0, 7)}-01`, type: "Expense", category: "Tagihan", amount: 350000, note: "Tagihan Wifi Indihome" },
    { date: `${new Date().toISOString().slice(0, 7)}-02`, type: "Expense", category: "Makanan", amount: 25000, note: "Kopi Starbuck" },
    { date: `${new Date().toISOString().slice(0, 7)}-02`, type: "Expense", category: "Transportasi", amount: 15000, note: "Grab ke Kampus" },
    { date: `${new Date().toISOString().slice(0, 7)}-03`, type: "Expense", category: "Belanja", amount: 250000, note: "Baju Baru Uniqlo" },
    { date: `${new Date().toISOString().slice(0, 7)}-04`, type: "Expense", category: "Makanan", amount: 85000, note: "Makan Siang Nasi Padang" },
  ],
  budgets: [
    { category: "Makanan", budget: 1500000 },
    { category: "Transportasi", budget: 500000 },
    { category: "Belanja", budget: 1000000 },
    { category: "Tagihan", budget: 800000 },
  ]
};

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(DUMMY_DATA);
  }

  const { user } = await getAuthUser(cookies());
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [transactions, budgets] = await Promise.all([
      getDbTransactions(user.id),
      getDbBudgets(user.id),
    ]);
    return NextResponse.json({ transactions, budgets });
  } catch (err) {
    console.warn("⚠️ Gagal mengambil data dari Supabase API:", err.message);
    return NextResponse.json(DUMMY_DATA);
  }
}

export async function POST(request) {
  const { user } = await getAuthUser(cookies());
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { date, type, category, amount, note } = body;

    if (!date || !type || !category || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (hasSupabaseConfig()) {
      await addDbTransaction(user.id, { date, type, category, amount, note });
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: true, offline: true });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
