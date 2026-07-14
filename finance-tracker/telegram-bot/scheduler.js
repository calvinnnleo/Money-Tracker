import fs from "fs";
import path from "path";
import { getAllTransactions, getBudgetStatus } from "./db.js";

const SETTINGS_PATH = "./settings.json";

function formatRupiah(n) {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

function getSafeDashboardUrl() {
  const url = process.env.DASHBOARD_URL || "";
  if (!url || url.includes("localhost") || url.includes("127.0.0.1")) {
    return "https://t.me/calvin_dompet_bot"; // Fallback if localhost
  }
  return url;
}

// Default settings object
const DEFAULT_SETTINGS = {
  active: true,
  time: "21:00",
  days: [1, 2, 3, 4, 5], // Senin - Jumat
  weeklySummary: true,
  monthlyReport: true,
  lastDailySent: "", // YYYY-MM-DD
  lastWeeklySent: "", // YYYY-Wxx
  lastMonthlySent: "", // YYYY-MM
};

export function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error("❌ Gagal membaca settings.json:", err.message);
  }
  // Create default file
  saveSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("❌ Gagal menulis settings.json:", err.message);
  }
}

// Scheduler main loop
export function startScheduler(bot, ownerId) {
  console.log("⏰ Scheduler pengingat aktif.");
  
  // Run check every 30 seconds
  setInterval(async () => {
    try {
      const settings = getSettings();
      if (!settings.active) return;

      const now = new Date();
      // Adjust to UTC+7 or local time offsets
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${hours}:${minutes}`;
      
      const todayStr = now.toISOString().slice(0, 10);
      const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...

      // 1. Daily Reminder Check
      if (currentTimeStr === settings.time && settings.days.includes(currentDay)) {
        if (settings.lastDailySent !== todayStr) {
          // Trigger Daily Reminder
          await sendDailyReminder(bot, ownerId);
          settings.lastDailySent = todayStr;
          saveSettings(settings);
        }
      }

      // 2. Weekly Summary Check (Sunday at 21:00)
      if (settings.weeklySummary && currentDay === 0 && currentTimeStr === "21:00") {
        // Calculate week string (e.g. 2026-W26)
        const weekStr = getWeekNumberString(now);
        if (settings.lastWeeklySent !== weekStr) {
          await sendWeeklySummary(bot, ownerId);
          settings.lastWeeklySent = weekStr;
          saveSettings(settings);
        }
      }

      // 3. Monthly Report Check (1st of month at 08:00)
      if (settings.monthlyReport && now.getDate() === 1 && currentTimeStr === "08:00") {
        const monthStr = todayStr.slice(0, 7); // YYYY-MM
        if (settings.lastMonthlySent !== monthStr) {
          await sendMonthlyReport(bot, ownerId);
          settings.lastMonthlySent = monthStr;
          saveSettings(settings);
        }
      }
    } catch (err) {
      console.error("❌ Error pada Scheduler tick:", err.message);
    }
  }, 30000);
}

// Get ISO week string
function getWeekNumberString(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// Reminders sender functions
async function sendDailyReminder(bot, ownerId) {
  try {
    const transactions = await getAllTransactions();
    const todayStr = new Date().toISOString().slice(0, 10);
    
    // Count transactions today
    const todayTxs = transactions.filter((t) => t[0] === todayStr);
    const count = todayTxs.length;
    const spent = todayTxs
      .filter((t) => t[1] === "Expense")
      .reduce((sum, t) => sum + (Number(t[3]) || 0), 0);

    const message = [
      `🔔 *PENGINGAT CATAT KEUANGAN* 🔔\n`,
      `Sudahkah Anda mencatat pengeluaran hari ini?`,
      `Hari ini Anda telah mencatat *${count} transaksi* dengan total pengeluaran *${formatRupiah(spent)}*.\n`,
      `Jika ada transaksi yang terlewat, ketik langsung sekarang!`,
      `Contoh: \`kopi 25rb\` atau \`grab 15k\`\n`,
      `Atau ketik /menu untuk membuka menu navigasi.`
    ].join("\n");

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📝 Catat Pengeluaran", callback_data: "guide_expense" },
            { text: "✅ Sudah Lengkap", callback_data: "action_dismiss_reminder" }
          ]
        ]
      }
    };

    await bot.sendMessage(ownerId, message, { parse_mode: "Markdown", ...keyboard });
    console.log("🔔 Pengingat harian terkirim ke owner.");
  } catch (err) {
    console.error("❌ Gagal mengirim pengingat harian:", err.message);
  }
}

