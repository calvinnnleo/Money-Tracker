"use client";

import { useMemo, useState, useEffect } from "react";
import { createClient } from "../../lib/supabase-browser";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
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
  TrendingUp,
  TrendingDown,
  X,
  Wallet,
  PiggyBank,
  Flame,
  BarChart3,
  ArrowUpDown,
  Plus,
  Trash2,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

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

const COLORS = {
  Makanan:       "#FF9500",
  Transportasi:  "#5856D6",
  Belanja:       "#FF2D55",
  Tagihan:       "#007AFF",
  Hiburan:       "#AF52DE",
  Kesehatan:     "#34C759",
  Pendidikan:    "#5AC8FA",
  Investasi:     "#FFCC00",
  Donasi:        "#FF3B30",
  Lainnya:       "#8E8E93",
};

// ─── Utility Functions ───────────────────────────────────────────────────────

function formatRupiah(n) {
  return "Rp" + Math.round(Math.abs(n)).toLocaleString("id-ID");
}

function formatCompact(n) {
  const abs = Math.abs(n);
  if (abs >= 1000000) return `${(n / 1000000).toFixed(1)}jt`;
  if (abs >= 1000) return `${(n / 1000).toFixed(0)}rb`;
  return n.toString();
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

function getGreetingEmoji() {
  const hour = new Date().getHours();
  if (hour < 11) return "☀️";
  if (hour < 15) return "🌤️";
  if (hour < 18) return "🌅";
  return "🌙";
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

// Circular progress ring (iOS Health style)
function CircularProgress({ percentage, label, sublabel, color = "#5856D6", size = 84 }) {
  const radius = size / 2;
  const strokeWidth = 7;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          stroke="#E5E5EA"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + " " + circumference}
          style={{
            strokeDashoffset,
            transition: "stroke-dashoffset 1s cubic-bezier(0.25,0.46,0.45,0.94)",
          }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-[13px] font-black text-ink tracking-tight leading-none">{label}</span>
        <span className="text-[7px] font-bold text-secondary tracking-widest mt-0.5 leading-none uppercase">
          {sublabel}
        </span>
      </div>
    </div>
  );
}

// SVG Sparkline Trendline
function Sparkline({ dataPoints = [30, 45, 35, 60, 40, 70, 85], color = "#007AFF" }) {
  const width = 80;
  const height = 24;
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
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// Mini Donut for summary
function MiniDonut({ segments, size = 44 }) {
  const radius = (size - 8) / 2;
  const circumference = radius * 2 * Math.PI;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let offset = 0;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle stroke="#E5E5EA" fill="transparent" strokeWidth={4} r={radius} cx={size / 2} cy={size / 2} />
      {segments.map((seg, i) => {
        const segLen = (seg.value / total) * circumference;
        const dashOffset = circumference - segLen;
        const rotation = (offset / total) * 360;
        offset += seg.value;
        return (
          <circle
            key={i}
            stroke={seg.color}
            fill="transparent"
            strokeWidth={4}
            strokeDasharray={`${segLen} ${circumference - segLen}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            style={{
              transformOrigin: "50% 50%",
              transform: `rotate(${rotation}deg)`,
              transition: "all 0.6s ease",
            }}
          />
        );
      })}
    </svg>
  );
}

// Animated counter
function AnimatedNumber({ value, prefix = "", suffix = "" }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const duration = 600;
    const startTime = Date.now();
    const startVal = displayed;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayed(Math.round(startVal + (value - startVal) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span>
      {prefix}
      {Math.round(Math.abs(displayed)).toLocaleString("id-ID")}
      {suffix}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MobileDashboard({
  data,
  allTransactions = [],
  monthlyData,
  categoryData,
  donutData,
  trendData,
  stats,
  selectedMonth,
  setSelectedMonth,
  changeMonth,
  onAddBudget,
  onDeleteBudget,
  onDeleteTransaction,

  // Settings, profiles, and transactions props
  userName,
  setUserName,
  savingsTarget,
  setSavingsTarget,
  isDarkMode,
  setIsDarkMode,
  onAddTransaction,
  onLogout,
  telegramId,
  telegramName,
  onRefreshProfile,
}) {
  const [activeTab, setActiveTab] = useState("home");
  const [selectedTxForDetail, setSelectedTxForDetail] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${year}-${m}-${d}`;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest"
  const [txFilter, setTxFilter] = useState("Semua"); // "Semua" | "Pengeluaran" | "Pemasukan"
  const [hideNavbar, setHideNavbar] = useState(false);

  // Overlay Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // Form states for manual transaction entry
  const [txType, setTxType] = useState("Expense");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("Makanan");
  const [txNote, setTxNote] = useState("");
  const [txDate, setTxDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingSavingsTarget, setIsEditingSavingsTarget] = useState(false);
  const [tempSavingsTarget, setTempSavingsTarget] = useState(savingsTarget.toString());

  useEffect(() => {
    setTempSavingsTarget(savingsTarget.toString());
  }, [savingsTarget]);

  // Sync txDate with selectedDate when modal opens
  useEffect(() => {
    if (showAddTxModal) {
      setTxDate(selectedDate);
    }
  }, [showAddTxModal, selectedDate]);

  // Settings modal fields
  const [settingName, setSettingName] = useState(userName);
  const [settingTarget, setSettingTarget] = useState(savingsTarget.toString());
  const [telegramCode, setTelegramCode] = useState("");
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null);

  // Change password states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const supabase = createClient();

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordStatus({ type: "error", msg: "Password baru minimal 6 karakter." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", msg: "Password baru dan konfirmasi tidak cocok." });
      return;
    }

    setPasswordLoading(true);
    setPasswordStatus(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordStatus({ type: "success", msg: "Password berhasil diganti!" });
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowPasswordFields(false);
        setPasswordStatus(null);
      }, 2000);
    } catch (err) {
      setPasswordStatus({ type: "error", msg: err.message || "Gagal mengubah password." });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLinkTelegram = async () => {
    if (!telegramCode.trim() || telegramCode.trim().length !== 6) {
      setTelegramStatus({ type: "error", msg: "Kode harus 6 digit." });
      return;
    }
    setTelegramLoading(true);
    setTelegramStatus(null);
    try {
      const res = await fetch("/api/link-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: telegramCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghubungkan.");
      }
      setTelegramStatus({ type: "success", msg: "Berhasil terhubung ke Telegram!" });
      setTelegramCode("");
      if (onRefreshProfile) onRefreshProfile();
    } catch (err) {
      setTelegramStatus({ type: "error", msg: err.message });
    } finally {
      setTelegramLoading(false);
    }
  };

  // Sync setting values when profile modal opens
  useEffect(() => {
    if (showSettingsModal) {
      setSettingName(userName);
      setSettingTarget(savingsTarget.toString());
    }
  }, [showSettingsModal, userName, savingsTarget]);

  // Budget CRUD Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatBudget, setNewCatBudget] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("");

  const [editingCategory, setEditingCategory] = useState(null);
  const [editBudgetAmount, setEditBudgetAmount] = useState("");

  const [customEmojis, setCustomEmojis] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("custom_category_emojis");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const saveCustomEmoji = (category, emoji) => {
    const updated = { ...customEmojis, [category]: emoji };
    setCustomEmojis(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("custom_category_emojis", JSON.stringify(updated));
    }
  };

  const getCategoryEmoji = (category) => {
    return customEmojis[category] || CATEGORY_EMOJI[category] || "📌";
  };

  // Detect scrolling direction to hide/show navigation bar dynamically (softer & natural animation)
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          if (currentScrollY > lastScrollY && currentScrollY > 40) {
            // Scrolling down - hide navbar
            setHideNavbar(true);
          } else {
            // Scrolling up or at the top - show navbar
            setHideNavbar(false);
          }
          
          if (currentScrollY < 10) {
            setHideNavbar(false);
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  
  // Date range states for the custom filter on Insights tab
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sync date range inputs with selectedMonth
  useEffect(() => {
    if (!selectedMonth) return;
    const [y, m] = selectedMonth.split("-");
    const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    setStartDate(`${selectedMonth}-01`);
    setEndDate(`${selectedMonth}-${String(lastDay).padStart(2, "0")}`);
  }, [selectedMonth]);

  // ─── Derived Data ───────────────────────────────────────────────────────

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return "";
    const d = new Date(selectedDate);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agt", "Sep", "Okt", "Nov", "Des",
    ];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }, [selectedDate]);

  const currentMonthLabel = useMemo(() => {
    if (!selectedMonth) return "";
    const [year, m] = selectedMonth.split("-");
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    return `${months[parseInt(m) - 1]} ${year}`;
  }, [selectedMonth]);

  const shortMonthLabel = useMemo(() => {
    if (!selectedMonth) return "";
    const [year, m] = selectedMonth.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    return `${months[parseInt(m) - 1]} ${year}`;
  }, [selectedMonth]);
  // Calendar days grid list (all days of the selectedMonth, plus padding days)
  const calendarGridDays = useMemo(() => {
    if (!selectedMonth) return [];
    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr); // 1-indexed

    // First day index (0 = Sunday, 1 = Monday, etc.)
    const firstDayIndex = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Calculate total spent per day in this month to compute heatmap intensity
    const spentPerDay = {};
    let maxDaySpent = 0;
    
    const monthlyExpenses = allTransactions?.filter(
      (t) => t.date?.startsWith(selectedMonth) && t.type === "Expense"
    ) || [];

    monthlyExpenses.forEach((t) => {
      spentPerDay[t.date] = (spentPerDay[t.date] || 0) + t.amount;
      if (spentPerDay[t.date] > maxDaySpent) {
        maxDaySpent = spentPerDay[t.date];
      }
    });

    const dates = [];

    // Add padding days for the start of the week
    for (let i = 0; i < firstDayIndex; i++) {
      dates.push({ isPadding: true });
    }

    // Add actual days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yearStr}-${monthStr}-${String(d).padStart(2, "0")}`;
      const spent = spentPerDay[dateStr] || 0;
      const intensity = maxDaySpent > 0 ? spent / maxDaySpent : 0;
      const hasTx = allTransactions?.some((t) => t.date === dateStr);

      dates.push({
        isPadding: false,
        dateStr,
        dayNum: d,
        isActive: dateStr === selectedDate,
        isToday: dateStr === new Date().toISOString().slice(0, 10),
        spent,
        intensity,
        hasTx,
      });
    }
    return dates;
  }, [selectedMonth, selectedDate, allTransactions]);

  // Sync selectedDate with selectedMonth changes
  useEffect(() => {
    if (!selectedMonth) return;
    const [y, m] = selectedMonth.split("-");
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

    if (parseInt(y) === currentYear && m === currentMonth) {
      const todayStr = `${currentYear}-${currentMonth}-${String(now.getDate()).padStart(2, "0")}`;
      setSelectedDate(todayStr);
    } else {
      setSelectedDate(`${y}-${m}-01`);
    }
  }, [selectedMonth]);
  // Filter transactions for selected calendar date
  const selectedDateTxs = useMemo(() => {
    return allTransactions.filter((t) => t.date === selectedDate);
  }, [allTransactions, selectedDate]);

  // Filtered transactions for search + filter in transactions tab
  const filteredTxs = useMemo(() => {
    return monthlyData.txs.filter((t) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        t.note?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query) ||
        t.amount.toString().includes(query);

      const matchesFilter =
        txFilter === "Semua" ||
        (txFilter === "Pengeluaran" && t.type === "Expense") ||
        (txFilter === "Pemasukan" && t.type === "Income");

      return matchesSearch && matchesFilter;
    });
  }, [monthlyData.txs, searchQuery, txFilter]);

  // Group transactions by date for list view
  const groupedTxs = useMemo(() => {
    const groups = {};
    const sorted = [...filteredTxs].sort((a, b) => {
      return sortOrder === "newest" 
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date);
    });
    for (const t of sorted) {
      if (!groups[t.date]) {
        groups[t.date] = [];
      }
      groups[t.date].push(t);
    }
    return Object.entries(groups);
  }, [filteredTxs, sortOrder]);

  // Summaries
  const totalBudgetLimit = (data.budgets || []).reduce((sum, b) => sum + b.budget, 0) || 1;
  const totalBudgetPct = Math.min(Math.round((monthlyData.expense / totalBudgetLimit) * 100), 100);
  const balance = monthlyData.income - monthlyData.expense;

  // Budget health
  const budgetColor =
    totalBudgetPct >= 100 ? "#FF3B30" : totalBudgetPct >= 80 ? "#FF9500" : "#AF52DE";
  const budgetStatus =
    totalBudgetPct >= 100 ? "Over!" : totalBudgetPct >= 80 ? "Waspada" : "Aman";

  // Donut segments for mini donut
  const donutSegments = useMemo(() => {
    return donutData.map((d) => ({ value: d.value, color: d.color }));
  }, [donutData]);

  // ─── Smart Notification Engine ─────────────────────────────────────────
  const notifications = useMemo(() => {
    const alerts = [];

    // 1. Per-category budget alerts (Over ≥100% / Warning ≥80%)
    categoryData.forEach((c) => {
      if (c.budget > 0 && c.percentage >= 100) {
        alerts.push({
          id: `budget-over-${c.category}`,
          type: "danger",
          emoji: "🚨",
          title: "Anggaran Melebihi Batas",
          message: `Kategori ${c.category} sudah terpakai ${Math.round(c.percentage)}%.`,
          detail: `${formatRupiah(c.spent)} / ${formatRupiah(c.budget)}`,
          priority: 1,
        });
      } else if (c.budget > 0 && c.percentage >= 80) {
        alerts.push({
          id: `budget-warn-${c.category}`,
          type: "warning",
          emoji: "⚠️",
          title: "Anggaran Hampir Habis",
          message: `Kategori ${c.category} sudah terpakai ${Math.round(c.percentage)}%.`,
          detail: `${formatRupiah(c.spent)} / ${formatRupiah(c.budget)}`,
          priority: 2,
        });
      }
    });

    // 2. Savings target miss
    if (savingsTarget > 0 && balance < savingsTarget) {
      const gap = savingsTarget - balance;
      const savingsPct = Math.round((balance / savingsTarget) * 100);
      alerts.push({
        id: "savings-target-miss",
        type: balance < 0 ? "danger" : "warning",
        emoji: "🐷",
        title: "Target Tabungan Belum Tercapai",
        message: `Sisa saldo kamu ${formatRupiah(balance)}, masih kurang ${formatRupiah(gap)} dari target ${formatRupiah(savingsTarget)}.`,
        detail: `Progres: ${Math.max(savingsPct, 0)}%`,
        priority: 3,
      });
    }

    // 3. Total budget limit breach (overall ≥80%)
    const realTotalBudgetLimit = (data.budgets || []).reduce((s, b) => s + b.budget, 0);
    if (realTotalBudgetLimit > 0) {
      const overallPct = Math.round((monthlyData.expense / realTotalBudgetLimit) * 100);
      if (overallPct >= 100) {
        alerts.push({
          id: "total-budget-over",
          type: "danger",
          emoji: "💥",
          title: "Total Anggaran Meledak!",
          message: `Total pengeluaran sudah ${overallPct}% dari keseluruhan budget yang kamu atur.`,
          detail: `${formatRupiah(monthlyData.expense)} / ${formatRupiah(realTotalBudgetLimit)}`,
          priority: 1,
        });
      } else if (overallPct >= 80) {
        alerts.push({
          id: "total-budget-warn",
          type: "warning",
          emoji: "📊",
          title: "Total Anggaran Hampir Penuh",
          message: `Total pengeluaran sudah mencapai ${overallPct}% dari keseluruhan budget.`,
          detail: `${formatRupiah(monthlyData.expense)} / ${formatRupiah(realTotalBudgetLimit)}`,
          priority: 2,
        });
      }
    }

    // 4. MoM spending spike (>20% increase)
    if (stats && stats.prevSpent > 0 && stats.currentSpent > 0) {
      const momPct = Math.round(stats.momPercentage);
      if (momPct > 20) {
        alerts.push({
          id: "mom-spike",
          type: "info",
          emoji: "🔥",
          title: "Pengeluaran Naik Drastis",
          message: `Pengeluaran bulan ini naik ${momPct}% dibanding bulan lalu.`,
          detail: `${formatRupiah(stats.currentSpent)} vs ${formatRupiah(stats.prevSpent)}`,
          priority: 4,
        });
      }
    }

    // 5. Zero income warning
    if (monthlyData.income === 0 && monthlyData.expense > 0) {
      alerts.push({
        id: "no-income",
        type: "info",
        emoji: "💸",
        title: "Belum Ada Pemasukan",
        message: `Kamu belum mencatat pemasukan bulan ini, tapi sudah ada pengeluaran ${formatRupiah(monthlyData.expense)}.`,
        detail: "Catat pemasukan agar saldo akurat",
        priority: 5,
      });
    }

    // 6. Savings target achieved (positive notification)
    if (savingsTarget > 0 && balance >= savingsTarget) {
      alerts.push({
        id: "savings-achieved",
        type: "success",
        emoji: "🎉",
        title: "Target Tabungan Tercapai!",
        message: `Selamat! Sisa saldo kamu ${formatRupiah(balance)} sudah memenuhi target ${formatRupiah(savingsTarget)}.`,
        detail: "Pertahankan kebiasaan ini!",
        priority: 10,
      });
    }

    // Sort by priority (lower = more urgent)
    alerts.sort((a, b) => a.priority - b.priority);

    return alerts;
  }, [categoryData, savingsTarget, balance, data.budgets, monthlyData, stats]);

  // ─── Tab Content Renderers ──────────────────────────────────────────────

  const greeting = getGreeting();
  const greetingEmoji = getGreetingEmoji();

  // ═══════════════════════════════════════════════════════════════════════════
  //                              RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className={`relative max-w-[480px] mx-auto min-h-screen pb-28 overflow-x-hidden flex flex-col transition-colors duration-300 ${isDarkMode ? "dark bg-[#09090B] text-zinc-100" : "bg-[#F5F5FA] text-ink"}`}>
      <div className="flex-1">
        {/* ────────────────────────────────────────────────────────────────── */}
        {/*  TAB 1: HOME                                                      */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {activeTab === "home" && (
          <div className="animate-fade-in">
            {/* Header */}
            <header className="px-5 pt-5 pb-3 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1C1C1E] to-[#3A3A3C] dark:from-[#3A3A3C] dark:to-[#555] text-white flex items-center justify-center font-extrabold shadow-float text-xs active:scale-95 transition shrink-0"
                >
                  {userName ? userName.slice(0, 2).toUpperCase() : "CL"}
                </button>
                <div>
                  <p className="text-[10px] text-secondary dark:text-zinc-400 font-bold uppercase tracking-wider">
                    {greeting} {greetingEmoji}
                  </p>
                  <h2 className="font-black text-ink dark:text-zinc-100 text-[15px] leading-tight -mt-0.5">{userName}</h2>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("transactions")}
                  className="w-10 h-10 rounded-2xl bg-surface dark:bg-zinc-800 border border-separator/40 dark:border-zinc-700/80 flex items-center justify-center text-ink dark:text-zinc-100 shadow-card card-interactive"
                >
                  <Search className="w-4 h-4" />
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setShowNotificationsModal(true)}
                    className="w-10 h-10 rounded-2xl bg-surface dark:bg-zinc-800 border border-separator/40 dark:border-zinc-700/80 flex items-center justify-center text-ink dark:text-zinc-100 shadow-card card-interactive"
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                  {notifications.filter(n => n.type === "danger" || n.type === "warning").length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red border-2 border-surface dark:border-[#09090B] rounded-full badge-pulse">
                      <span className="text-[8px] text-white font-black leading-none">{notifications.filter(n => n.type === "danger" || n.type === "warning").length}</span>
                    </span>
                  )}
                </div>
              </div>
            </header>

            {/* Unified Cash Overview Card (Consolidates Limit Progress, Masuk/Keluar/Sisa Saldo & Total Budget) */}
            <section className="px-5 mb-5 animate-slide-up stagger-1" style={{ opacity: 0, animationFillMode: "forwards" }}>
              <div className="relative overflow-hidden bg-gradient-to-br from-[#F5EEFA] via-[#EDE4FB] to-[#F5EEFA] border border-violet/15 rounded-[28px] p-5 shadow-card">
                {/* Decorative background element */}
                <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-violet/5"></div>

                <div className="flex items-center justify-between relative z-10 gap-2">
                  {/* Left Column: Sisa Saldo + Masuk, Keluar & Budget Row */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <span className="text-[8px] bg-violet/10 text-violet font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block">
                        Ringkasan Saldo ({shortMonthLabel})
                      </span>
                      <h3 className="text-2xl font-black tracking-tight text-ink mt-2 leading-none">
                        <AnimatedNumber value={balance} prefix="Rp" />
                      </h3>
                      <p className="text-secondary text-[8px] font-bold mt-1 uppercase tracking-wide">Sisa Saldo Kas</p>
                    </div>

                    {/* Sub-row of Masuk, Keluar & Total Budget */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-violet/10">
                      <div>
                        <div className="flex items-center gap-1 text-[8px] font-bold text-green uppercase tracking-wider">
                          <TrendingUp className="w-2.5 h-2.5" />
                          <span>Masuk</span>
                        </div>
                        <p className="text-xs font-black text-ink mt-0.5">
                          {formatCompact(monthlyData.income)}
                        </p>
                      </div>

                      <div className="border-l border-violet/10 h-5"></div>

                      <div>
                        <div className="flex items-center gap-1 text-[8px] font-bold text-red uppercase tracking-wider">
                          <TrendingDown className="w-2.5 h-2.5" />
                          <span>Keluar</span>
                        </div>
                        <p className="text-xs font-black text-ink mt-0.5">
                          {formatCompact(monthlyData.expense)}
                        </p>
                      </div>

                      <div className="border-l border-violet/10 h-5"></div>

                      <div>
                        <div className="flex items-center gap-1 text-[8px] font-bold text-violet uppercase tracking-wider">
                          <PiggyBank className="w-2.5 h-2.5" />
                          <span>Budget</span>
                        </div>
                        <p className="text-xs font-black text-ink mt-0.5">
                          {formatCompact(totalBudgetLimit)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Batas Kas Terpakai Progress Ring */}
                  <div className="flex flex-col items-center shrink-0 pl-3 border-l border-violet/10">
                    <CircularProgress
                      percentage={totalBudgetPct}
                      label={`${totalBudgetPct}%`}
                      sublabel="spent"
                      color={budgetColor}
                      size={76}
                    />
                    <span className="text-[8px] font-bold text-secondary uppercase tracking-widest mt-2">Batas Kas</span>
                    <span
                      className="text-[8px] font-extrabold px-2 py-0.5 rounded-full mt-1"
                      style={{
                        color: budgetColor,
                        backgroundColor: `${budgetColor}15`,
                      }}
                    >
                      {budgetStatus}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Unified Calendar & Agenda list (Google Calendar Style) */}
            <section className="px-5 mb-5 animate-slide-up stagger-2" style={{ opacity: 0, animationFillMode: "forwards" }}>
              <div className="bg-surface border border-separator/30 rounded-3xl shadow-card overflow-hidden">
                {/* Top part: Calendar grid */}
                <div className="p-4">
                  {/* Integrated Month Switcher Header */}
                  <div className="flex items-center justify-between mb-4 border-b border-separator/20 pb-3">
                    <button
                      onClick={() => changeMonth("prev")}
                      className="w-8 h-8 rounded-xl bg-bg flex items-center justify-center active:scale-90 transition card-interactive"
                    >
                      <ChevronLeft className="w-4 h-4 text-ink" />
                    </button>
                    <span className="text-sm font-black text-ink tracking-tight">{currentMonthLabel}</span>
                    <button
                      onClick={() => changeMonth("next")}
                      className="w-8 h-8 rounded-xl bg-bg flex items-center justify-center active:scale-90 transition card-interactive"
                    >
                      <ChevronRight className="w-4 h-4 text-ink" />
                    </button>
                  </div>

                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
                      <span key={d} className="text-[10px] font-bold text-secondary uppercase tracking-wider py-1">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {calendarGridDays.map((day, idx) => {
                      if (day.isPadding) {
                        return <div key={`pad-${idx}`} className="aspect-square" />;
                      }

                      // Compute styles dynamically for heatmap
                      const hasSpend = day.spent > 0;
                      const alpha = 0.1 + day.intensity * 0.8;
                      const cellBg = hasSpend 
                        ? `rgba(255, 59, 48, ${alpha})` 
                        : (isDarkMode ? "#1C1C1E" : "#FFFFFF");

                      const textClass = day.isActive
                        ? (day.intensity > 0.55 ? "text-white font-black" : (isDarkMode ? "text-zinc-100 font-black" : "text-ink font-black"))
                        : (day.intensity > 0.55 ? "text-white font-bold" : (isDarkMode ? "text-zinc-300 font-semibold" : "text-ink font-semibold"));

                      const borderClass = day.isActive
                        ? `ring-2 ${isDarkMode ? "ring-zinc-100" : "ring-ink"} ring-offset-1 z-10 scale-[1.03]`
                        : (day.isToday ? "border border-blue" : (isDarkMode ? "border border-zinc-800" : "border border-separator/20"));

                      return (
                        <button
                          key={day.dateStr}
                          onClick={() => setSelectedDate(day.dateStr)}
                          className={`flex flex-col items-center justify-center rounded-xl aspect-square relative active:scale-95 transition-all duration-150 ${borderClass}`}
                          style={{ backgroundColor: cellBg }}
                        >
                          <span className={`text-xs tracking-tight ${textClass}`}>{day.dayNum}</span>
                          {/* Transaction indicator dot */}
                          {day.hasTx && !hasSpend && (
                            <div className="absolute bottom-1 w-1 h-1 rounded-full bg-green animate-pulse"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom part: Agenda detail list for selected date */}
                <div className="bg-[#F8F9FA] border-t border-separator/35 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-extrabold text-secondary uppercase tracking-wider pl-0.5">
                      Detail Transaksi — {formattedSelectedDate}
                    </span>
                    {selectedDateTxs.length > 0 && (
                      <span className="text-[9px] font-black bg-blue/10 text-blue px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {selectedDateTxs.length} Transaksi
                      </span>
                    )}
                  </div>

                  {selectedDateTxs.length === 0 ? (
                    <div className="py-6 text-center">
                      <span className="text-xl block mb-1">📭</span>
                      <p className="text-secondary text-[11px] font-semibold">
                        Tidak ada transaksi di tanggal ini.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDateTxs.map((t, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedTxForDetail(t)}
                          className="flex items-center justify-between p-3.5 bg-white border border-separator/20 rounded-2xl shadow-sm cursor-pointer active:bg-bg/40 transition hover:border-separator/40 hover:shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                              style={{
                                backgroundColor: `${COLORS[t.category] || "#8E8E93"}12`,
                              }}
                            >
                              {getCategoryEmoji(t.category)}
                            </div>
                            <div>
                              <p className="font-bold text-ink text-xs leading-tight">{t.note || t.category}</p>
                              <p className="text-[9px] text-secondary font-semibold mt-0.5">{t.category}</p>
                            </div>
                          </div>
                          <span
                            className={`font-extrabold text-xs tabular-nums ${
                              t.type === "Expense" ? "text-red" : "text-green"
                            }`}
                          >
                            {t.type === "Expense" ? "-" : "+"}
                            {formatRupiah(t.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Spending Breakdown Card */}
            <section className="px-5 mb-5 animate-slide-up stagger-3" style={{ opacity: 0, animationFillMode: "forwards" }}>
              <div className="bg-surface rounded-3xl p-4 border border-separator/30 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-ink text-[13px]">Pengeluaran Terbanyak</h3>
                  <MiniDonut segments={donutSegments} size={36} />
                </div>

                 {/* Top 3 categories */}
                <div className="space-y-2.5">
                  {categoryData.filter(c => c.spent > 0).length === 0 ? (
                    <div className="text-center py-6">
                      <span className="text-2xl block mb-1.5">📊</span>
                      <p className="text-secondary text-[11px] font-semibold">Belum ada pengeluaran bulan ini.</p>
                      <p className="text-secondary text-[8.5px] font-medium mt-0.5 max-w-[220px] mx-auto leading-normal">
                        Mulai mencatat pengeluaran di Telegram bot untuk memantau breakdown di sini.
                      </p>
                    </div>
                  ) : (
                    [...categoryData]
                      .filter(c => c.spent > 0)
                      .sort((a, b) => b.spent - a.spent)
                      .slice(0, 3)
                      .map((c, idx) => {
                        const pct = c.budget ? Math.min((c.spent / c.budget) * 100, 100) : 0;
                        const catColor = COLORS[c.category] || "#8E8E93";
                        return (
                          <div key={c.category} className={`animate-slide-up stagger-${idx + 1}`} style={{ opacity: 0, animationFillMode: "forwards" }}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{getCategoryEmoji(c.category)}</span>
                                <span className="text-[11px] font-bold text-ink dark:text-zinc-200">{c.category}</span>
                              </div>
                              <span className="text-[10px] font-bold text-secondary">{formatRupiah(c.spent)}</span>
                            </div>
                            {c.budget > 0 && (
                              <div className="h-1.5 bg-separator/40 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: catColor,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>

                <button
                  onClick={() => setActiveTab("budgets")}
                  className="w-full mt-3 text-[10px] font-bold text-violet text-center py-2 rounded-xl bg-violet/5 active:bg-violet/10 transition"
                >
                  Lihat Semua Budget →
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────── */}
        {/*  TAB 2: BUDGETS                                                    */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {activeTab === "budgets" && (
          <div className="animate-fade-in p-5">
            <div className="flex justify-between items-center mb-5">
              <div>
                <span className="text-[10px] font-semibold tracking-wider text-secondary uppercase">Buku Keuangan</span>
                <h1 className="text-2xl font-black text-ink tracking-tight">Monitor Budget</h1>
              </div>
              <button
                onClick={() => {
                  setNewCatName("");
                  setNewCatBudget("");
                  setNewCatEmoji("");
                  setShowAddModal(true);
                }}
                className="h-9 px-3 rounded-xl bg-violet/10 text-violet font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kategori</span>
              </button>
            </div>

            {/* Unified Category Budget Card */}
            <section className="mb-5 animate-fade-in">
              {categoryData.length === 0 ? (
                <div className="bg-surface dark:bg-zinc-900 border border-separator/30 dark:border-zinc-800/80 rounded-3xl p-8 text-center shadow-card flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-violet/10 flex items-center justify-center mb-3">
                    <PiggyBank className="w-6 h-6 text-violet" />
                  </div>
                  <h3 className="text-xs font-black text-ink dark:text-zinc-200">Belum Ada Budget</h3>
                  <p className="text-[10px] text-secondary dark:text-zinc-400 mt-1 max-w-[220px] leading-normal mx-auto">
                    Atur batas pengeluaran bulanan kategori lewat Telegram bot atau tambah langsung menggunakan tombol di atas.
                  </p>
                </div>
              ) : (
                <div className="bg-surface rounded-3xl border border-separator/30 shadow-card overflow-hidden divide-y divide-separator/20">
                  {categoryData.map((c) => {
                    const isOver = c.percentage >= 100;
                    const isWarning = c.percentage >= 80 && c.percentage < 100;
                    const catColor = COLORS[c.category] || "#8E8E93";

                    let statusLabel = "Aman";
                    let statusColor = "#34C759";
                    let barClass = "progress-fill-gradient-green";

                    if (isOver) {
                      statusLabel = "Over Budget";
                      statusColor = "#FF3B30";
                      barClass = "progress-fill-gradient-red";
                    } else if (isWarning) {
                      statusLabel = "Waspada";
                      statusColor = "#FF9500";
                      barClass = "progress-fill-gradient-orange";
                    }

                    return (
                      <div
                        key={c.category}
                        onClick={() => {
                          setEditingCategory(c);
                          setEditBudgetAmount(c.budget.toString());
                        }}
                        className="p-4 bg-surface active:bg-bg/40 transition card-interactive cursor-pointer"
                      >
                        <div className="flex justify-between items-center mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                              style={{ backgroundColor: `${catColor}12` }}
                            >
                              {getCategoryEmoji(c.category)}
                            </div>
                            <div>
                              <span className="font-bold text-ink text-xs">{c.category}</span>
                              <p className="text-[9px] text-secondary font-semibold mt-0.5">
                                {formatRupiah(c.spent)}{c.budget > 0 ? ` / ${formatRupiah(c.budget)}` : ""}
                              </p>
                            </div>
                          </div>
                          <span
                            className="text-[8px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              color: statusColor,
                              backgroundColor: `${statusColor}12`,
                            }}
                          >
                            {c.budget > 0 ? statusLabel : "—"}
                          </span>
                        </div>

                        {c.budget > 0 ? (
                          <div>
                            <div className="progress-bar mb-1.5 bg-separator/40 h-[6px] rounded-full overflow-hidden">
                              <div
                                className={`progress-fill h-full rounded-full ${barClass}`}
                                style={{ width: `${Math.min(c.percentage, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-bold" style={{ color: statusColor }}>
                                {Math.round(c.percentage)}% Terpakai
                              </span>
                              <span className="text-[9px] text-secondary font-semibold">
                                Sisa: {c.budget - c.spent > 0 ? formatRupiah(c.budget - c.spent) : "Rp0"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[9px] text-secondary italic bg-bg rounded-xl px-3 py-2">
                            Budget belum diatur. Ketuk untuk mengatur budget.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────── */}
        {/*  TAB 3: TRANSACTIONS                                               */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {activeTab === "transactions" && (
          <div className="animate-fade-in p-5">
            <header className="mb-4 flex justify-between items-end">
              <div>
                <span className="text-[10px] font-semibold tracking-wider text-secondary uppercase">Riwayat</span>
                <h1 className="text-2xl font-black text-ink tracking-tight">Transaksi</h1>
              </div>
              <button
                onClick={() => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
                className="w-10 h-10 rounded-2xl bg-surface border border-separator/40 flex items-center justify-center text-ink shadow-card card-interactive"
                title={sortOrder === "newest" ? "Urutkan Terlama" : "Urutkan Terbaru"}
              >
                <ArrowUpDown className={`w-4 h-4 transition-transform duration-300 ${sortOrder === "oldest" ? "rotate-180 text-violet" : "text-ink"}`} />
              </button>
            </header>

            {/* Search bar */}
            <div className="relative w-full mb-4">
              <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-surface border border-separator/40 rounded-2xl text-xs font-medium focus:outline-none focus:border-violet focus:shadow-glow-violet/20 transition shadow-card"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-separator/60 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-secondary" />
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-none pb-1">
              {["Semua", "Pengeluaran", "Pemasukan"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTxFilter(filter)}
                  className={`chip whitespace-nowrap ${txFilter === filter ? "chip-active" : ""}`}
                >
                  {filter === "Pengeluaran" && "💸 "}
                  {filter === "Pemasukan" && "💰 "}
                  {filter}
                </button>
              ))}
            </div>

            {/* Results count */}
            <p className="text-[9px] font-bold text-secondary uppercase tracking-wider mb-3 pl-1">
              {filteredTxs.length} transaksi ditemukan
            </p>

            {/* Grouped Lists */}
            <section className="space-y-5">
              {groupedTxs.length === 0 ? (
                <div className="bg-surface dark:bg-zinc-900 border border-separator/30 dark:border-zinc-800/80 rounded-3xl p-8 text-center shadow-card flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-orange/10 flex items-center justify-center mb-3">
                    <TrendingDown className="w-5 h-5 text-orange" />
                  </div>
                  <h3 className="text-xs font-black text-ink dark:text-zinc-200">Belum Ada Transaksi</h3>
                  <p className="text-[10px] text-secondary dark:text-zinc-400 mt-1 max-w-[220px] leading-normal mx-auto">
                    Semua transaksi masuk dan keluar yang kamu catat via bot Telegram atau web akan muncul di sini.
                  </p>
                </div>
              ) : (
                groupedTxs.map(([date, txs]) => {
                  const d = new Date(date);
                  const options = { weekday: "long", day: "numeric", month: "short" };
                  const dateStr = d.toLocaleDateString("id-ID", options);
                  return (
                    <div key={date} className="space-y-2">
                      <div className="px-1 py-0.5">
                        <h4 className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                          {dateStr}
                        </h4>
                      </div>
                      <div className="bg-surface border border-separator/30 rounded-3xl overflow-hidden divide-y divide-separator/30 shadow-card">
                        {txs.map((t, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedTxForDetail(t)}
                            className="flex items-center justify-between p-4 bg-surface cursor-pointer active:bg-bg/40 transition hover:bg-bg/20 card-interactive"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg"
                                style={{
                                  backgroundColor: `${COLORS[t.category] || "#8E8E93"}12`,
                                }}
                              >
                                {getCategoryEmoji(t.category)}
                              </div>
                              <div>
                                <p className="font-bold text-ink text-xs leading-tight">
                                  {t.note || t.category}
                                </p>
                                <p className="text-[9px] text-secondary font-semibold mt-0.5">{t.category}</p>
                              </div>
                            </div>
                            <span
                              className={`font-extrabold text-xs tabular-nums ${
                                t.type === "Expense" ? "text-red" : "text-green"
                              }`}
                            >
                              {t.type === "Expense" ? "-" : "+"}
                              {formatRupiah(t.amount)}
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

        {/* ────────────────────────────────────────────────────────────────── */}
        {/*  TAB 4: INSIGHTS                                                   */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {activeTab === "insights" && (
          <div className="animate-fade-in p-5">
            <header className="mb-5 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-semibold tracking-wider text-secondary uppercase">Analisis</span>
                <h1 className="text-2xl font-black text-ink tracking-tight">Tren & Pola</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeMonth("prev")}
                  className="p-1.5 rounded-xl bg-surface border border-separator/40 shadow-card active:scale-90 transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-bold text-ink min-w-[60px] text-center">{shortMonthLabel}</span>
                <button
                  onClick={() => changeMonth("next")}
                  className="p-1.5 rounded-xl bg-surface border border-separator/40 shadow-card active:scale-90 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </header>

            {/* Date Range Selector & Export Action Card */}
            <section className="bg-surface border border-separator/30 rounded-3xl p-4 shadow-card mb-5">
              <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block mb-3">
                Pengaturan Tanggal & Laporan
              </span>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="text-[9px] text-secondary font-bold block mb-1">DARI</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-bg border border-separator/40 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-secondary font-bold block mb-1">SAMPAI</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-bg border border-separator/40 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>
              <a
                href={`/api/export?start=${startDate}&end=${endDate}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet text-white rounded-xl font-bold text-xs shadow-glow-violet/15 active:opacity-90 transition"
              >
                <Download className="w-4 h-4" />
                <span>Export Laporan Excel</span>
              </a>
            </section>


            {allTransactions.length === 0 ? (
              <div className="bg-surface dark:bg-zinc-900 border border-separator/30 dark:border-zinc-800/80 rounded-3xl p-8 text-center shadow-card flex flex-col items-center mt-5">
                <div className="w-12 h-12 rounded-full bg-blue/10 flex items-center justify-center mb-3">
                  <BarChart3 className="w-5 h-5 text-blue" />
                </div>
                <h3 className="text-xs font-black text-ink dark:text-zinc-200">Analisis Belum Siap</h3>
                <p className="text-[10px] text-secondary dark:text-zinc-400 mt-1 max-w-[220px] leading-normal mx-auto">
                  Catat beberapa transaksi bulan ini untuk melihat grafik tren dan rasio tabungan kamu.
                </p>
              </div>
            ) : stats && (
              <div className="space-y-5">
                {/* Trend Chart */}
                <div className="bg-surface border border-separator/30 rounded-3xl p-4 shadow-card">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">
                      Tren 6 Bulan
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green"></div>
                        <span className="text-[8px] text-secondary font-bold">Masuk</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red"></div>
                        <span className="text-[8px] text-secondary font-bold">Keluar</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 10, right: 5, left: -28, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colIncomeMobile" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#34C759" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#34C759" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colExpenseMobile" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#FF3B30" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#E5E5EA" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 9, fill: "#8E8E93" }}
                          tickFormatter={(v) => {
                            const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
                            const m = parseInt(v.split("-")[1]);
                            return months[m - 1] || v;
                          }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`}
                          tick={{ fontSize: 8, fill: "#8E8E93" }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(255,255,255,0.95)",
                            border: "none",
                            borderRadius: "12px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                            fontSize: "10px",
                            fontWeight: 600,
                          }}
                          formatter={(value) => formatRupiah(value)}
                        />
                        <Area
                          type="monotone"
                          dataKey="Pemasukan"
                          stroke="#34C759"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colIncomeMobile)"
                          dot={false}
                          activeDot={{ r: 4, fill: "#34C759" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="Pengeluaran"
                          stroke="#FF3B30"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colExpenseMobile)"
                          dot={false}
                          activeDot={{ r: 4, fill: "#FF3B30" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Savings Rate */}
                  <div className="bg-surface border border-separator/30 rounded-3xl p-4 shadow-card">
                    <div className="flex justify-between items-center mb-2">
                      <PiggyBank className="w-4 h-4 text-green" />
                      <span className="text-[8px] text-secondary font-bold uppercase tracking-wider">
                        Savings
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-ink tracking-tight">
                      <AnimatedNumber value={Math.round(stats.savingsRate)} suffix="%" />
                    </h3>
                    <p className="text-secondary text-[8px] font-bold mt-1">
                      {stats.savingsRate >= 20 ? "🟢 Sehat" : stats.savingsRate >= 10 ? "🟡 Cukup" : "🔴 Rendah"}
                    </p>
                  </div>

                  {/* Daily Average */}
                  <div className="bg-surface border border-separator/30 rounded-3xl p-4 shadow-card">
                    <div className="flex justify-between items-center mb-2">
                      <Flame className="w-4 h-4 text-orange" />
                      <span className="text-[8px] text-secondary font-bold uppercase tracking-wider">
                        Rata-rata/Hari
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-ink tracking-tight">
                      {formatCompact(stats.dailyAvg)}
                    </h3>
                    <p className="text-secondary text-[8px] font-bold mt-1">Per hari transaksi</p>
                  </div>

                  {/* MoM Change - With previous month existence validation */}
                  <div className="bg-surface border border-separator/30 rounded-3xl p-4 shadow-card">
                    <div className="flex justify-between items-center mb-2">
                      <BarChart3 className="w-4 h-4 text-blue" />
                      <span className="text-[8px] text-secondary font-bold uppercase tracking-wider">
                        vs Bulan Lalu
                      </span>
                    </div>
                    {stats.currentSpent === 0 ? (
                      <div className="mt-1">
                        <span className="text-[11px] font-bold text-secondary">Belum ada data</span>
                        <p className="text-[7.5px] text-secondary/70 font-semibold mt-0.5 leading-tight">
                          Belum ada transaksi tercatat di bulan ini.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h3
                          className={`text-2xl font-black tracking-tight ${
                            stats.momDiff <= 0 ? "text-green" : "text-red"
                          }`}
                        >
                          {stats.momDiff <= 0 ? "▼" : "▲"} {Math.abs(Math.round(stats.momPercentage))}%
                        </h3>
                        <p className="text-secondary text-[8px] font-bold mt-1">
                          {stats.prevSpent === 0 
                            ? "vs Rp0 bulan lalu" 
                            : (stats.momDiff <= 0 ? "Lebih hemat" : "Lebih boros")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Biggest Category */}
                  <div className="bg-surface border border-separator/30 rounded-3xl p-4 shadow-card">
                    <div className="flex justify-between items-center mb-2">
                      <Coffee className="w-4 h-4 text-red" />
                      <span className="text-[8px] text-secondary font-bold uppercase tracking-wider">
                        Terboros
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-ink tracking-tight leading-tight">
                      {stats?.largestCategory ? stats.largestCategory[0] : "—"}
                    </h3>
                    <p className="text-secondary text-[8px] font-bold mt-1">
                      {stats?.largestCategory ? formatRupiah(stats.largestCategory[1]) : "Rp0"}
                    </p>
                  </div>
                </div>

                {/* Savings Goal Progress */}
                <div className="bg-surface dark:bg-zinc-900 border border-separator/30 dark:border-zinc-800/80 rounded-3xl p-4 shadow-card">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">Target Tabungan Bulanan</span>
                    <span className="text-[9px] font-black bg-green/10 text-green px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {savingsTarget > 0 ? `${Math.round(Math.max((monthlyData.income - monthlyData.expense) / savingsTarget * 100, 0))}%` : "0%"}
                    </span>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-secondary text-[9px] font-bold uppercase">Terkumpul</p>
                      <h4 className="text-lg font-black text-ink dark:text-zinc-100 mt-0.5 leading-none">
                        {formatRupiah(Math.max(monthlyData.income - monthlyData.expense, 0))}
                      </h4>
                    </div>
                    {isEditingSavingsTarget ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <p className="text-secondary text-[9px] font-bold uppercase">Target</p>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={tempSavingsTarget}
                            onChange={(e) => setTempSavingsTarget(e.target.value)}
                            className="bg-[#F2F2F7] dark:bg-zinc-800 rounded-xl px-2 py-0.5 text-xs font-bold text-ink dark:text-zinc-200 w-20 text-right focus:outline-none focus:ring-1 focus:ring-violet"
                          />
                          <button
                            onClick={() => {
                              const val = parseFloat(tempSavingsTarget);
                              if (!isNaN(val)) {
                                setSavingsTarget(val);
                              }
                              setIsEditingSavingsTarget(false);
                            }}
                            className="px-2 py-0.5 bg-violet text-white rounded-lg text-[9px] font-bold uppercase active:scale-95 transition"
                          >
                            OK
                          </button>
                          <button
                            onClick={() => {
                              setTempSavingsTarget(savingsTarget.toString());
                              setIsEditingSavingsTarget(false);
                            }}
                            className="px-2 py-0.5 bg-[#E5E5EA] dark:bg-zinc-800 text-secondary rounded-lg text-[9px] font-bold uppercase active:scale-95 transition"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-secondary text-[9px] font-bold uppercase">Target</p>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <p className="text-xs font-black text-ink dark:text-zinc-200">{formatRupiah(savingsTarget)}</p>
                          <button
                            onClick={() => setIsEditingSavingsTarget(true)}
                            className="p-1 hover:bg-violet/10 text-violet rounded-lg transition"
                            title="Edit Target"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="progress-bar bg-separator/40 h-[6px] rounded-full overflow-hidden mb-1">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-green to-teal transition-all duration-700"
                      style={{ 
                        width: `${Math.min(Math.max(((monthlyData.income - monthlyData.expense) / (savingsTarget || 1)) * 100, 0), 100)}%` 
                      }}
                    />
                  </div>
                  <p className="text-[9px] text-secondary italic mt-1.5 pl-0.5">
                    {(monthlyData.income - monthlyData.expense) >= savingsTarget 
                      ? "🎉 Selamat! Target tabungan bulan ini tercapai!" 
                      : (monthlyData.income - monthlyData.expense) <= 0 
                        ? "⚠️ Tabungan kamu nihil. Kurangi pengeluaran agar bisa menabung!" 
                        : `Sisa ${formatRupiah(savingsTarget - (monthlyData.income - monthlyData.expense))} lagi untuk mencapai target.`}
                  </p>
                </div>

                {/* Breakdown Kategori (Pie Chart) */}
                <div className="bg-surface dark:bg-zinc-900 border border-separator/30 dark:border-zinc-800/80 rounded-3xl p-4 shadow-card">
                  <h4 className="font-extrabold text-ink dark:text-zinc-100 text-[13px] mb-3 pl-0.5">Proporsi Pengeluaran</h4>
                  <div className="h-44 w-full flex items-center justify-center">
                    {donutData.length === 0 ? (
                      <p className="text-[11px] text-secondary">Belum ada data pengeluaran.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {donutData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => formatRupiah(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  {/* Mini Legends Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-separator/20 dark:border-zinc-800/60">
                    {donutData.map((d) => {
                      const totalExpense = monthlyData.expense || 1;
                      const pct = Math.round((d.value / totalExpense) * 100);
                      return (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }}></div>
                          <span className="text-[10px] font-bold text-ink dark:text-zinc-300 truncate max-w-[80px]">{getCategoryEmoji(d.name)} {d.name}</span>
                          <span className="text-[9px] text-secondary font-extrabold ml-auto shrink-0">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Category MoM Comparison */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-ink text-[13px] pl-0.5">Perbandingan Kategori</h4>
                  {stats.categoryMoM.map((c, idx) => {
                    const isUp = c.diff > 0;
                    const isNew = c.previous === 0;
                    const catColor = COLORS[c.category] || "#8E8E93";
                    return (
                      <div
                        key={c.category}
                        className={`flex justify-between items-center p-3.5 bg-surface border border-separator/30 rounded-2xl shadow-card card-interactive animate-slide-up stagger-${Math.min(idx + 1, 6)}`}
                        style={{ opacity: 0, animationFillMode: "forwards" }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                            style={{ backgroundColor: `${catColor}12` }}
                          >
                            {getCategoryEmoji(c.category)}
                          </div>
                          <div>
                            <p className="font-bold text-ink text-xs">{c.category}</p>
                            <p className="text-[9px] text-secondary font-semibold">
                              {formatRupiah(c.current)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isNew && (
                            <Sparkline
                              dataPoints={[c.previous, c.current]}
                              color={isUp ? "#FF3B30" : "#34C759"}
                            />
                          )}
                          <span
                            className={`text-[9.5px] font-bold px-2.5 py-1 rounded-full ${
                              isNew 
                                ? "text-blue bg-blue-bg" 
                                : (isUp ? "text-red bg-red-bg" : "text-green bg-green-bg")
                            }`}
                          >
                            {isNew ? "Baru ✨" : `${isUp ? "▲" : "▼"} ${Math.abs(Math.round(c.percentage))}%`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/*  BOTTOM NAVIGATION BAR                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <nav 
        className={`fixed bottom-0 left-0 right-0 z-50 transform will-change-transform ${
          hideNavbar 
            ? "translate-y-[120%] pointer-events-none" 
            : "translate-y-0"
        }`}
        style={{
          transition: "transform 400ms cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <div className="max-w-[480px] mx-auto px-4 pb-[max(env(safe-area-inset-bottom),12px)]">
          <div className={`${isDarkMode ? "glass-dark" : "glass"} h-[64px] rounded-[22px] shadow-float flex items-center justify-around px-3`}>
            {[
              { id: "home", icon: Home, label: "Home" },
              { id: "budgets", icon: Sliders, label: "Budget" },
              { id: "add", icon: Plus, label: "Tambah", isAction: true },
              { id: "transactions", icon: ArrowRightLeft, label: "Riwayat" },
              { id: "insights", icon: Activity, label: "Analisis" },
            ].map(({ id, icon: Icon, label, isAction }) => {
              if (isAction) {
                return (
                  <button
                    key={id}
                    onClick={() => setShowAddTxModal(true)}
                    className="w-12 h-12 rounded-full bg-violet text-white flex items-center justify-center shadow-glow-violet/25 hover:scale-105 active:scale-95 transition-all duration-200 shrink-0 -mt-6 border-[3px] border-white dark:border-[#09090B]"
                  >
                    <Icon className="w-6 h-6 stroke-[2.5]" />
                  </button>
                );
              }
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 py-1.5 px-3 rounded-2xl ${
                    activeTab === id
                      ? "text-violet"
                      : "text-secondary dark:text-zinc-400"
                  }`}
                >
                  <div
                    className={`transition-all duration-300 ${
                      activeTab === id ? "scale-110" : "scale-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[8px] font-bold transition-all duration-300 ${
                    activeTab === id ? "opacity-100" : "opacity-0 h-0"
                  }`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/*  MODALS                                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* Modal 1: Tambah Kategori */}
      {showAddModal && (
        <div className="fixed inset-0 bg-ink/40 dark:bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-surface dark:bg-[#1C1C1E] border border-separator/40 dark:border-zinc-800/80 rounded-[32px] p-6 w-full max-w-xs shadow-float animate-bounce-in text-ink dark:text-zinc-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-sm uppercase tracking-wider">Tambah Kategori</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-zinc-800 flex items-center justify-center active:scale-90 transition"
              >
                <X className="w-4 h-4 text-ink dark:text-zinc-300" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider block mb-1.5 pl-0.5">Nama Kategori</label>
                <input
                  type="text"
                  placeholder="e.g. Kos, Belanja Bulanan"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-[#F2F2F7] dark:bg-zinc-900 border-0 rounded-2xl p-3.5 text-xs font-bold focus:ring-2 focus:ring-violet focus:outline-none transition text-ink dark:text-zinc-100 placeholder-secondary/70"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider block mb-1.5 pl-0.5">Batas Budget Bulanan</label>
                <input
                  type="number"
                  placeholder="Rp0"
                  value={newCatBudget}
                  onChange={(e) => setNewCatBudget(e.target.value)}
                  className="w-full bg-[#F2F2F7] dark:bg-zinc-900 border-0 rounded-2xl p-3.5 text-xs font-bold focus:ring-2 focus:ring-violet focus:outline-none transition text-ink dark:text-zinc-100 placeholder-secondary/70"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider block mb-1.5 pl-0.5">Pilih Emoji</label>
                <div className="flex items-center gap-3 bg-[#F2F2F7] dark:bg-zinc-900 p-3 rounded-2xl border border-separator/20 dark:border-zinc-800">
                  <input
                    type="text"
                    maxLength={2}
                    value={newCatEmoji}
                    onChange={(e) => setNewCatEmoji(e.target.value)}
                    className="w-12 h-12 text-center text-xl bg-white dark:bg-zinc-800 border border-separator/50 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-violet focus:outline-none font-bold text-ink dark:text-zinc-100"
                    placeholder=""
                  />
                  <div className="flex-1">
                    <span className="text-[8px] text-secondary dark:text-zinc-400 font-extrabold uppercase tracking-wider block mb-1">Ketik emoji atau pilih preset:</span>
                    <div className="flex gap-1.5">
                      {["🍔", "🚗", "🛍️", "📱", "🎮", "📌"].map(em => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setNewCatEmoji(em)}
                          className={`w-6 h-6 rounded-md text-xs flex items-center justify-center transition-all ${
                            newCatEmoji === em 
                              ? "bg-violet/10 ring-1 ring-violet scale-105" 
                              : "bg-white dark:bg-zinc-800 border border-separator/30 dark:border-zinc-700 active:scale-90"
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-zinc-800 text-secondary dark:text-zinc-300 font-bold text-xs uppercase tracking-wider active:scale-95 transition"
                >
                  Batal
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (isSubmitting) return;
                    if (!newCatName.trim()) return;
                    const amount = parseFloat(newCatBudget) || 0;
                    const finalEmoji = newCatEmoji.trim() || "📌";
                    setIsSubmitting(true);
                    try {
                      await onAddBudget(newCatName.trim(), amount);
                      saveCustomEmoji(newCatName.trim(), finalEmoji);
                      setShowAddModal(false);
                    } catch (e) {
                      console.error("Gagal menambahkan kategori:", e);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-violet disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider active:scale-95 transition shadow-glow-red"
                  style={{ shadowColor: "#AF52DE" }}
                >
                  {isSubmitting ? "..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Edit / Setup Budget */}
      {editingCategory && (
        <div className="fixed inset-0 bg-ink/40 dark:bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-surface dark:bg-[#1C1C1E] border border-separator/40 dark:border-zinc-800/80 rounded-[32px] p-6 w-full max-w-xs shadow-float animate-bounce-in text-ink dark:text-zinc-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-sm uppercase tracking-wider">Atur Budget</h3>
              <button 
                onClick={() => setEditingCategory(null)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-zinc-800 flex items-center justify-center active:scale-90 transition"
              >
                <X className="w-4 h-4 text-ink dark:text-zinc-300" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#F2F2F7] dark:bg-zinc-900 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-xl shadow-sm">
                  {getCategoryEmoji(editingCategory.category)}
                </div>
                <div>
                  <h4 className="font-bold text-ink dark:text-zinc-100 text-xs">{editingCategory.category}</h4>
                  <p className="text-[9px] text-secondary dark:text-zinc-400 font-semibold mt-0.5">
                    Terpakai: {formatRupiah(editingCategory.spent)}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider block mb-1.5 pl-0.5">Batas Anggaran Bulanan</label>
                <input
                  type="number"
                  placeholder="Rp0"
                  value={editBudgetAmount}
                  onChange={(e) => setEditBudgetAmount(e.target.value)}
                  className="w-full bg-[#F2F2F7] dark:bg-zinc-900 border-0 rounded-2xl p-3.5 text-xs font-bold focus:ring-2 focus:ring-violet focus:outline-none transition text-ink dark:text-zinc-100 placeholder-secondary/70"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingCategory(null)}
                    className="flex-1 py-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-zinc-800 text-secondary dark:text-zinc-300 font-bold text-xs uppercase tracking-wider active:scale-95 transition"
                  >
                    Batal
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={async () => {
                      if (isSubmitting) return;
                      const amount = parseFloat(editBudgetAmount) || 0;
                      setIsSubmitting(true);
                      try {
                        await onAddBudget(editingCategory.category, amount);
                        setEditingCategory(null);
                      } catch (e) {
                        console.error("Gagal memperbarui budget:", e);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    className="flex-1 py-3.5 rounded-2xl bg-violet disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider active:scale-95 transition"
                  >
                    {isSubmitting ? "..." : "Simpan"}
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    onDeleteBudget(editingCategory.category);
                    setEditingCategory(null);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-red/10 hover:bg-red/15 text-red font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Kategori</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Tambah Transaksi */}
      {showAddTxModal && (
        <div className="fixed inset-0 bg-ink/40 dark:bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-surface dark:bg-[#1C1C1E] border border-separator/40 dark:border-zinc-800/80 rounded-[32px] p-6 w-full max-w-xs shadow-float animate-bounce-in text-ink dark:text-zinc-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-sm uppercase tracking-wider">Tambah Transaksi</h3>
              <button 
                onClick={() => setShowAddTxModal(false)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-zinc-800 flex items-center justify-center active:scale-90 transition"
              >
                <X className="w-4 h-4 text-ink dark:text-zinc-300" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type Switcher */}
              <div className="flex p-1 bg-bg dark:bg-zinc-900 rounded-2xl border border-separator/20 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => { setTxType("Expense"); setTxCategory("Makanan"); }}
                  className={`flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition ${
                    txType === "Expense" 
                      ? "bg-red text-white shadow-sm" 
                      : "text-secondary dark:text-zinc-400"
                  }`}
                >
                  Keluar
                </button>
                <button
                  type="button"
                  onClick={() => { setTxType("Income"); setTxCategory("Gaji"); }}
                  className={`flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition ${
                    txType === "Income" 
                      ? "bg-green text-white shadow-sm" 
                      : "text-secondary dark:text-zinc-400"
                  }`}
                >
                  Masuk
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-[9px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider block mb-1 pl-0.5">Jumlah Uang</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-xs text-secondary">Rp</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full bg-[#F2F2F7] dark:bg-zinc-900 border-0 rounded-2xl pl-9 pr-4 py-3 text-xs font-black placeholder-secondary/70 focus:ring-2 focus:ring-violet focus:outline-none transition text-ink dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Category selector */}
              <div>
                <label className="text-[9px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider block mb-1 pl-0.5">Kategori</label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full bg-[#F2F2F7] dark:bg-zinc-900 border-0 rounded-2xl px-3 py-3 text-xs font-bold focus:ring-2 focus:ring-violet focus:outline-none transition appearance-none cursor-pointer text-ink dark:text-zinc-100"
                >
                  {txType === "Expense" ? (
                    ["Makanan", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Pendidikan", "Investasi", "Donasi", "Lainnya"].map(c => (
                      <option key={c} value={c}>{getCategoryEmoji(c)} {c}</option>
                    ))
                  ) : (
                    ["Gaji", "Investasi", "Lainnya"].map(c => (
                      <option key={c} value={c}>{getCategoryEmoji(c)} {c}</option>
                    ))
                  )}
                </select>
              </div>

              {/* Note input */}
              <div>
                <label className="text-[9px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider block mb-1 pl-0.5">Catatan / Deskripsi</label>
                <input
                  type="text"
                  placeholder="e.g. Kopi pagi, Bonus lembur"
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="w-full bg-[#F2F2F7] dark:bg-zinc-900 border-0 rounded-2xl px-3.5 py-3 text-xs font-bold placeholder-secondary/70 focus:ring-2 focus:ring-violet focus:outline-none transition text-ink dark:text-zinc-100"
                />
              </div>

              {/* Date input */}
              <div>
                <label className="text-[9px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider block mb-1.5 pl-0.5">Tanggal</label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full bg-[#F2F2F7] dark:bg-zinc-900 border-0 rounded-2xl px-3.5 py-3 text-xs font-bold focus:ring-2 focus:ring-violet focus:outline-none transition text-ink dark:text-zinc-100"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-zinc-800 text-secondary dark:text-zinc-300 font-bold text-xs uppercase tracking-wider active:scale-95 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (isSubmitting) return;
                    const amount = parseFloat(txAmount);
                    if (isNaN(amount) || amount <= 0) return;
                    setIsSubmitting(true);
                    try {
                      await onAddTransaction({
                        date: txDate,
                        category: txCategory,
                        note: txNote.trim(),
                        amount,
                        type: txType,
                      });
                      setTxAmount("");
                      setTxNote("");
                      setShowAddTxModal(false);
                    } catch (e) {
                      console.error("Gagal menambahkan transaksi:", e);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-violet disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider active:scale-95 transition shadow-glow-violet/20"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Pengaturan Profil & Settings */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-ink/40 dark:bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-surface dark:bg-[#1C1C1E] border border-separator/40 dark:border-zinc-800/80 rounded-[32px] p-6 w-full max-w-xs shadow-float animate-bounce-in text-ink dark:text-zinc-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-sm uppercase tracking-wider">Pengaturan Profil</h3>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-zinc-800 flex items-center justify-center active:scale-90 transition"
              >
                <X className="w-4 h-4 text-ink dark:text-zinc-300" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-[9px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider block mb-1.5 pl-0.5">Nama Kamu</label>
                <input
                  type="text"
                  placeholder="Nama"
                  value={settingName}
                  onChange={(e) => setSettingName(e.target.value)}
                  className="w-full bg-[#F2F2F7] dark:bg-zinc-900 border-0 rounded-2xl p-3.5 text-xs font-bold placeholder-secondary/70 focus:ring-2 focus:ring-violet focus:outline-none transition text-ink dark:text-zinc-100"
                />
              </div>

              {/* Monthly Savings Target */}
              <div>
                <label className="text-[9px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider block mb-1.5 pl-0.5">Target Tabungan Bulanan</label>
                <input
                  type="number"
                  placeholder="Rp0"
                  value={settingTarget}
                  onChange={(e) => setSettingTarget(e.target.value)}
                  className="w-full bg-[#F2F2F7] dark:bg-zinc-900 border-0 rounded-2xl p-3.5 text-xs font-bold placeholder-secondary/70 focus:ring-2 focus:ring-violet focus:outline-none transition text-ink dark:text-zinc-100"
                />
              </div>

              {/* Change Password */}
              <div className="p-3.5 bg-[#F2F2F7] dark:bg-zinc-900 rounded-2xl border border-separator/20 dark:border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider block">Ganti Password</span>
                {!showPasswordFields ? (
                  <button
                    type="button"
                    onClick={() => setShowPasswordFields(true)}
                    className="w-full py-2.5 bg-white dark:bg-zinc-800 border border-separator/25 dark:border-zinc-700/60 rounded-xl text-[11px] font-bold text-ink dark:text-zinc-200 active:scale-95 transition"
                  >
                    🔒 Ubah Password Akun
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="password"
                      placeholder="Password Baru (min. 6 karakter)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-surface dark:bg-zinc-955 border border-separator/35 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold placeholder-secondary/70 text-ink dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet"
                    />
                    <input
                      type="password"
                      placeholder="Konfirmasi Password Baru"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-surface dark:bg-zinc-955 border border-separator/35 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold placeholder-secondary/70 text-ink dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet"
                    />
                    <div className="flex gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordFields(false);
                          setPasswordStatus(null);
                        }}
                        className="flex-1 py-2 bg-white dark:bg-zinc-800 border border-separator/25 dark:border-zinc-700 text-secondary dark:text-zinc-300 font-bold text-[10px] uppercase tracking-wider rounded-xl transition"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        disabled={passwordLoading}
                        onClick={handleChangePassword}
                        className="flex-1 py-2 bg-violet disabled:opacity-50 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition"
                      >
                        {passwordLoading ? "..." : "Simpan"}
                      </button>
                    </div>
                  </div>
                )}
                {passwordStatus && (
                  <p className={`text-[9px] font-bold leading-normal mt-1 ${passwordStatus.type === "success" ? "text-green" : "text-red"}`}>
                    {passwordStatus.msg}
                  </p>
                )}
              </div>

              {/* Telegram Integration */}
              <div className="p-3.5 bg-[#F2F2F7] dark:bg-zinc-900 rounded-2xl border border-separator/20 dark:border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider block">Integrasi Telegram</span>
                {telegramId && (
                  <div className="text-xs font-bold text-green flex items-center gap-1.5 mb-1">
                    <span>✅ Terhubung ID: {String(telegramId)}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-[10px] text-secondary dark:text-zinc-400 leading-normal">
                    {telegramId ? "Ingin mengubah akun Telegram? Ketik " : "Ketik "}
                    <code className="px-1 py-0.5 rounded bg-[#E5E5EA] dark:bg-zinc-800 text-violet font-mono text-[9px]">/link</code>
                    {telegramId ? " di bot baru, lalu masukkan kodenya:" : " di bot, lalu masukkan kodenya di bawah ini:"}
                  </p>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="XXXXXX"
                      value={telegramCode}
                      onChange={(e) => setTelegramCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="flex-1 bg-surface dark:bg-zinc-950 border border-separator/35 dark:border-zinc-800 rounded-xl px-2.5 py-2 text-center text-xs font-black placeholder-secondary/70 uppercase tracking-widest text-ink dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet"
                    />
                    <button
                      type="button"
                      disabled={telegramLoading}
                      onClick={handleLinkTelegram}
                      className="px-3 bg-violet hover:bg-violet/90 disabled:opacity-50 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition"
                    >
                      {telegramLoading ? "..." : "Link"}
                    </button>
                  </div>
                </div>
                {telegramStatus && (
                  <p className={`text-[9px] font-bold leading-normal mt-1 ${telegramStatus.type === "success" ? "text-green" : "text-red"}`}>
                    {telegramStatus.msg}
                  </p>
                )}
              </div>

              {/* Save / Close */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-zinc-800 text-secondary dark:text-zinc-300 font-bold text-xs uppercase tracking-wider active:scale-95 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (settingName.trim()) setUserName(settingName.trim());
                    const t = parseFloat(settingTarget);
                    if (!isNaN(t)) setSavingsTarget(t);
                    setShowSettingsModal(false);
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-violet text-white font-bold text-xs uppercase tracking-wider active:scale-95 transition"
                >
                  Simpan
                </button>
              </div>

              {onLogout && (
                <div className="pt-2 border-t border-separator/20 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full py-3.5 rounded-2xl bg-red/10 hover:bg-red/15 text-red font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition"
                  >
                    Keluar dari Akun
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Smart Notifications */}
      {showNotificationsModal && (
        <div className="fixed inset-0 bg-ink/40 dark:bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-surface dark:bg-[#1C1C1E] border border-separator/40 dark:border-zinc-800/80 rounded-[32px] p-6 w-full max-w-xs shadow-float animate-bounce-in text-ink dark:text-zinc-100">
            <div className="flex justify-between items-center mb-4 border-b border-separator/20 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider">Notifikasi</h3>
                {notifications.length > 0 && (
                  <p className="text-[9px] text-secondary dark:text-zinc-400 font-bold mt-0.5">
                    {notifications.filter(n => n.type === "danger" || n.type === "warning").length} peringatan aktif
                  </p>
                )}
              </div>
              <button 
                onClick={() => setShowNotificationsModal(false)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-zinc-800 flex items-center justify-center active:scale-90 transition"
              >
                <X className="w-4 h-4 text-ink dark:text-zinc-300" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto scrollbar-none py-1">
              {notifications.length === 0 ? (
                <div className="text-center py-6">
                  <span className="text-3xl block mb-2">👍</span>
                  <p className="text-xs font-bold text-ink dark:text-zinc-200">Semua Aman!</p>
                  <p className="text-[10px] text-secondary dark:text-zinc-400 mt-1 leading-normal">
                    Keuangan kamu sehat, tidak ada peringatan. Bagus sekali!
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const colorMap = {
                    danger: "bg-red/10 border-red/20 dark:bg-red/20 dark:border-red/40",
                    warning: "bg-orange/10 border-orange/20 dark:bg-orange/20 dark:border-orange/40",
                    info: "bg-blue/10 border-blue/20 dark:bg-blue/20 dark:border-blue/40",
                    success: "bg-green/10 border-green/20 dark:bg-green/20 dark:border-green/40",
                  };
                  const textColorMap = {
                    danger: "text-red",
                    warning: "text-orange",
                    info: "text-blue",
                    success: "text-green",
                  };
                  return (
                    <div 
                      key={n.id} 
                      className={`p-3 rounded-2xl border flex gap-2.5 items-start ${colorMap[n.type] || colorMap.info}`}
                    >
                      <span className="text-base shrink-0 mt-0.5">{n.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-bold leading-tight ${textColorMap[n.type] || textColorMap.info}`}>
                          {n.title}
                        </p>
                        <p className={`text-[10px] font-semibold mt-1 leading-normal opacity-90 ${textColorMap[n.type] || textColorMap.info}`}>
                          {n.message}
                        </p>
                        <p className={`text-[8px] font-extrabold mt-1 uppercase tracking-wide opacity-70 ${textColorMap[n.type] || textColorMap.info}`}>
                          {n.detail}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => setShowNotificationsModal(false)}
                className="w-full py-3 rounded-xl bg-[#F2F2F7] dark:bg-zinc-800 text-secondary dark:text-zinc-300 font-bold text-xs uppercase tracking-wider active:scale-95 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Transaction Details with Delete option */}
      {selectedTxForDetail && (
        <div className="fixed inset-0 bg-ink/40 dark:bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-surface dark:bg-[#1C1C1E] border border-separator/40 dark:border-zinc-800/80 rounded-[32px] p-6 w-full max-w-xs shadow-float animate-bounce-in text-ink dark:text-zinc-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-sm uppercase tracking-wider">Detail Transaksi</h3>
              <button 
                onClick={() => setSelectedTxForDetail(null)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-zinc-800 flex items-center justify-center active:scale-90 transition"
              >
                <X className="w-4 h-4 text-ink dark:text-zinc-300" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category Icon and Name */}
              <div className="flex items-center gap-3 bg-[#F2F2F7] dark:bg-zinc-900 p-3.5 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-lg shadow-sm">
                  {getCategoryEmoji(selectedTxForDetail.category)}
                </div>
                <div>
                  <p className="text-[9px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider">Kategori</p>
                  <p className="text-xs font-black text-ink dark:text-zinc-100">{selectedTxForDetail.category}</p>
                </div>
              </div>

              {/* Detail Info */}
              <div className="space-y-2.5 px-0.5">
                <div>
                  <span className="text-[9px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider block">Catatan</span>
                  <span className="text-xs font-bold text-ink dark:text-zinc-200">{selectedTxForDetail.note || "-"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider block">Nominal</span>
                    <span className={`text-xs font-black ${selectedTxForDetail.type === "Expense" ? "text-red" : "text-green"}`}>
                      {selectedTxForDetail.type === "Expense" ? "-" : "+"}
                      {formatRupiah(selectedTxForDetail.amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider block">Tipe</span>
                    <span className="text-xs font-bold text-ink dark:text-zinc-200">
                      {selectedTxForDetail.type === "Expense" ? "Pengeluaran 🔴" : "Pemasukan 🟢"}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-secondary dark:text-zinc-400 uppercase tracking-wider block">Tanggal</span>
                  <span className="text-xs font-bold text-ink dark:text-zinc-200">
                    {new Date(selectedTxForDetail.date).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTxForDetail(null)}
                  className="flex-1 py-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-zinc-800 text-secondary dark:text-zinc-300 font-bold text-xs uppercase tracking-wider active:scale-95 transition"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Apakah kamu yakin ingin menghapus transaksi ini?")) {
                      onDeleteTransaction(selectedTxForDetail.id);
                      setSelectedTxForDetail(null);
                    }
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-red hover:bg-red/90 text-white font-bold text-xs uppercase tracking-wider active:scale-95 transition shadow-md shadow-red/10 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
