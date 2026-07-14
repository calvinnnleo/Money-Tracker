export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDbTransactions, getDbBudgets, addDbTransaction, hasSupabaseConfig } from "../../../lib/supabase";

// Realistic dummy data for demo/development when credentials are not configured yet
const DUMMY_DATA = {
  transactions: [
    // Current month transactions (dynamically set to current month YYYY-MM)
    { date: `${new Date().toISOString().slice(0, 7)}-01`, type: "Income", category: "Gaji", amount: 5000000, note: "Gaji Utama Bulanan" },
    { date: `${new Date().toISOString().slice(0, 7)}-01`, type: "Expense", category: "Tagihan", amount: 350000, note: "Tagihan Wifi Indihome" },
    { date: `${new Date().toISOString().slice(0, 7)}-02`, type: "Expense", category: "Makanan", amount: 25000, note: "Kopi Starbuck" },
    { date: `${new Date().toISOString().slice(0, 7)}-02`, type: "Expense", category: "Transportasi", amount: 15000, note: "Grab ke Kampus" },
    { date: `${new Date().toISOString().slice(0, 7)}-03`, type: "Expense", category: "Belanja", amount: 250000, note: "Baju Baru Uniqlo" },
    { date: `${new Date().toISOString().slice(0, 7)}-04`, type: "Expense", category: "Makanan", amount: 85000, note: "Makan Siang Nasi Padang" },
    { date: `${new Date().toISOString().slice(0, 7)}-05`, type: "Expense", category: "Hiburan", amount: 550000, note: "Tiket Konser Musik" },
    { date: `${new Date().toISOString().slice(0, 7)}-06`, type: "Expense", category: "Transportasi", amount: 400000, note: "Servis Motor Bulanan" },
    { date: `${new Date().toISOString().slice(0, 7)}-07`, type: "Expense", category: "Makanan", amount: 120000, note: "Jajan Kopi & Snack Rapat" },
    { date: `${new Date().toISOString().slice(0, 7)}-08`, type: "Expense", category: "Kesehatan", amount: 85000, note: "Minyak Kayu Putih & Panadol" },
    { date: `${new Date().toISOString().slice(0, 7)}-09`, type: "Expense", category: "Makanan", amount: 620000, note: "Traktir Makan Temen Ultah" },

    // Previous month transactions
    { date: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return `${d.toISOString().slice(0, 7)}-01`;
      })(), type: "Income", category: "Gaji", amount: 5000000, note: "Gaji Utama Bulanan" },
    { date: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return `${d.toISOString().slice(0, 7)}-02`;
      })(), type: "Expense", category: "Makanan", amount: 550000, note: "Belanja Bulanan Makanan" },
    { date: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return `${d.toISOString().slice(0, 7)}-03`;
      })(), type: "Expense", category: "Tagihan", amount: 350000, note: "Tagihan Wifi Indihome" },
    { date: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return `${d.toISOString().slice(0, 7)}-04`;
      })(), type: "Expense", category: "Transportasi", amount: 120000, note: "Bensin Motor" },
    { date: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return `${d.toISOString().slice(0, 7)}-05`;
      })(), type: "Expense", category: "Hiburan", amount: 150000, note: "Bioskop XXI" },
  ],
  budgets: [
    { category: "Makanan", budget: 1500000 },
    { category: "Transportasi", budget: 500000 },
    { category: "Belanja", budget: 1000000 },
    { category: "Tagihan", budget: 800000 },
    { category: "Hiburan", budget: 500000 },
    { category: "Kesehatan", budget: 300000 },
  ]
};

export async function GET() {
  if (!hasSupabaseConfig()) {
    console.log("ℹ️ Kredensial Supabase tidak ditemukan. Menampilkan data demo/dummy.");
    return NextResponse.json(DUMMY_DATA);
  }

  try {
    const [transactions, budgets] = await Promise.all([
      getDbTransactions(),
      getDbBudgets(),
    ]);
    return NextResponse.json({ transactions, budgets });
  } catch (err) {
    console.warn("⚠️ Gagal mengambil data dari Supabase API:", err.message);
    return NextResponse.json(DUMMY_DATA);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { date, type, category, amount, note } = body;

    if (!date || !type || !category || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (hasSupabaseConfig()) {
      await addDbTransaction({ date, type, category, amount, note });
      return NextResponse.json({ success: true });
    } else {
      console.log("ℹ️ Kredensial Supabase tidak ditemukan. Menjalankan simulasi POST.");
      return NextResponse.json({ success: true, offline: true });
    }
  } catch (err) {
    console.error("❌ Gagal menyimpan transaksi:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

