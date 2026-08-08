"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MobileDashboard from "./components/MobileDashboard";
import { AlertCircle } from "lucide-react";
import { createClient } from "../lib/supabase-browser";

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

function getElapsedDaysInMonth(monthStr) {
  if (!monthStr) return 1;
  const [yearStr, monthValStr] = monthStr.split("-");
  const y = parseInt(yearStr);
  const m = parseInt(monthValStr); // 1-indexed

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  if (y === currentYear && m === currentMonth) {
    return now.getDate(); // elapsed days in current month
  } else if (y < currentYear || (y === currentYear && m < currentMonth)) {
    // past month: total days in that month
    return new Date(y, m, 0).getDate();
  } else {
    // future month
    return 1;
  }
}

export default function Page() {
  const [data, setData] = useState({ transactions: [], budgets: [] });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };
  
  // Custom Profile, Settings, Transactions & Reset Carryover State
  const [userName, setUserName] = useState("User");
  const [profile, setProfile] = useState(null);
  const [savingsTarget, setSavingsTarget] = useState(2000000);
  const [localTransactions, setLocalTransactions] = useState([]);
  const [resetCarryoverMonths, setResetCarryoverMonths] = useState([]);
  const [akumulasiStartMonth, setAkumulasiStartMonth] = useState(null);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name, telegram_id")
          .eq("id", user.id)
          .single();
        if (data) {
          setProfile(data);
          setUserName(data.display_name || "User");
        }
      }
    } catch (e) {
      console.error("Gagal mengambil profil:", e);
    }
  };

  const handleUpdateProfileName = async (newName) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({ display_name: newName })
          .eq("id", user.id);
        if (!error) {
          setUserName(newName);
          setProfile(prev => prev ? { ...prev, display_name: newName } : null);
        }
      }
    } catch (e) {
      console.error("Gagal memperbarui nama profil:", e);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);
  
  // Date selection states
  const [selectedMonth, setSelectedMonth] = useState("");

  // Initialize dates and load local storage budgets if available
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${year}-${m}`);

    // Load custom budgets from localStorage
    const localBudgets = localStorage.getItem("saved_budgets");
    if (localBudgets) {
      try {
        const parsed = JSON.parse(localBudgets);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setData(prev => ({ ...prev, budgets: parsed }));
        }
      } catch (e) {
        console.error("Failed to parse saved_budgets", e);
      }
    }

    // Hydrate settings
    const savedName = localStorage.getItem("saved_user_name");
    if (savedName) setUserName(savedName);

    const savedTarget = localStorage.getItem("saved_savings_target");
    if (savedTarget) setSavingsTarget(parseFloat(savedTarget) || 2000000);

    const savedResetMonths = localStorage.getItem("saved_reset_carryover_months");
    if (savedResetMonths) {
      try {
        const parsed = JSON.parse(savedResetMonths);
        if (Array.isArray(parsed)) setResetCarryoverMonths(parsed);
      } catch (e) {
        console.error("Failed to parse saved_reset_carryover_months", e);
      }
    }

    // Load cached server transactions from localStorage (persists across months)
    const savedServerTxs = localStorage.getItem("saved_server_transactions");
    if (savedServerTxs) {
      try {
        const parsed = JSON.parse(savedServerTxs);
        if (Array.isArray(parsed)) {
          setData(prev => ({ ...prev, transactions: parsed }));
        }
      } catch (e) {
        console.error("Failed to parse saved_server_transactions", e);
      }
    }

    const savedLocalTxs = localStorage.getItem("saved_local_transactions");
    if (savedLocalTxs) {
      try {
        const parsed = JSON.parse(savedLocalTxs);
        if (Array.isArray(parsed)) {
          setLocalTransactions(parsed);
        }
      } catch (e) {
        console.error("Failed to parse saved_local_transactions", e);
      }
    }

    const savedAkumulasiStart = localStorage.getItem("saved_akumulasi_start_month");
    if (savedAkumulasiStart) setAkumulasiStartMonth(savedAkumulasiStart);
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("saved_user_name", userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem("saved_savings_target", savingsTarget.toString());
  }, [savingsTarget]);

  useEffect(() => {
    localStorage.setItem("saved_reset_carryover_months", JSON.stringify(resetCarryoverMonths));
  }, [resetCarryoverMonths]);

  useEffect(() => {
    localStorage.setItem("saved_local_transactions", JSON.stringify(localTransactions));
  }, [localTransactions]);

  useEffect(() => {
    if (akumulasiStartMonth) {
      localStorage.setItem("saved_akumulasi_start_month", akumulasiStartMonth);
    } else {
      localStorage.removeItem("saved_akumulasi_start_month");
    }
  }, [akumulasiStartMonth]);

  // Sync budgets back to localStorage when updated
  useEffect(() => {
    if (data && data.budgets && data.budgets.length > 0) {
      localStorage.setItem("saved_budgets", JSON.stringify(data.budgets));
    }
  }, [data.budgets]);

  const handleToggleCarryover = (monthStr) => {
    const targetMonth = monthStr || selectedMonth;
    if (!targetMonth) return;
    setResetCarryoverMonths(prev => {
      if (prev.includes(targetMonth)) {
        return prev.filter(m => m !== targetMonth);
      } else {
        return [...prev, targetMonth];
      }
    });
  };

  // Fetch API (Saves to state if server is online, fallback silently if offline)
  useEffect(() => {
    setLoading(true);
    fetch("/api/transactions")
      .then((r) => {
        if (!r.ok) {
          throw new Error("HTTP error " + r.status);
        }
        return r.json();
      })
      .then((d) => {
        if (d && !d.error && Array.isArray(d.transactions)) {
          // Cache server transactions to localStorage so they persist across months & offline sessions
          localStorage.setItem("saved_server_transactions", JSON.stringify(d.transactions));

          setData(prev => {
            const sheetBudgets = d.budgets || [];
            const mergedBudgets = [...prev.budgets];
            sheetBudgets.forEach(sb => {
              const idx = mergedBudgets.findIndex(mb => mb.category.toLowerCase() === sb.category.toLowerCase());
              if (idx >= 0) {
                mergedBudgets[idx] = sb;
              } else {
                mergedBudgets.push(sb);
              }
            });
            return {
              ...d,
              budgets: mergedBudgets.length > 0 ? mergedBudgets : sheetBudgets
            };
          });

          // Clean up localTransactions that are already synced with the server
          setLocalTransactions(prev => {
            const serverTxIds = new Set(d.transactions.map(tx => tx.id).filter(Boolean));
            return prev.filter(tx => !serverTxIds.has(tx.id));
          });
        } else if (d && d.error) {
          console.warn("API returned error: ", d.error);
        }
      })
      .catch((err) => {
        console.warn("API Offline / Belum siap. Menggunakan data cache dari localStorage.");
        // Transaksi dari server sudah di-load dari localStorage di useEffect init di atas
        // sehingga data tetap tampil meskipun offline
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Realtime Sync Subscription (Telegram Bot <-> Dashboard)
  useEffect(() => {
    let channel;
    const setupRealtime = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        channel = supabase
          .channel("realtime-transactions-" + user.id)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "transactions",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log("⚡ [Realtime Transaction]", payload.eventType, payload);
              if (payload.eventType === "INSERT") {
                const newTx = payload.new;
                setData((prev) => {
                  const existing = prev.transactions || [];
                  if (existing.some((t) => t.id === newTx.id)) return prev;
                  const updated = [newTx, ...existing];
                  localStorage.setItem("saved_server_transactions", JSON.stringify(updated));
                  return { ...prev, transactions: updated };
                });
              } else if (payload.eventType === "UPDATE") {
                const updatedTx = payload.new;
                setData((prev) => {
                  const existing = prev.transactions || [];
                  const updated = existing.map((t) => (t.id === updatedTx.id ? updatedTx : t));
                  localStorage.setItem("saved_server_transactions", JSON.stringify(updated));
                  return { ...prev, transactions: updated };
                });
              } else if (payload.eventType === "DELETE") {
                const deletedId = payload.old?.id;
                if (!deletedId) return;
                setData((prev) => {
                  const existing = prev.transactions || [];
                  const updated = existing.filter((t) => t.id !== deletedId);
                  localStorage.setItem("saved_server_transactions", JSON.stringify(updated));
                  return { ...prev, transactions: updated };
                });
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn("Gagal inisialisasi Supabase Realtime:", err);
      }
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Budget helper functions
  const handleAddBudget = async (category, amount) => {
    // Optimistic UI update
    setData(prev => {
      const exists = prev.budgets.some(b => b.category.toLowerCase() === category.toLowerCase());
      let newBudgets;
      if (exists) {
        newBudgets = prev.budgets.map(b => b.category.toLowerCase() === category.toLowerCase() ? { ...b, budget: amount } : b);
      } else {
        newBudgets = [...prev.budgets, { category, budget: amount }];
      }
      return { ...prev, budgets: newBudgets };
    });

    try {
      await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, budget: amount }),
      });
    } catch (err) {
      console.error("Gagal menyimpan budget ke database:", err.message);
    }
  };

  const handleDeleteBudget = async (category) => {
    // Optimistic UI update
    setData(prev => {
      const newBudgets = prev.budgets.filter(b => b.category.toLowerCase() !== category.toLowerCase());
      return { ...prev, budgets: newBudgets };
    });

    try {
      await fetch(`/api/budget?category=${encodeURIComponent(category)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Gagal menghapus budget dari database:", err.message);
    }
  };

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

  // Merged transactions (Google Sheet + local manual inputs with deduplication)
  const allTransactions = useMemo(() => {
    const seen = new Set();
    const result = [];
    
    (data?.transactions || []).forEach(tx => {
      const key = tx.id || `${tx.date}-${tx.type}-${tx.category}-${tx.amount}-${tx.note}`;
      seen.add(key);
      result.push(tx);
    });

    localTransactions.forEach(tx => {
      const key = tx.id || `${tx.date}-${tx.type}-${tx.category}-${tx.amount}-${tx.note}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(tx);
      }
    });

    return result;
  }, [data?.transactions, localTransactions]);

  // Filter transactions for the selected month & compute cumulative balance up to selected month
  const monthlyData = useMemo(() => {
    if (!data) return { txs: [], income: 0, expense: 0, cumulativeBalance: 0, isCarryoverDisabled: false, previousCumulativeBalance: 0, totalAkumulasiSavings: 0, akumulasiStartMonth: null, availableMonths: [] };
    const txs = allTransactions.filter((t) => t.date?.startsWith(selectedMonth));
    const income = txs.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0);

    const isCarryoverDisabled = resetCarryoverMonths.includes(selectedMonth);

    // Balance accumulated from ALL months BEFORE selected month (the "savings" pot)
    const prevTxs = allTransactions.filter((t) => t.date && t.date.slice(0, 7) < selectedMonth);
    const prevIncome = prevTxs.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0);
    const prevExpense = prevTxs.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0);
    const previousCumulativeBalance = prevIncome - prevExpense;

    // Total all-time income (for savings rate calculation)
    const totalAllTimeIncome = allTransactions.filter((t) => t.type === "Income" && t.date && t.date.slice(0, 7) <= selectedMonth).reduce((s, t) => s + t.amount, 0);

    let cumulativeBalance = income - expense;
    if (!isCarryoverDisabled) {
      cumulativeBalance = previousCumulativeBalance + (income - expense);
    }

    // Filter transactions for Tabungan Akumulasi based on akumulasiStartMonth
    const accumTxs = allTransactions.filter((t) => {
      if (!t.date) return false;
      const monthOfTx = t.date.slice(0, 7);
      if (akumulasiStartMonth && monthOfTx < akumulasiStartMonth) return false;
      return monthOfTx <= selectedMonth;
    });
    const accumIncome = accumTxs.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0);
    const accumExpense = accumTxs.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0);
    const totalAkumulasiSavings = accumIncome - accumExpense;

    // Compute monthly reset logs (up to 12 months)
    const sortedResetMonths = [...resetCarryoverMonths].sort().reverse().slice(0, 12);
    const resetMonthlyLogs = sortedResetMonths.map((resMonth) => {
      const priorTxs = allTransactions.filter((t) => t.date && t.date.slice(0, 7) < resMonth);
      const pIncome = priorTxs.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0);
      const pExpense = priorTxs.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0);
      const savedAmount = Math.max(pIncome - pExpense, 0);

      const [y, mStr] = resMonth.split("-");
      const dt = new Date(parseInt(y), parseInt(mStr) - 1, 1);
      dt.setMonth(dt.getMonth() - 1);
      const prevYear = dt.getFullYear();
      const prevM = String(dt.getMonth() + 1).padStart(2, "0");
      const prevMonthCode = `${prevYear}-${prevM}`;

      return {
        resetMonth: resMonth,
        sourceMonth: prevMonthCode,
        amount: savedAmount,
      };
    });

    const totalResetSavings = resetMonthlyLogs.reduce((sum, item) => sum + item.amount, 0);

    const availableMonthsSet = new Set(allTransactions.map((t) => t.date?.slice(0, 7)).filter(Boolean));
    if (selectedMonth) availableMonthsSet.add(selectedMonth);
    const availableMonths = Array.from(availableMonthsSet).sort();

    return { 
      txs, 
      income, 
      expense, 
      cumulativeBalance, 
      isCarryoverDisabled, 
      previousCumulativeBalance, 
      totalAllTimeIncome,
      totalAkumulasiSavings,
      akumulasiStartMonth,
      availableMonths,
      resetMonthlyLogs,
      totalResetSavings,
    };
  }, [allTransactions, selectedMonth, data, resetCarryoverMonths, akumulasiStartMonth]);

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
    for (const t of allTransactions) {
      const m = t.date?.slice(0, 7);
      if (!m) continue;
      byMonth[m] = byMonth[m] || { month: m, Pemasukan: 0, Pengeluaran: 0 };
      if (t.type === "Income") byMonth[m].Pemasukan += t.amount;
      else byMonth[m].Pengeluaran += t.amount;
    }
    return Object.values(byMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [allTransactions, data]);

  // Insights statistics (savings rate, daily average, MoM change)
  const stats = useMemo(() => {
    if (!data || !selectedMonth) return null;
    const currentTxs = allTransactions.filter((t) => t.date && t.date.startsWith(selectedMonth));
    const previousTxs = allTransactions.filter((t) => t.date && t.date.startsWith(prevMonth));

    const currentSpent = currentTxs.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
    const prevSpent = previousTxs.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
    const currentIncome = currentTxs.filter((t) => t.type === "Income").reduce((sum, t) => sum + t.amount, 0);

    const hasPrevSpent = prevSpent > 0;
    const momDiff = currentSpent - prevSpent;
    const momPercentage = hasPrevSpent ? (momDiff / prevSpent) * 100 : null;

    const elapsedDays = getElapsedDaysInMonth(selectedMonth);
    const dailyAvg = currentSpent / (elapsedDays || 1);

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
      const pct = pAmount > 0 ? (diff / pAmount) * 100 : null;
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
      hasPrevSpent,
      momDiff,
      momPercentage,
      elapsedDays,
      dailyAvg,
      savingsRate,
      largestCategory,
      categoryMoM,
    };
  }, [allTransactions, selectedMonth, prevMonth, data]);

  // Add manual transactions directly from the dashboard
  const handleAddTransaction = async (newTx) => {
    const tempId = "temp-" + Date.now();
    const txWithTempId = { ...newTx, id: tempId };

    // Optimistic UI update
    setLocalTransactions((prev) => [...prev, txWithTempId]);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTx),
      });
      const resData = await res.json();
      if (resData.success && resData.transaction) {
        const confirmedTx = resData.transaction;
        // Update temporary ID with actual database ID
        setLocalTransactions((prev) =>
          prev.map((t) => (t.id === tempId ? confirmedTx : t))
        );
        // Also cache confirmed transaction into server cache so it persists across sessions
        const cachedRaw = localStorage.getItem("saved_server_transactions");
        const cached = cachedRaw ? JSON.parse(cachedRaw) : [];
        localStorage.setItem("saved_server_transactions", JSON.stringify([confirmedTx, ...cached]));
      }
    } catch (err) {
      console.error("Gagal menyimpan transaksi ke database:", err.message);
    }
  };

  const handleDeleteTransaction = async (id) => {
    // Optimistic UI update
    setLocalTransactions((prev) => prev.filter((t) => t.id !== id));
    setData((prev) => {
      if (!prev || !prev.transactions) return prev;
      const updated = prev.transactions.filter((t) => t.id !== id);
      // Keep cache in sync so delete persists across sessions
      localStorage.setItem("saved_server_transactions", JSON.stringify(updated));
      return {
        ...prev,
        transactions: updated,
      };
    });

    try {
      await fetch(`/api/transactions?id=${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Gagal menghapus transaksi dari database:", err.message);
    }
  };

  const handleEditTransaction = async (updatedTx) => {
    // Optimistic UI update
    setLocalTransactions((prev) =>
      prev.map((t) => (t.id === updatedTx.id ? updatedTx : t))
    );
    setData((prev) => {
      if (!prev || !prev.transactions) return prev;
      const updated = prev.transactions.map((t) => (t.id === updatedTx.id ? updatedTx : t));
      localStorage.setItem("saved_server_transactions", JSON.stringify(updated));
      return {
        ...prev,
        transactions: updated,
      };
    });

    if (typeof updatedTx.id === "string" && updatedTx.id.startsWith("temp-")) {
      console.warn("⚠️ Transaksi lokal belum memiliki ID database resmi, update tersimpan secara lokal.");
      return;
    }

    try {
      await fetch("/api/transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTx),
      });
    } catch (err) {
      console.error("Gagal memperbarui transaksi di database:", err.message);
    }
  };

  // Initial spinner loading
  if (loading && (!data?.transactions || data.transactions.length === 0)) {
    return (
      <div className="min-h-screen bg-[#F5F5FA] dark:bg-zinc-950 flex flex-col items-center justify-center relative">
        <div className="fixed top-0 left-0 right-0 z-[9999] h-1.5 bg-gradient-to-r from-purple-600 via-violet-500 to-fuchsia-500 animate-pulse" />
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-3 uppercase tracking-widest">Loading Kas...</span>
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

  return (
    <>
      {loading && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-gradient-to-r from-purple-600 via-violet-500 to-fuchsia-500 animate-pulse" />
      )}
      <MobileDashboard
        data={data}
        allTransactions={allTransactions}
        monthlyData={monthlyData}
        categoryData={categoryData}
        donutData={donutData}
        trendData={trendData}
        stats={stats}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        changeMonth={changeMonth}
        onAddBudget={handleAddBudget}
        onDeleteBudget={handleDeleteBudget}
        onDeleteTransaction={handleDeleteTransaction}
        onToggleCarryover={handleToggleCarryover}
        
        // Custom akumulasi start month
        akumulasiStartMonth={akumulasiStartMonth}
        setAkumulasiStartMonth={setAkumulasiStartMonth}
        
        // Profiles, settings and custom transaction support
        userName={userName}
        setUserName={handleUpdateProfileName}
        savingsTarget={savingsTarget}
        setSavingsTarget={setSavingsTarget}
        isDarkMode={false}
        setIsDarkMode={() => {}}
        onAddTransaction={handleAddTransaction}
        onEditTransaction={handleEditTransaction}
        onLogout={handleLogout}
        telegramId={profile?.telegram_id}
        telegramName={profile?.display_name}
        onRefreshProfile={fetchProfile}
      />
    </>
  );
}
