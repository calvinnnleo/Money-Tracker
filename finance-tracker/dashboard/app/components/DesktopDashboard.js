"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Activity,
  Home,
  Sliders,
  ArrowRightLeft,
  Bell,
  RefreshCw,
  Coffee,
  Heart,
  Calendar,
} from "lucide-react";

// Emoji mapping for categories
const CATEGORY_EMOJI = {
  Makanan:       "🍔",
  Transportasi:  "🚗",
  Belanja:       "🛍️",
  Tagihan:       "📱",
  Hiburan:       "🎮",
  Kesehatan:     "💊",
  Pendidikan:    "📚",
  Investasi:     "📈",
  Donasi:        "🎁",
  Gaji:          "💰",
  Lainnya:       "📌",
};

function formatRupiah(n) {
  return "Rp" + Math.round(Math.abs(n)).toLocaleString("id-ID");
}

// Circular progress indicator (Health App Calorie Style)
function CircularProgress({ percentage, label, sublabel, color = "#5856D6" }) {
  const radius = 55;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        {/* Background track */}
        <circle
          stroke="#E5E5EA"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Colored progress */}
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      {/* Centered label */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-base font-black text-ink tracking-tight leading-none">{label}</span>
        <span className="text-[9px] font-bold text-secondary tracking-widest mt-1 leading-none uppercase">{sublabel}</span>
      </div>
    </div>
  );
}

