"use client";

import { useEffect, useMemo, useState } from "react";
import MobileDashboard from "./components/MobileDashboard";
import DesktopDashboard from "./components/DesktopDashboard";
import { AlertCircle } from "lucide-react";

const COLORS = {
  Makanan:       "#FF9500", // Orange
  Transportasi:  "#5856D6", // Purple
  Belanja:       "#FF2D55", // Pink
  Tagihan:       "#007AFF", // Blue
  Hiburan:       "#AF52DE", // Violet
  Kesehatan:     "#34C759", // Green
  Pendidikan:    "#5AC8FA", // Teal
  Investasi:     "#FFCC00", // Yellow
  Donasi:        "#FF3B30", // Red
  Lainnya:       "#8E8E93", // Gray
};

const MOCK_DATA = {
  transactions: [
    // July 2026
    { date: "2026-07-01", category: "Makanan", note: "Nasi Padang Siang", amount: 35000, type: "Expense" },
    { date: "2026-07-01", category: "Belanja", note: "Beli Kaos Uniqlo", amount: 299000, type: "Expense" },
    { date: "2026-07-01", category: "Transportasi", note: "Isi Bensin Mobil", amount: 150000, type: "Expense" },
    { date: "2026-07-01", category: "Gaji", note: "Gaji Bulanan Utama", amount: 15000000, type: "Income" },
    { date: "2026-07-02", category: "Hiburan", note: "Langganan Netflix", amount: 186000, type: "Expense" },
    { date: "2026-07-02", category: "Makanan", note: "Kopi Starbak", amount: 58000, type: "Expense" },
    { date: "2026-07-03", category: "Tagihan", note: "Listrik & Air PLN", amount: 620000, type: "Expense" },
    { date: "2026-07-04", category: "Belanja", note: "Sepatu Running Baru", amount: 1250000, type: "Expense" },
    
    // June 2026 (For MoM calculations)
    { date: "2026-06-15", category: "Gaji", note: "Gaji Bulanan", amount: 14500000, type: "Income" },
    { date: "2026-06-18", category: "Makanan", note: "Makan Keluarga Weekend", amount: 450000, type: "Expense" },
    { date: "2026-06-20", category: "Tagihan", note: "Wifi IndiHome", amount: 450000, type: "Expense" },
    { date: "2026-06-25", category: "Belanja", note: "Belanja Bulanan Supermarket", amount: 850000, type: "Expense" },
    { date: "2026-06-28", category: "Hiburan", note: "Tiket Bioskop XXI", amount: 100000, type: "Expense" },
    { date: "2026-06-29", category: "Transportasi", note: "Servis Rutin Motor", amount: 250000, type: "Expense" },
    
    // Trend Data (Last 6 Months)
    { date: "2026-05-10", category: "Gaji", note: "Income", amount: 14000000, type: "Income" },
    { date: "2026-05-15", category: "Makanan", note: "Expense", amount: 3200000, type: "Expense" },
    { date: "2026-04-10", category: "Gaji", note: "Income", amount: 14000000, type: "Income" },
    { date: "2026-04-15", category: "Makanan", note: "Expense", amount: 2800000, type: "Expense" },
    { date: "2026-03-10", category: "Gaji", note: "Income", amount: 13500000, type: "Income" },
    { date: "2026-03-15", category: "Makanan", note: "Expense", amount: 3100000, type: "Expense" },
    { date: "2026-02-10", category: "Gaji", note: "Income", amount: 13500000, type: "Income" },
    { date: "2026-02-15", category: "Makanan", note: "Expense", amount: 3500000, type: "Expense" },
  ],
  budgets: [
    { category: "Makanan", budget: 1500000 },
    { category: "Transportasi", budget: 800000 },
    { category: "Belanja", budget: 2000000 },
    { category: "Tagihan", budget: 1000000 },
    { category: "Hiburan", budget: 500000 },
    { category: "Kesehatan", budget: 300000 }
  ]
};