async function sendWeeklySummary(bot, ownerId) {
  try {
    const transactions = await getAllTransactions();
    
    // Calculate last 7 days range
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    
    const oneWeekAgoStr = oneWeekAgo.toISOString().slice(0, 10);
    
    const weeklyTxs = transactions.filter((t) => t[0] && t[0] >= oneWeekAgoStr);
    const spent = weeklyTxs
      .filter((t) => t[1] === "Expense")
      .reduce((sum, t) => sum + (Number(t[3]) || 0), 0);
      
    const count = weeklyTxs.length;
    const dailyAvg = spent / 7;

    // Find largest category
    const categoriesMap = {};
    weeklyTxs.filter((t) => t[1] === "Expense").forEach((t) => {
      categoriesMap[t[2]] = (categoriesMap[t[2]] || 0) + (Number(t[3]) || 0);
    });
    
    const largestCategory = Object.entries(categoriesMap)
      .sort((a, b) => b[1] - a[1])[0];

    let catStr = "Belum ada pengeluaran";
    if (largestCategory) {
      catStr = `*${largestCategory[0]}* (${formatRupiah(largestCategory[1])})`;
    }

    const message = [
      `📊 *RINGKASAN MINGGUAN KAS* 📊\n`,
      `Berikut adalah rangkuman keuangan Anda selama 7 hari terakhir:\n`,
      `• Total Belanja: *${formatRupiah(spent)}*`,
      `• Jumlah Transaksi: *${count}*`,
      `• Rata-rata Harian: *${formatRupiah(dailyAvg)}*`,
      `• Kategori Terbesar: ${catStr}\n`,
      `💡 _Terus pantau pengeluaran Anda agar tetap hemat!_`
    ].join("\n");

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📊 Buka Dashboard", url: getSafeDashboardUrl() },
            { text: "🏠 Menu Utama", callback_data: "action_menu" }
          ]
        ]
      }
    };

    await bot.sendMessage(ownerId, message, { parse_mode: "Markdown", ...keyboard });
    console.log("📊 Ringkasan mingguan terkirim ke owner.");
  } catch (err) {
    console.error("❌ Gagal mengirim ringkasan mingguan:", err.message);
  }
}

async function sendMonthlyReport(bot, ownerId) {
  try {
    const budgetStatus = await getBudgetStatus();
    
    // Format previous month name
    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(now.getMonth() - 1);
    
    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const lastMonthName = monthNames[lastMonth.getMonth()];
    const lastMonthYear = lastMonth.getFullYear();

    const budgetLines = budgetStatus.status
      .slice(0, 5) // Top 5 categories
      .map((b) => {
        const icon = b.percentage >= 100 ? "🚨" : b.percentage >= 80 ? "⚠️" : "✅";
        const limitStr = b.budget ? `/${formatRupiah(b.budget)}` : "";
        return `${icon} *${b.category}*: ${formatRupiah(b.spent)}${limitStr} (${Math.round(b.percentage)}%)`;
      })
      .join("\n");

    const message = [
      `📋 *LAPORAN BULANAN KAS (${lastMonthName.toUpperCase()} ${lastMonthYear})* 📋\n`,
      `Bulan baru telah tiba! Berikut ringkasan bulan kemarin:\n`,
      `• Total Pengeluaran: *${formatRupiah(budgetStatus.totalSpent)}*\n`,
      `📈 *Realisasi Budget Terbesar:*`,
      budgetLines || "  (Belum ada data)",
      `\n💡 _Evaluasi pengeluaran Anda dan set budget baru untuk bulan ini!_`
    ].join("\n");

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📊 Atur Budget Baru", callback_data: "action_budget_set_menu" },
            { text: "📥 Download Excel", url: `${getSafeDashboardUrl() === "https://t.me/calvin_dompet_bot" ? "https://finance-kamu.vercel.app" : getSafeDashboardUrl()}/api/export` }
          ],
          [
            { text: "🏠 Menu Utama", callback_data: "action_menu" }
          ]
        ]
      }
    };

    await bot.sendMessage(ownerId, message, { parse_mode: "Markdown", ...keyboard });
    console.log("📋 Laporan bulanan terkirim ke owner.");
  } catch (err) {
    console.error("❌ Gagal mengirim laporan bulanan:", err.message);
  }
}