// SVG Sparkline Trendline
function Sparkline({ dataPoints = [30, 45, 35, 60, 40, 70, 85], color = "#007AFF" }) {
  const width = 110;
  const height = 28;
  const max = Math.max(...dataPoints);
  const min = Math.min(...dataPoints);
  const range = max - min || 1;

  const points = dataPoints
    .map((val, index) => {
      const x = (index / (dataPoints.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function DesktopDashboard({
  data,
  monthlyData,
  categoryData,
  donutData,
  trendData,
  stats,
  selectedMonth,
  setSelectedMonth,
  changeMonth,
}) {
  const [desktopTab, setDesktopTab] = useState("home"); // "home" | "budgets" | "transactions" | "insights"
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${year}-${m}-${d}`;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [timeframe, setTimeframe] = useState("Months");

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return "";
    const d = new Date(selectedDate);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
    ];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }, [selectedDate]);

  const currentMonthLabel = useMemo(() => {
    if (!selectedMonth) return "";
    const [year, m] = selectedMonth.split("-");
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${months[parseInt(m) - 1]} ${year}`;
  }, [selectedMonth]);

  // Calendar week list (centered on selectedDate)
  const calendarWeek = useMemo(() => {
    const dates = [];
    const baseDate = selectedDate ? new Date(selectedDate) : new Date();
    const first = baseDate.getDate() - baseDate.getDay();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(first + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      dates.push({
        dateStr,
        dayNum: d.getDate(),
        dayName: dayNames[i],
        isActive: dateStr === selectedDate,
      });
    }
    return dates;
  }, [selectedDate]);

  // Filter transactions for selected calendar date
  const selectedDateTxs = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter((t) => t.date === selectedDate);
  }, [data, selectedDate]);

  // Filtered transactions for search in transactions tab
  const filteredTxs = useMemo(() => {
    return monthlyData.txs.filter((t) => {
      const query = searchQuery.toLowerCase();
      return (
        t.note?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query) ||
        t.amount.toString().includes(query)
      );
    });
  }, [monthlyData.txs, searchQuery]);

  // Group transactions by date for list view
  const groupedTxs = useMemo(() => {
    const groups = {};
    const sorted = [...filteredTxs].sort((a, b) => b.date.localeCompare(a.date));
    for (const t of sorted) {
      if (!groups[t.date]) {
        groups[t.date] = [];
      }
      groups[t.date].push(t);
    }
    return Object.entries(groups);
  }, [filteredTxs]);

  // Total budget and percentage spent
  const totalBudgetLimit = (data.budgets || []).reduce((sum, b) => sum + b.budget, 0) || 1;
  const totalBudgetPct = Math.min(Math.round((monthlyData.expense / totalBudgetLimit) * 100), 100);
  const balance = monthlyData.income - monthlyData.expense;

  return (
    <div className="min-h-screen bg-[#F5F5FA] text-[#1C1C1E] font-sans antialiased flex">
      
      {/* Left Sidebar Navigation (Desktop Layout) */}
      <aside className="w-[260px] bg-white border-r border-[#E5E5EA] flex flex-col justify-between py-8 px-5 shrink-0">
        <div className="space-y-8">
          {/* Logo with Apple Health Accent */}
          <div className="flex items-center gap-2.5 pl-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF2D55] to-[#FF3B30] text-white flex items-center justify-center font-black shadow-card">
              🍎
            </div>
            <span className="font-extrabold text-lg text-ink tracking-tight">KasPola</span>
          </div>

          {/* Menus */}
          <nav className="space-y-1">
            <button
              onClick={() => setDesktopTab("home")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-300 ${
                desktopTab === "home"
                  ? "bg-[#1C1C1E] text-white shadow-float"
                  : "text-secondary hover:bg-black/5 hover:text-ink"
              }`}
            >
              <Home className="w-4 h-4" />
              Dashboard
            </button>
            
            <button
              onClick={() => setDesktopTab("insights")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-300 ${
                desktopTab === "insights"
                  ? "bg-[#1C1C1E] text-white shadow-float"
                  : "text-secondary hover:bg-black/5 hover:text-ink"
              }`}
            >
              <Activity className="w-4 h-4" />
              Statistik Analisis
            </button>

            <button
              onClick={() => setDesktopTab("budgets")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-300 ${
                desktopTab === "budgets"
                  ? "bg-[#1C1C1E] text-white shadow-float"
                  : "text-secondary hover:bg-black/5 hover:text-ink"
              }`}
            >
              <Sliders className="w-4 h-4" />
              Monitor Budget
            </button>

            <button
              onClick={() => setDesktopTab("transactions")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-300 ${
                desktopTab === "transactions"
                  ? "bg-[#1C1C1E] text-white shadow-float"
                  : "text-secondary hover:bg-black/5 hover:text-ink"
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              Riwayat Transaksi
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="bg-[#F2F2F7] p-4 rounded-2xl border border-separator/40">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Buku Kas</p>
          <p className="text-[11px] font-extrabold text-ink mt-1">Google Sheets DB</p>
          <p className="text-[9px] text-green font-bold mt-1">● Terkoneksi</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto max-w-5xl">
        
        {/* Top Header Row */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <p className="text-xs font-bold text-secondary uppercase tracking-wider">Selamat Datang Kembali,</p>
            <h1 className="text-3xl font-black tracking-tight text-ink mt-1">Calvin Leo</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex gap-3">
              <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-secondary border border-separator/35 shadow-card hover:bg-[#F2F2F7] transition">
                <Search className="w-4 h-4" />
              </button>
              <div className="relative">
                <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-secondary border border-separator/35 shadow-card hover:bg-[#F2F2F7] transition">
                  <Bell className="w-4 h-4" />
                </button>
                {totalBudgetPct >= 80 && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red border-2 border-surface rounded-full"></span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-separator/60">
              <div className="w-9 h-9 rounded-full bg-[#1C1C1E] text-white flex items-center justify-center font-bold text-xs shadow-card">
                CL
              </div>
              <span className="text-xs font-bold text-ink">Calvin Leo</span>
            </div>
          </div>
        </header>

        {/* TAB 1: HOME */}
        {desktopTab === "home" && (
          <div className="animate-fade-in space-y-6">
            
            {/* Top Cards Row: Circular Progress Card & Date Selector */}
            <div className="grid grid-cols-3 gap-6">
              
              {/* Circular Progress Ring Card (2/3 width) */}
              <section className="bg-gradient-to-br from-[#EBF2FF] to-[#D5E5FF] border border-[#007AFF]/15 rounded-[32px] p-6 shadow-card col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] bg-blue/10 text-blue font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Batas Kas Terpakai
                  </span>
                  <h3 className="text-4xl font-black tracking-tight text-ink mt-4">
                    {totalBudgetPct}%
                  </h3>
                  <p className="text-secondary text-xs font-bold mt-1">
                    Evaluasi Kas: {currentMonthLabel}
                  </p>
                </div>

                <CircularProgress
                  percentage={totalBudgetPct}
                  label={`${totalBudgetPct}%`}
                  sublabel="spent"
                  color={totalBudgetPct >= 100 ? "#FF3B30" : totalBudgetPct >= 80 ? "#FF9500" : "#5856D6"}
                />
              </section>

              {/* Month Switcher & Export Card (1/3 width) */}
              <section className="bg-white border border-separator/35 rounded-[32px] p-6 shadow-card flex flex-col justify-between">
                <div>
                  <span className="text-[10px] bg-bg border border-separator/60 text-secondary font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Periode
                  </span>
                  <h4 className="font-extrabold text-ink text-base mt-3 leading-tight truncate">
                    {currentMonthLabel}
                  </h4>
                </div>
                <div className="flex gap-2.5 mt-4">
                  <button
                    onClick={() => changeMonth("prev")}
                    className="flex-1 py-2 px-3 bg-[#F2F2F7] rounded-xl border border-separator/30 text-ink hover:bg-[#E5E5EA] transition font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <button
                    onClick={() => changeMonth("next")}
                    className="flex-1 py-2 px-3 bg-[#F2F2F7] rounded-xl border border-separator/30 text-ink hover:bg-[#E5E5EA] transition font-bold text-xs flex items-center justify-center gap-1"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </section>
              
            </div>

            {/* Calendar Date Strip */}
            <section className="bg-white p-4 rounded-3xl border border-separator/35 shadow-card">
              <div className="flex justify-between items-center mb-3 px-2">
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Pilih Tanggal Transaksi</span>
                <span className="text-xs font-bold text-[#007AFF]">{formattedSelectedDate}</span>
              </div>
              <div className="flex gap-3 justify-between">
                {calendarWeek.map((day) => (
                  <button
                    key={day.dateStr}
                    onClick={() => setSelectedDate(day.dateStr)}
                    className={`flex flex-col items-center justify-center py-3 flex-1 rounded-2xl border transition-all duration-200 ${
                      day.isActive
                        ? "bg-ink border-ink text-white shadow-float scale-[1.03]"
                        : "bg-surface border-separator/40 text-ink hover:bg-[#F2F2F7] shadow-card"
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{day.dayName}</span>
                    <span className="text-lg font-extrabold tracking-tight mt-1">{day.dayNum}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Grid Layout Cards */}
            <section className="grid grid-cols-2 gap-6">
              
              {/* Left Card - Terboros */}
              <div className="bg-[#FFF4E5] border border-[#FF9500]/25 rounded-[32px] p-6 flex flex-col justify-between min-h-[220px] shadow-card">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] bg-orange/10 text-orange font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Terboros
                    </span>
                    <Coffee className="w-5 h-5 text-orange" />
                  </div>
                  <h4 className="font-bold text-ink text-base mt-5 leading-tight">
                    {stats?.largestCategory ? stats.largestCategory[0] : "Kategori Belum Ada"}
                  </h4>
                  <p className="text-secondary text-xs font-bold mt-1.5">
                    {stats?.largestCategory ? formatRupiah(stats.largestCategory[1]) : "Rp0"}
                  </p>
                </div>
                <div className="border-t border-[#FF9500]/20 pt-4 mt-6">
                  <p className="text-xs text-[#B8922B] font-bold leading-relaxed">
                    💡 Sisa budget Makanan Anda makin tipis. Kurangi jajan kopi luar!
                  </p>
                </div>
              </div>

              {/* Right Stack */}
              <div className="flex flex-col gap-6">
                {/* Top Card - Saldo */}
                <div className="bg-[#EBF2FF] border border-[#007AFF]/25 rounded-[32px] p-6 flex flex-col justify-between h-[120px] shadow-card">
                  <div>
                    <span className="text-[10px] bg-blue/10 text-blue font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Saldo Tabungan
                    </span>
                    <h4 className="font-black text-ink text-lg mt-3 tracking-tight">
                      {formatRupiah(balance)}
                    </h4>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[9px] text-blue font-bold">Trend Bulanan</span>
                    <Sparkline dataPoints={[20, 30, 25, 45, 35, 60, balance > 0 ? 55 : 20]} color="#007AFF" />
                  </div>
                </div>

                {/* Bottom Card - Actions */}
                <div className="bg-[#FFECEB] border border-[#FF2D55]/20 rounded-[32px] p-4 flex items-center justify-around h-[76px] shadow-card">
                  <a
                    href={`/api/export?month=${selectedMonth}`}
                    className="w-10 h-10 rounded-full bg-surface border border-separator/40 flex items-center justify-center text-red shadow-card hover:bg-white active:scale-95 transition"
                    title="Download Excel"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setDesktopTab("insights")}
                    className="w-10 h-10 rounded-full bg-surface border border-separator/40 flex items-center justify-center text-blue shadow-card hover:bg-white active:scale-95 transition"
                    title="Analisis Kas"
                  >
                    <Activity className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="w-10 h-10 rounded-full bg-surface border border-separator/40 flex items-center justify-center text-orange shadow-card hover:bg-white active:scale-95 transition"
                    title="Refresh Data"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </section>

            {/* Selected Date Transactions Preview */}
            <section className="bg-white p-6 rounded-3xl border border-separator/35 shadow-card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-ink text-base pl-1">Transaksi Hari Ini ({formattedSelectedDate})</h3>
                <button
                  onClick={() => setDesktopTab("transactions")}
                  className="text-xs font-bold text-blue hover:underline pr-1"
                >
                  Lihat Semua
                </button>
              </div>
              
              {selectedDateTxs.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-secondary text-xs">Tidak ada transaksi tercatat untuk hari ini.</p>
                </div>
              ) : (
                <div className="border border-separator/40 rounded-2xl overflow-hidden divide-y divide-separator/40">
                  {selectedDateTxs.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-surface hover:bg-bg/40 transition">
                      <div className="flex items-center gap-3.5">
                        <span className="text-3xl">{CATEGORY_EMOJI[t.category] || "📌"}</span>
                        <div>
                          <p className="font-bold text-ink text-sm leading-tight">{t.note || t.category}</p>
                          <p className="text-[10px] text-secondary font-semibold uppercase mt-1">{t.category}</p>
                        </div>
                      </div>
                      <span className={`font-bold text-sm ${t.type === "Expense" ? "text-red" : "text-green"}`}>
                        {t.type === "Expense" ? "-" : "+"}{formatRupiah(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: BUDGETS */}
        {desktopTab === "budgets" && (
          <div className="animate-fade-in space-y-6">
            <header className="flex justify-between items-center bg-white p-5 rounded-3xl border border-separator/35 shadow-card">
              <div>
                <span className="text-xs font-semibold tracking-wider text-secondary uppercase">Buku Keuangan</span>
                <h1 className="text-2xl font-black text-ink tracking-tight">Monitor Budget</h1>
              </div>
              <div className="bg-bg px-4 py-2 rounded-full border border-separator/60 shadow-card">
                <span className="text-xs font-bold text-ink">{currentMonthLabel}</span>
              </div>
            </header>

            <section className="grid grid-cols-2 gap-4">
              {categoryData.length === 0 ? (
                <div className="col-span-2 bg-white rounded-3xl p-8 text-center shadow-card border border-separator/40">
                  <p className="text-secondary text-xs">Belum ada budget yang diset atau pengeluaran tercatat.</p>
                </div>
              ) : (
                categoryData.map((c) => {
                  const isOver = c.percentage >= 100;
                  const isWarning = c.percentage >= 80 && c.percentage < 100;
                  
                  let barColor = "bg-green";
                  let textColor = "text-green";
                  let statusLabel = "";
                  
                  if (isOver) {
                    barColor = "bg-red";
                    textColor = "text-red font-bold";
                    statusLabel = "🚨 Over Budget!";
                  } else if (isWarning) {
                    barColor = "bg-orange";
                    textColor = "text-orange font-semibold";
                    statusLabel = "⚠️ Hampir Habis";
                  }

                  return (
                    <div key={c.category} className="bg-white p-5 rounded-3xl border border-separator/40 shadow-card">
                      <div className="flex justify-between items-center text-xs mb-3">
                        <span className="font-bold text-ink flex items-center gap-2">
                          <span className="text-xl">{CATEGORY_EMOJI[c.category] || "📌"}</span>
                          <span>{c.category}</span>
                        </span>
                        <span className="text-[10px] text-secondary font-medium">
                          {formatRupiah(c.spent)} / <span className="font-bold text-ink">{c.budget ? formatRupiah(c.budget) : "N/A"}</span>
                        </span>
                      </div>

                      {c.budget > 0 ? (
                        <div>
                          <div className="progress-bar mb-2 bg-separator/50 h-2.5 rounded-full overflow-hidden">
                            <div
                              className={`progress-fill h-full rounded-full ${barColor}`}
                              style={{ width: `${Math.min(c.percentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-semibold">
                            <span className={`${textColor}`}>{Math.round(c.percentage)}% Terpakai</span>
                            <span className="text-secondary">{statusLabel}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-secondary italic">
                          Budget belum diatur via bot Telegram.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </section>
          </div>
        )}

        {/* TAB 3: TRANSACTIONS */}
        {desktopTab === "transactions" && (
          <div className="animate-fade-in space-y-6">
            <header className="bg-white p-5 rounded-3xl border border-separator/35 shadow-card">
              <span className="text-xs font-semibold tracking-wider text-secondary uppercase">Riwayat</span>
              <h1 className="text-2xl font-black text-ink tracking-tight mt-1">Semua Transaksi</h1>
            </header>

            {/* Search Input bar */}
            <div className="relative w-full shadow-card rounded-2xl overflow-hidden border border-separator/60">
              <Search className="w-4 h-4 text-secondary absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white text-xs focus:outline-none focus:border-blue transition focus:bg-white"
              />
            </div>

            {/* Grouped Lists */}
            <section className="space-y-6">
              {groupedTxs.length === 0 ? (
                <p className="text-center text-secondary text-xs py-8">Tidak ada transaksi yang ditemukan.</p>
              ) : (
                groupedTxs.map(([date, txs]) => {
                  const d = new Date(date);
                  const options = { weekday: 'long', day: 'numeric', month: 'short' };
                  const dateStr = d.toLocaleDateString('id-ID', options);
                  
                  return (
                    <div key={date} className="space-y-2">
                      <h4 className="text-[10px] font-bold text-secondary uppercase tracking-wider pl-1">{dateStr}</h4>
                      <div className="bg-white border border-separator/40 rounded-3xl overflow-hidden divide-y divide-separator/40 shadow-card">
                        {txs.map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-white hover:bg-bg/40 transition">
                            <div className="flex items-center gap-3.5">
                              <span className="text-3xl">{CATEGORY_EMOJI[t.category] || "📌"}</span>
                              <div>
                                <p className="font-bold text-ink text-sm leading-tight">{t.note || t.category}</p>
                                <p className="text-[10px] text-secondary font-semibold uppercase mt-1">{t.category}</p>
                              </div>
                            </div>
                            <span className={`font-bold text-sm ${t.type === "Expense" ? "text-red" : "text-green"}`}>
                              {t.type === "Expense" ? "-" : "+"}{formatRupiah(t.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          </div>
        )}

        {/* TAB 4: INSIGHTS */}
        {desktopTab === "insights" && (
          <div className="animate-fade-in space-y-6">
            <header className="flex justify-between items-center bg-white p-5 rounded-3xl border border-separator/35 shadow-card">
              <div>
                <span className="text-xs font-semibold tracking-wider text-secondary uppercase">Analisis</span>
                <h1 className="text-2xl font-black text-ink tracking-tight">Tren & Pola</h1>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => changeMonth("prev")} className="p-2 rounded-full bg-white border border-separator/50 shadow-card hover:bg-bg active:scale-95 transition"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs font-bold text-ink">{selectedMonth}</span>
                <button onClick={() => changeMonth("next")} className="p-2 rounded-full bg-white border border-[#E5E5EA] shadow-card hover:bg-bg active:scale-95 transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </header>

            {/* Timeframe switch toggler */}
            <section className="bg-white border border-separator/40 rounded-2xl p-1 shadow-card flex justify-between">
              {["Days", "Weeks", "Months", "Years"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition ${
                    timeframe === t
                      ? "bg-ink text-white shadow-card"
                      : "text-secondary hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </section>

            {stats && (
              <div className="space-y-6">
                {/* 1. Large Line Chart */}
                <div className="bg-white border border-separator/40 rounded-3xl p-5 shadow-card">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-secondary font-bold uppercase tracking-wider">Tren Pengeluaran</span>
                    <span className="text-sm font-bold text-ink">{formatRupiah(stats.currentSpent)}</span>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#34C759" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#34C759" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#FF3B30" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#E5E5EA" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#8E8E93" }} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: "#8E8E93" }} />
                        <Area type="monotone" dataKey="Pemasukan" stroke="#34C759" strokeWidth={1.5} fillOpacity={1} fill="url(#colIncome)" />
                        <Area type="monotone" dataKey="Pengeluaran" stroke="#FF3B30" strokeWidth={1.5} fillOpacity={1} fill="url(#colExpense)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Side-by-Side indicators */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white border border-separator/45 rounded-3xl p-5 shadow-card">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">Savings Rate</span>
                      <Heart className="w-4 h-4 text-red" />
                    </div>
                    <h3 className="text-2xl font-black text-ink">{Math.round(stats.savingsRate)}%</h3>
                    <p className="text-secondary text-[10px] font-bold mt-1">Status tabungan sehat</p>
                  </div>

                  <div className="bg-white border border-separator/45 rounded-3xl p-5 shadow-card">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">Rata-rata/Hari</span>
                      <Activity className="w-4 h-4 text-blue" />
                    </div>
                    <h3 className="text-2xl font-black text-ink">{formatRupiah(stats.dailyAvg)}</h3>
                    <p className="text-secondary text-[10px] font-bold mt-1">Dari hari dengan transaksi</p>
                  </div>
                </div>

                {/* 3. Category MoM comparison list */}
                <div className="space-y-4">
                  <h4 className="font-bold text-ink text-sm pl-1">Perbandingan Kategori</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {stats.categoryMoM.map((c) => {
                      const isUp = c.diff > 0;
                      return (
                        <div key={c.category} className="flex justify-between items-center p-4 bg-white border border-separator/35 rounded-2xl shadow-card">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{CATEGORY_EMOJI[c.category]}</span>
                            <div>
                              <p className="font-bold text-ink text-xs">{c.category}</p>
                              <p className="text-[10px] text-secondary">Bulan Ini: {formatRupiah(c.current)}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isUp ? 'text-red bg-red-bg' : 'text-green bg-green-bg'}`}>
                            {isUp ? "▲" : "▼"} {Math.abs(Math.round(c.percentage))}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </main>

    </div>
  );
}