export default function Page() {
  const [data, setData] = useState(MOCK_DATA);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Date selection states
  const [selectedMonth, setSelectedMonth] = useState("");
  
  // Client screen detection state
  const [isMobile, setIsMobile] = useState(true);

  // Initialize dates
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${year}-${m}`);
  }, []);

  // Listen to screen resize to dynamically switch layout (Web vs HP)
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Set initial size
    handleResize();
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch API (Saves to state if server is online, fallback silently if offline)
  useEffect(() => {
    fetch("/api/transactions")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setData(d);
        }
      })
      .catch((err) => {
        console.warn("API Offline / Belum siap. Berjalan menggunakan Local Mock Data untuk Front-End dev.");
      });
  }, []);

  // Previous month calculated from selected month
  const prevMonth = useMemo(() => {
    if (!selectedMonth) return "";
    const [yearStr, monthStr] = selectedMonth.split("-");
    let y = parseInt(yearStr);
    let m = parseInt(monthStr) - 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    return `${y}-${String(m).padStart(2, "0")}`;
  }, [selectedMonth]);

  // Navigate to previous/next month
  const changeMonth = (direction) => {
    if (!selectedMonth) return;
    const [yearStr, monthStr] = selectedMonth.split("-");
    let y = parseInt(yearStr);
    let m = parseInt(monthStr);

    if (direction === "prev") {
      m -= 1;
      if (m === 0) {
        m = 12;
        y -= 1;
      }
    } else {
      m += 1;
      if (m === 13) {
        m = 1;
        y += 1;
      }
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, "0")}`);
  };

  // Filter transactions for the selected month
  const monthlyData = useMemo(() => {
    if (!data) return { txs: [], income: 0, expense: 0 };
    const txs = data.transactions.filter((t) => t.date?.startsWith(selectedMonth));
    const income = txs.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0);
    return { txs, income, expense };
  }, [data, selectedMonth]);

  // Category breakdown for budgets & charts
  const categoryData = useMemo(() => {
    if (!data) return [];
    const map = {};
    for (const t of monthlyData.txs) {
      if (t.type !== "Expense") continue;
      map[t.category] = (map[t.category] || 0) + t.amount;
    }
    
    const budgetMap = Object.fromEntries(
      (data.budgets || []).map((b) => [b.category, b.budget])
    );
    
    const allCategories = new Set([
      ...Object.keys(map),
      ...Object.keys(budgetMap),
    ]);

    return Array.from(allCategories)
      .map((cat) => {
        const spent = map[cat] || 0;
        const budget = budgetMap[cat] || 0;
        return {
          category: cat,
          spent,
          budget,
          percentage: budget ? (spent / budget) * 100 : 0,
        };
      })
      .filter((c) => c.spent > 0 || c.budget > 0)
      .sort((a, b) => b.spent - a.spent);
  }, [data, monthlyData]);

  // Donut chart data format
  const donutData = useMemo(() => {
    return categoryData
      .filter((c) => c.spent > 0)
      .map((c) => ({
        name: c.category,
        value: c.spent,
        color: COLORS[c.category] || "#8E8E93",
      }));
  }, [categoryData]);

  // 6 months trend data
  const trendData = useMemo(() => {
    if (!data) return [];
    const byMonth = {};
    for (const t of data.transactions) {
      const m = t.date?.slice(0, 7);
      if (!m) continue;
      byMonth[m] = byMonth[m] || { month: m, Pemasukan: 0, Pengeluaran: 0 };
      if (t.type === "Income") byMonth[m].Pemasukan += t.amount;
      else byMonth[m].Pengeluaran += t.amount;
    }
    return Object.values(byMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [data]);

  // Insights statistics (savings rate, daily average, MoM change)
  const stats = useMemo(() => {
    if (!data || !selectedMonth) return null;
    const currentTxs = data.transactions.filter((t) => t.date && t.date.startsWith(selectedMonth));
    const previousTxs = data.transactions.filter((t) => t.date && t.date.startsWith(prevMonth));

    const currentSpent = currentTxs.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
    const prevSpent = previousTxs.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
    const currentIncome = currentTxs.filter((t) => t.type === "Income").reduce((sum, t) => sum + t.amount, 0);

    const momDiff = currentSpent - prevSpent;
    const momPercentage = prevSpent ? (momDiff / prevSpent) * 100 : 0;

    const uniqueDays = new Set(currentTxs.filter((t) => t.type === "Expense").map((t) => t.date));
    const daysCount = uniqueDays.size || 1;
    const dailyAvg = currentSpent / (daysCount || 1);

    const savingsRate = currentIncome ? ((currentIncome - currentSpent) / currentIncome) * 100 : 0;

    // Largest category
    const currentCats = {};
    currentTxs.filter((t) => t.type === "Expense").forEach((t) => {
      currentCats[t.category] = (currentCats[t.category] || 0) + t.amount;
    });
    const largestCategory = Object.entries(currentCats).sort((a, b) => b[1] - a[1])[0];

    // MoM comparison per category
    const prevCats = {};
    previousTxs.filter((t) => t.type === "Expense").forEach((t) => {
      prevCats[t.category] = (prevCats[t.category] || 0) + t.amount;
    });

    const categoryMoM = Object.entries(currentCats).map(([cat, amount]) => {
      const pAmount = prevCats[cat] || 0;
      const diff = amount - pAmount;
      const pct = pAmount ? (diff / pAmount) * 100 : 0;
      return {
        category: cat,
        current: amount,
        previous: pAmount,
        diff,
        percentage: pct,
      };
    }).sort((a, b) => b.current - a.current);

    return {
      currentSpent,
      prevSpent,
      momDiff,
      momPercentage,
      dailyAvg,
      savingsRate,
      largestCategory,
      categoryMoM,
    };
  }, [data, selectedMonth, prevMonth]);

  // Initial spinner loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5FA] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-blue border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-secondary mt-3 uppercase tracking-widest">Loading Kas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F5FA] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-card border border-separator max-w-sm">
          <AlertCircle className="w-10 h-10 text-red mx-auto mb-3" />
          <h3 className="font-bold text-ink mb-1">Koneksi Gagal</h3>
          <p className="text-secondary text-xs mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="w-full btn-apple-primary text-sm py-2.5">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // Switch display component dynamically based on viewport check
  if (isMobile) {
    return (
      <MobileDashboard
        data={data}
        monthlyData={monthlyData}
        categoryData={categoryData}
        donutData={donutData}
        trendData={trendData}
        stats={stats}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        changeMonth={changeMonth}
      />
    );
  }

  return (
    <DesktopDashboard
      data={data}
      monthlyData={monthlyData}
      categoryData={categoryData}
      donutData={donutData}
      trendData={trendData}
      stats={stats}
      selectedMonth={selectedMonth}
      setSelectedMonth={setSelectedMonth}
      changeMonth={changeMonth}
    />
  );
}
