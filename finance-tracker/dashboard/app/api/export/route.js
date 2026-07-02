import ExcelJS from "exceljs";
import { fetchTransactions } from "../../../lib/sheets";

const DUMMY_TRANSACTIONS = [
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
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // e.g. "2026-07"

  let transactions;
  
  const hasSheetConfig = process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;

  if (!hasSheetConfig) {
    transactions = DUMMY_TRANSACTIONS;
  } else {
    try {
      transactions = await fetchTransactions();
    } catch (err) {
      console.warn("⚠️ Gagal mengambil data untuk export. Mengalihkan ke data dummy:", err.message);
      transactions = DUMMY_TRANSACTIONS;
    }
  }

  // Filter by month if provided
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

  // Format Header Row
  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF007AFF" }, // Apple Blue for header
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
      row.getCell("amount").font = { color: { argb: "FFFF3B30" }, bold: true }; // iOS Red
    } else {
      totalIncome += t.amount;
      row.getCell("amount").font = { color: { argb: "FF34C759" }, bold: true }; // iOS Green
    }
    
    // Border for data rows
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E5EA" } },
      };
    });
  });

  // Add Summary Rows with spacing
  sheet.addRow([]); // Blank row
  
  const incomeRow = sheet.addRow({
    category: "Total Pemasukan",
    amount: totalIncome,
  });
  incomeRow.getCell("amount").numFmt = '"Rp"#,##0';
  incomeRow.getCell("category").font = { bold: true, color: { argb: "FF8E8E93" } };
  incomeRow.getCell("amount").font = { bold: true, color: { argb: "FF34C759" } };

  const expenseRow = sheet.addRow({
    category: "Total Pengeluaran",
    amount: totalExpense,
  });
  expenseRow.getCell("amount").numFmt = '"Rp"#,##0';
  expenseRow.getCell("category").font = { bold: true, color: { argb: "FF8E8E93" } };
  expenseRow.getCell("amount").font = { bold: true, color: { argb: "FFFF3B30" } };

  const balanceRow = sheet.addRow({
    category: "Saldo Akhir",
    amount: totalIncome - totalExpense,
  });
  balanceRow.getCell("amount").numFmt = '"Rp"#,##0';
  balanceRow.getCell("category").font = { bold: true };
  balanceRow.getCell("amount").font = {
    bold: true,
    color: { argb: (totalIncome - totalExpense) >= 0 ? "FF34C759" : "FFFF3B30" },
  };

  // Add double borders to balance row bottom
  balanceRow.eachCell((cell) => {
    cell.border = {
      bottom: { style: "double", color: { argb: "FF1C1C1E" } },
      top: { style: "thin", color: { argb: "FFE5E5EA" } },
    };
  });

  sheet.autoFilter = "A1:E1";

  const buffer = await workbook.xlsx.writeBuffer();

  const filename = month ? `laporan-keuangan-${month}.xlsx` : "laporan-keuangan.xlsx";

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}
