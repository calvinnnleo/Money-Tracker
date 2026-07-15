export const dynamic = "force-dynamic";

import ExcelJS from "exceljs";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getDbTransactions, hasSupabaseConfig } from "../../../lib/supabase";

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
  return { user };
}

const DUMMY_TRANSACTIONS = [
  { date: `${new Date().toISOString().slice(0, 7)}-01`, type: "Income", category: "Gaji", amount: 5000000, note: "Gaji Utama Bulanan" },
  { date: `${new Date().toISOString().slice(0, 7)}-01`, type: "Expense", category: "Tagihan", amount: 350000, note: "Tagihan Wifi Indihome" },
];

export async function GET(request) {
  const { user } = await getAuthUser(cookies());
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  let transactions;
  
  if (!hasSupabaseConfig()) {
    transactions = DUMMY_TRANSACTIONS;
  } else {
    try {
      transactions = await getDbTransactions(user.id);
    } catch (err) {
      console.warn("⚠️ Gagal mengambil data untuk export:", err.message);
      transactions = DUMMY_TRANSACTIONS;
    }
  }

  if (month) {
    transactions = transactions.filter((t) => t.date && t.date.startsWith(month));
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Keuangan");

  sheet.columns = [
    { header: "Tanggal", key: "date", width: 15 },
    { header: "Tipe", key: "type", width: 12 },
    { header: "Kategori", key: "category", width: 20 },
    { header: "Jumlah", key: "amount", width: 18 },
    { header: "Catatan", key: "note", width: 35 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFAF52DE" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "left" };
  headerRow.getCell("amount").alignment = { vertical: "middle", horizontal: "right" };

  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((t) => {
    const row = sheet.addRow(t);
    row.height = 20;
    row.getCell("amount").numFmt = '"Rp"#,##0';
    
    if (t.type === "Expense") {
      totalExpense += t.amount;
      row.getCell("type").font = { color: { argb: "FFFF3B30" }, bold: true };
    } else {
      totalIncome += t.amount;
      row.getCell("type").font = { color: { argb: "FF34C759" }, bold: true };
    }
  });

  sheet.addRow([]);
  const summaryRow = sheet.addRow({
    date: "Total",
    amount: totalIncome - totalExpense,
    note: `Pemasukan: Rp${totalIncome.toLocaleString()} | Pengeluaran: Rp${totalExpense.toLocaleString()}`,
  });
  summaryRow.font = { bold: true };
  summaryRow.getCell("amount").numFmt = '"Rp"#,##0';
  summaryRow.getCell("amount").font = {
    color: { argb: (totalIncome - totalExpense >= 0) ? "FF34C759" : "FFFF3B30" },
    bold: true
  };

  const buffer = await workbook.xlsx.writeBuffer();
  
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Laporan_Keuangan_${month || "Semua"}.xlsx"`,
    },
  });
}
