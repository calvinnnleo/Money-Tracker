import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { parseMessage, parseNumberAndNote } from "./parser.js";
import {
  addTransaction,
  getAllTransactions,
  getBudgets,
  getLastTransaction,
  deleteLastTransaction,
  setBudget,
  getBudgetStatus,
  createLinkCode,
  getUserIdByTelegramId,
  getTransactionsByCategory,
  getTransactionsForExport,
  getProfileInfo,
  deleteBudget,
} from "./db.js";
import { getSession, setSession, clearSession } from "./session.js";
import { checkBudgetAlert } from "./budget-alert.js";
import { startScheduler, getSettings, saveSettings } from "./scheduler.js";

dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_ID = String(process.env.TELEGRAM_OWNER_ID);

if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN belum diisi di .env");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
let botUsername = "bot";

try {
  bot.getMe().then((me) => {
    botUsername = me.username;
    bot.username = me.username;
    console.log(`Bot jalan. Terhubung dengan database Supabase. Username: @${botUsername}`);
    
    // Register commands in Telegram Bot Menu
    bot.setMyCommands([
      { command: "start", description: "Memulai bot & Tampilkan sambutan" },
      { command: "menu", description: "Buka Menu Utama Keuangan" },
      { command: "link", description: "Hubungkan akun ke Dashboard Web" },
      { command: "help", description: "Tampilkan panduan penggunaan" }
    ]).then(() => {
      console.log("✅ Daftar perintah bot berhasil didaftarkan ke Telegram.");
    }).catch((err) => {
      console.warn("⚠️ Gagal mendaftarkan perintah ke Telegram:", err.message);
    });
  });
  startScheduler(bot, OWNER_ID);
} catch (err) {
  console.error("❌ Gagal memulai bot:", err.message);
}

function isOwner(msg) {
  return String(msg.from.id) === OWNER_ID;
}

function formatRupiah(n) {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

function getSafeDashboardUrl() {
  const url = process.env.DASHBOARD_URL || "";
  if (!url || url.includes("localhost") || url.includes("127.0.0.1")) {
    return `https://t.me/${botUsername}`;
  }
  return url;
}

// Keyboard Menu Definitions
const MAIN_MENU = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "📝 Catat Transaksi", callback_data: "action_catat" },
        { text: "📊 Ringkasan", callback_data: "action_ringkasan_menu" },
      ],
      [
        { text: "💰 Budget", callback_data: "action_budget_menu" },
        { text: "📋 Riwayat", callback_data: "action_riwayat_menu" },
      ],
      [
        { text: "⚙️ Pengaturan", callback_data: "action_pengaturan_menu" },
        { text: "❓ Bantuan", callback_data: "action_bantuan_menu" },
      ],
      [
        { text: "📈 Buka Dashboard", url: getSafeDashboardUrl() },
      ],
    ],
  },
};

const REPLY_KEYBOARD = {
  reply_markup: {
    keyboard: [
      [
        { text: "🎛️ Menu Utama" },
        { text: "📊 Ringkasan" },
      ],
      [
        { text: "💰 Cek Budget" },
        { text: "📋 Riwayat" },
      ]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

const CATAT_MENU = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "📝 Catat Pengeluaran", callback_data: "guide_expense" },
        { text: "📥 Catat Pemasukan", callback_data: "guide_income" },
      ],
      [
        { text: "◀ Kembali ke Menu", callback_data: "action_menu" },
      ],
    ],
  },
};

const CATEGORY_MENU_EXPENSE = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🍔 Makanan", callback_data: "cat_exp_Makanan" },
        { text: "🚗 Transportasi", callback_data: "cat_exp_Transportasi" },
      ],
      [
        { text: "🛍️ Belanja", callback_data: "cat_exp_Belanja" },
        { text: "📱 Tagihan", callback_data: "cat_exp_Tagihan" },
      ],
      [
        { text: "🎮 Hiburan", callback_data: "cat_exp_Hiburan" },
        { text: "💊 Kesehatan", callback_data: "cat_exp_Kesehatan" },
      ],
      [
        { text: "📚 Pendidikan", callback_data: "cat_exp_Pendidikan" },
        { text: "📌 Lainnya", callback_data: "cat_exp_Lainnya" },
      ],
      [
        { text: "◀ Kembali ke Menu", callback_data: "action_catat" },
      ],
    ],
  },
};

const CATEGORY_MENU_INCOME = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "💰 Gaji", callback_data: "cat_inc_Gaji" },
        { text: "📈 Investasi", callback_data: "cat_inc_Investasi" },
      ],
      [
        { text: "💻 Freelance", callback_data: "cat_inc_Freelance" },
        { text: "🎁 Hadiah", callback_data: "cat_inc_Hadiah" },
      ],
      [
        { text: "📌 Lainnya", callback_data: "cat_inc_Lainnya" },
      ],
      [
        { text: "◀ Kembali ke Menu", callback_data: "action_catat" },
      ],
    ],
  },
};

const RINGKASAN_MENU = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "📅 Hari Ini", callback_data: "action_ringkasan_hari" },
        { text: "📆 Minggu Ini", callback_data: "action_ringkasan_minggu" },
      ],
      [
        { text: "📅 Bulan Ini", callback_data: "action_ringkasan_bulan" },
      ],
      [
        { text: "◀ Kembali ke Menu", callback_data: "action_menu" },
      ],
    ],
  },
};

const BUDGET_MENU_FULL = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "📊 Cek Status Budget", callback_data: "action_budget" },
        { text: "➕ Set Budget Kategori", callback_data: "action_budget_set_menu" },
      ],
      [
        { text: "🗑️ Hapus Budget Kategori", callback_data: "action_budget_delete_menu" },
      ],
      [
        { text: "◀ Kembali ke Menu", callback_data: "action_menu" },
      ],
    ],
  },
};

const BUDGET_SELECT_MENU = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🍔 Makanan", callback_data: "set_bud_Makanan" },
        { text: "🚗 Transportasi", callback_data: "set_bud_Transportasi" },
      ],
      [
        { text: "🛍️ Belanja", callback_data: "set_bud_Belanja" },
        { text: "📱 Tagihan", callback_data: "set_bud_Tagihan" },
      ],
      [
        { text: "🎮 Hiburan", callback_data: "set_bud_Hiburan" },
        { text: "💊 Kesehatan", callback_data: "set_bud_Kesehatan" },
      ],
      [
        { text: "📚 Pendidikan", callback_data: "set_bud_Pendidikan" },
        { text: "📌 Lainnya", callback_data: "set_bud_Lainnya" },
      ],
      [
        { text: "◀ Kembali ke Budget", callback_data: "action_budget_menu" },
      ],
    ],
  },
};

const BUDGET_DELETE_MENU = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🍔 Makanan", callback_data: "del_bud_Makanan" },
        { text: "🚗 Transportasi", callback_data: "del_bud_Transportasi" },
      ],
      [
        { text: "🛍️ Belanja", callback_data: "del_bud_Belanja" },
        { text: "📱 Tagihan", callback_data: "del_bud_Tagihan" },
      ],
      [
        { text: "🎮 Hiburan", callback_data: "del_bud_Hiburan" },
        { text: "💊 Kesehatan", callback_data: "del_bud_Kesehatan" },
      ],
      [
        { text: "📚 Pendidikan", callback_data: "del_bud_Pendidikan" },
        { text: "📌 Lainnya", callback_data: "del_bud_Lainnya" },
      ],
      [
        { text: "◀ Kembali ke Budget", callback_data: "action_budget_menu" },
      ],
    ],
  },
};

const RIWAYAT_MENU = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "📋 10 Terakhir", callback_data: "action_riwayat" },
        { text: "🔍 Filter per Kategori", callback_data: "action_filter_cat" },
      ],
      [
        { text: "🗑️ Hapus Terakhir", callback_data: "action_hapus" },
        { text: "📤 Export CSV", callback_data: "action_export" },
      ],
      [
        { text: "◀ Kembali ke Menu", callback_data: "action_menu" },
      ],
    ],
  },
};

const FILTER_CAT_MENU = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🍔 Makanan", callback_data: "flt_cat_Makanan" },
        { text: "🚗 Transportasi", callback_data: "flt_cat_Transportasi" },
      ],
      [
        { text: "🛍️ Belanja", callback_data: "flt_cat_Belanja" },
        { text: "📱 Tagihan", callback_data: "flt_cat_Tagihan" },
      ],
      [
        { text: "🎮 Hiburan", callback_data: "flt_cat_Hiburan" },
        { text: "💊 Kesehatan", callback_data: "flt_cat_Kesehatan" },
      ],
      [
        { text: "📚 Pendidikan", callback_data: "flt_cat_Pendidikan" },
        { text: "📌 Lainnya", callback_data: "flt_cat_Lainnya" },
      ],
      [
        { text: "◀ Kembali ke Riwayat", callback_data: "action_riwayat_menu" },
      ],
    ],
  },
};

const PENGATURAN_MENU = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🔔 Pengingat & Notif", callback_data: "action_settings" },
        { text: "🔗 Hubungkan Dashboard", callback_data: "action_link_dashboard" },
      ],
      [
        { text: "👤 Info Profil", callback_data: "action_profil" },
      ],
      [
        { text: "◀ Kembali ke Menu", callback_data: "action_menu" },
      ],
    ],
  },
};

const BANTUAN_MENU = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "📝 Format Catat", callback_data: "help_format" },
        { text: "💡 Shorthand Nominal", callback_data: "help_shorthand" },
      ],
      [
        { text: "⌨️ Daftar Perintah", callback_data: "help_commands" },
        { text: "ℹ️ Tentang KasLeo", callback_data: "help_about" },
      ],
      [
        { text: "◀ Kembali ke Menu", callback_data: "action_menu" },
      ],
    ],
  },
};

const SETTINGS_MENU = (settings) => {
  const statusStr = settings.active ? "✅ Aktif" : "❌ Nonaktif";
  const daysMap = { 1: "Sen", 2: "Sel", 3: "Rab", 4: "Kam", 5: "Jum", 6: "Sab", 0: "Min" };
  const daysStr = settings.days.length === 7 ? "Setiap Hari" : settings.days.length === 5 && !settings.days.includes(0) && !settings.days.includes(6) ? "Senin - Jumat" : settings.days.map((d) => daysMap[d]).join(",");
  
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: `Notif Harian: ${statusStr}`, callback_data: "set_rem_status" },
          { text: `Jam: ${settings.time}`, callback_data: "set_rem_time_menu" },
        ],
        [
          { text: `Hari Remind: ${daysStr}`, callback_data: "set_rem_days_menu" },
        ],
        [
          { text: settings.weeklySummary ? "📊 Mingguan: ✅" : "📊 Mingguan: ❌", callback_data: "set_rem_weekly" },
          { text: settings.monthlyReport ? "📋 Bulanan: ✅" : "📋 Bulanan: ❌", callback_data: "set_rem_monthly" },
        ],
        [
          { text: "◀ Kembali", callback_data: "action_pengaturan_menu" },
        ],
      ],
    },
  };
};

const TIME_MENU = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "07:00", callback_data: "time_set_07:00" },
        { text: "08:00", callback_data: "time_set_08:00" },
        { text: "09:00", callback_data: "time_set_09:00" },
      ],
      [
        { text: "18:00", callback_data: "time_set_18:00" },
        { text: "19:00", callback_data: "time_set_19:00" },
        { text: "20:00", callback_data: "time_set_20:00" },
      ],
      [
        { text: "21:00", callback_data: "time_set_21:00" },
        { text: "22:00", callback_data: "time_set_22:00" },
        { text: "23:00", callback_data: "time_set_23:00" },
      ],
      [
        { text: "◀ Kembali", callback_data: "action_settings" },
      ],
    ],
  },
};

const DAYS_MENU = (settings) => {
  const check = (dayNum) => settings.days.includes(dayNum) ? "✅" : "❌";
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: `${check(1)} Sen`, callback_data: "day_toggle_1" },
          { text: `${check(2)} Sel`, callback_data: "day_toggle_2" },
          { text: `${check(3)} Rab`, callback_data: "day_toggle_3" },
        ],
        [
          { text: `${check(4)} Kam`, callback_data: "day_toggle_4" },
          { text: `${check(5)} Jum`, callback_data: "day_toggle_5" },
          { text: `${check(6)} Sab`, callback_data: "day_toggle_6" },
        ],
        [
          { text: `${check(0)} Min`, callback_data: "day_toggle_0" },
        ],
        [
          { text: "💾 Simpan & Kembali", callback_data: "action_settings" },
        ],
      ],
    },
  };
};

// Command start & help
bot.onText(/\/start/, async (msg) => {
  console.log(`📥 Menerima perintah /start dari Telegram ID: ${msg.from.id}`);
  if (!isOwner(msg)) {
    console.log(`⚠️ User bukan owner! Owner ID: ${OWNER_ID}, User ID: ${msg.from.id}`);
    return;
  }
  clearSession(msg.from.id);
  
  // 1. Send greeting and establish the bottom reply keyboard
  await bot.sendMessage(
    msg.chat.id,
    `Halo *${msg.from.first_name || "Owner"}*! 👋\n\n` +
    `Aku bot pencatat keuangan pribadimu yang terkoneksi langsung dengan database & Dashboard.\n\n` +
    `Kamu bisa langsung mencatat pengeluaran secara cepat:\n` +
    `• \`kopi 25rb\`\n` +
    `• \`beli sepatu 350k\`\n` +
    `• \`masuk 5jt gaji bulanan\`\n\n` +
    `Gunakan keyboard menu cepat di bawah ini untuk navigasi cepat tanpa mengetik!`,
    { parse_mode: "Markdown", ...REPLY_KEYBOARD }
  );

  // 2. Send the actual Menu Utama inline buttons
  bot.sendMessage(msg.chat.id, "🎛️ *Menu Utama Keuangan:*", { parse_mode: "Markdown", ...MAIN_MENU });
});

bot.onText(/\/menu/, (msg) => {
  console.log(`📥 Menerima perintah /menu dari Telegram ID: ${msg.from.id}`);
  if (!isOwner(msg)) {
    console.log(`⚠️ User bukan owner! Owner ID: ${OWNER_ID}, User ID: ${msg.from.id}`);
    return;
  }
  clearSession(msg.from.id);

  // Send the Menu Utama inline buttons directly (it will render the buttons on the message)
  bot.sendMessage(msg.chat.id, "🎛️ *Menu Utama Keuangan:*", { parse_mode: "Markdown", ...MAIN_MENU });
});

bot.onText(/\/link/, async (msg) => {
  if (!isOwner(msg)) return;
  clearSession(msg.from.id);
  
  const loadingMsg = await bot.sendMessage(msg.chat.id, "🔗 *Membuat kode penghubung...*", { parse_mode: "Markdown" });
  
  try {
    const telegramName = msg.from.username || msg.from.first_name || "User";
    const code = await createLinkCode(msg.from.id, telegramName);
    
    await bot.deleteMessage(msg.chat.id, loadingMsg.message_id);
    
    await bot.sendMessage(
      msg.chat.id,
      `🔑 *Kode Penghubung Siap!*\n\n` +
      `Masukkan kode berikut di menu **Pengaturan Profil** dashboard web kamu:\n\n` +
      `*${code}*\n\n` +
      `_Kode ini hanya berlaku selama 10 menit._`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    try {
      await bot.deleteMessage(msg.chat.id, loadingMsg.message_id);
    } catch (e) {}
    await bot.sendMessage(
      msg.chat.id,
      `❌ *Gagal membuat kode penghubung:*\n${err.message}`,
      { parse_mode: "Markdown" }
    );
  }
});

bot.onText(/\/help/, (msg) => {
  if (!isOwner(msg)) return;
  bot.sendMessage(
    msg.chat.id,
    `💡 *Bantuan Format Pencatatan:* \n\n` +
    `• *Pengeluaran Otomatis (Default):*\n` +
    `  Cukup ketik nominal dan catatan.\n` +
    `  Contoh: \`kopi 25rb\`, \`25000 kopi\`, \`makan siang 35k\`\n\n` +
    `• *Pemasukan (Gunakan kata "masuk"):*\n` +
    `  Contoh: \`masuk 5jt gaji bulan ini\`, \`freelance 1.2jt masuk\`\n\n` +
    `• *Shorthand nominal:* \`rb\`/\`ribu\` (x1000), \`k\` (x1000), \`jt\`/\`juta\` (x1000000)\n\n` +
    `• *Kategori Pintar:* Bot otomatis menebak kategori menggunakan AI jika tidak ada keyword yang cocok.\n\n` +
    `*Perintah lain:* /menu, /start, /link`,
    { parse_mode: "Markdown" }
  );
});

// Main callback queries (button clicks)
bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message;
  const telegramId = callbackQuery.from.id;
  const data = callbackQuery.data;

  // Verify owner
  if (String(telegramId) !== OWNER_ID) {
    bot.answerCallbackQuery(callbackQuery.id, { text: "Akses Ditolak." });
    return;
  }

  // Answer callback query so Telegram loader stops
  bot.answerCallbackQuery(callbackQuery.id);

  const dbUserId = await getUserIdByTelegramId(telegramId);
  if (!dbUserId && data !== "action_dismiss_reminder") {
    bot.sendMessage(
      msg.chat.id,
      "⚠️ *Bot belum terhubung dengan akun Dashboard!*\n\n" +
      "Silakan hubungkan akun terlebih dahulu:\n" +
      "1. Buka dashboard web kamu.\n" +
      "2. Masuk ke **Pengaturan Profil**.\n" +
      "3. Ketik perintah `/link` di bot ini.\n" +
      "4. Masukkan kode 6 digit yang diberikan bot ke dashboard web.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const session = getSession(telegramId);

  // 1. Navigation Actions
  if (data === "action_menu") {
    clearSession(telegramId);
    bot.editMessageText("🎛️ *Menu Utama Keuangan:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...MAIN_MENU,
    });
  } else if (data === "action_catat") {
    clearSession(telegramId);
    bot.editMessageText("📝 *Pilih Jenis Transaksi:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...CATAT_MENU,
    });
  } else if (data === "guide_expense") {
    session.mode = "awaiting_custom_expense";
    bot.editMessageText(
      `📝 *Catat Pengeluaran Baru*\n\n` +
      `Silakan ketik nominal dan catatan pengeluaran.\n` +
      `Contoh: \`kopi 25rb\` atau \`makan siang 35k\`\n\n` +
      `Atau langsung pilih kategori di bawah jika catatannya ingin otomatis dikategorikan:`,
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: "Markdown",
        ...CATEGORY_MENU_EXPENSE,
      }
    );
  } else if (data === "guide_income") {
    session.mode = "awaiting_custom_income";
    bot.editMessageText(
      `📥 *Catat Pemasukan Baru*\n\n` +
      `Silakan ketik nominal dan catatan pemasukan.\n` +
      `Contoh: \`gaji 5jt\` atau \`project 2.5jt\`\n\n` +
      `Atau langsung pilih kategori di bawah:`,
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: "Markdown",
        ...CATEGORY_MENU_INCOME,
      }
    );
  } else if (data === "action_ringkasan_menu") {
    bot.editMessageText("📊 *Pilih Periode Ringkasan Keuangan:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...RINGKASAN_MENU,
    });
  } else if (data === "action_ringkasan_hari") {
    const rows = await getAllTransactions(dbUserId);
    const today = new Date().toISOString().slice(0, 10);

    let income = 0;
    let expense = 0;
    const byCategory = {};

    for (const [date, type, category, amount] of rows) {
      if (date !== today) continue;
      const amt = Number(amount) || 0;
      if (type === "Income") income += amt;
      else {
        expense += amt;
        byCategory[category] = (byCategory[category] || 0) + amt;
      }
    }

    const catLines = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([c, v]) => `  - ${c}: *${formatRupiah(v)}*`)
      .join("\n");

    const responseMsg = [
      `📅 *Ringkasan Hari Ini (${today})*\n`,
      `• Pemasukan: *${formatRupiah(income)}*`,
      `• Pengeluaran: *${formatRupiah(expense)}*`,
      `• Selisih Saldo: *${formatRupiah(income - expense)}*\n`,
      `📈 *Rincian per Kategori:*`,
      catLines || "  _(belum ada pengeluaran)_"
    ].join("\n");

    const backKeyboard = {
      reply_markup: {
        inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_ringkasan_menu" }]]
      }
    };

    bot.editMessageText(responseMsg, {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...backKeyboard
    });
  } else if (data === "action_ringkasan_minggu") {
    const rows = await getAllTransactions(dbUserId);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const limitDate = sevenDaysAgo.toISOString().slice(0, 10);

    let income = 0;
    let expense = 0;
    const byCategory = {};

    for (const [date, type, category, amount] of rows) {
      if (!date || date < limitDate) continue;
      const amt = Number(amount) || 0;
      if (type === "Income") income += amt;
      else {
        expense += amt;
        byCategory[category] = (byCategory[category] || 0) + amt;
      }
    }

    const catLines = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([c, v]) => `  - ${c}: *${formatRupiah(v)}*`)
      .join("\n");

    const responseMsg = [
      `📆 *Ringkasan Minggu Ini (7 Hari Terakhir)*\n`,
      `• Pemasukan: *${formatRupiah(income)}*`,
      `• Pengeluaran: *${formatRupiah(expense)}*`,
      `• Selisih Saldo: *${formatRupiah(income - expense)}*\n`,
      `📈 *Rincian per Kategori:*`,
      catLines || "  _(belum ada pengeluaran)_"
    ].join("\n");

    const backKeyboard = {
      reply_markup: {
        inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_ringkasan_menu" }]]
      }
    };

    bot.editMessageText(responseMsg, {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...backKeyboard
    });
  } else if (data === "action_ringkasan" || data === "action_ringkasan_bulan") {
    const rows = await getAllTransactions(dbUserId);
    const thisMonth = new Date().toISOString().slice(0, 7);

    let income = 0;
    let expense = 0;
    const byCategory = {};

    for (const [date, type, category, amount] of rows) {
      if (!date || !date.startsWith(thisMonth)) continue;
      const amt = Number(amount) || 0;
      if (type === "Income") income += amt;
      else {
        expense += amt;
        byCategory[category] = (byCategory[category] || 0) + amt;
      }
    }

    const catLines = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([c, v]) => `  - ${c}: *${formatRupiah(v)}*`)
      .join("\n");

    const responseMsg = [
      `📊 *Ringkasan Bulan Ini (${thisMonth})*\n`,
      `• Pemasukan: *${formatRupiah(income)}*`,
      `• Pengeluaran: *${formatRupiah(expense)}*`,
      `• Selisih Saldo: *${formatRupiah(income - expense)}*\n`,
      `📈 *Rincian per Kategori:*`,
      catLines || "  _(belum ada pengeluaran)_"
    ].join("\n");

    const backKeyboard = {
      reply_markup: {
        inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_ringkasan_menu" }]]
      }
    };

    bot.editMessageText(responseMsg, {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...backKeyboard
    });
  } else if (data === "action_budget_menu") {
    bot.editMessageText("💰 *Menu Budgeting:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...BUDGET_MENU_FULL
    });
  } else if (data === "action_budget") {
    const status = await getBudgetStatus(dbUserId);
    
    const lines = status.status.map((b) => {
      const icon = b.percentage >= 100 ? "🚨" : b.percentage >= 80 ? "⚠️" : "✅";
      const limitStr = b.budget ? `/${formatRupiah(b.budget)}` : "";
      
      // Make a small visual progress bar: 10 characters length
      const filled = Math.min(Math.round(b.percentage / 10), 10);
      const empty = 10 - filled;
      const bar = "█".repeat(filled) + "░".repeat(empty);
      
      return `*${b.category}*\n\`${bar}\` ${formatRupiah(b.spent)}${limitStr} (${Math.round(b.percentage)}%)`;
    }).join("\n\n");

    const responseMsg = [
      `🎯 *Pemantauan Budget (${status.thisMonth})*\n`,
      lines || "_(Belum ada budget terkonfigurasi)_",
      `\n💰 Total Pengeluaran: *${formatRupiah(status.totalSpent)}*`
    ].join("\n");

    const budgetKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "➕ Set Budget Kategori", callback_data: "action_budget_set_menu" }],
          [{ text: "◀ Kembali ke Budget", callback_data: "action_budget_menu" }]
        ]
      }
    };

    bot.editMessageText(responseMsg, {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...budgetKeyboard
    });
  } else if (data === "action_budget_set_menu") {
    bot.editMessageText("🎯 *Pilih kategori yang ingin diatur budgetnya:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...BUDGET_SELECT_MENU
    });
  } else if (data === "action_budget_delete_menu") {
    bot.editMessageText("🗑️ *Pilih kategori budget yang ingin dihapus:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...BUDGET_DELETE_MENU
    });
  } else if (data === "action_riwayat_menu") {
    bot.editMessageText("📋 *Pilihan Riwayat Transaksi:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...RIWAYAT_MENU
    });
  } else if (data === "action_riwayat") {
    const txs = await getAllTransactions(dbUserId);
    const recent = txs.slice(-10).reverse(); // Last 10

    const lines = recent.map((t, idx) => {
      const typeSign = t[1] === "Expense" ? "-" : "+";
      const amountFormatted = formatRupiah(Number(t[3]) || 0);
      return `${idx + 1}. *${t[2]}* | ${t[4] || "-"} | \`${typeSign}${amountFormatted}\` | _${t[0]}_`;
    }).join("\n");

    const responseMsg = [
      `📋 *10 Transaksi Terakhir:*\n`,
      lines || "_(belum ada riwayat transaksi)_"
    ].join("\n");

    const backKeyboard = {
      reply_markup: {
        inline_keyboard: [[{ text: "◀ Kembali ke Riwayat", callback_data: "action_riwayat_menu" }]]
      }
    };

    bot.editMessageText(responseMsg, {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...backKeyboard
    });
  } else if (data === "action_filter_cat") {
    bot.editMessageText("🔍 *Pilih kategori untuk memfilter riwayat:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...FILTER_CAT_MENU
    });
  } else if (data === "action_hapus") {
    const last = await getLastTransaction(dbUserId);
    if (!last) {
      bot.sendMessage(msg.chat.id, "Tidak ada transaksi untuk dihapus.");
      return;
    }

    const typeSign = last.type === "Expense" ? "-" : "+";
    const deleteKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🗑️ Ya, Hapus", callback_data: "action_confirm_delete" },
            { text: "❌ Batal", callback_data: "action_riwayat_menu" }
          ]
        ]
      }
    };

    bot.editMessageText(
      `🗑️ *Konfirmasi Hapus Transaksi Terakhir:*\n\n` +
      `• Kategori: *${last.category}*\n` +
      `• Catatan: *${last.note}*\n` +
      `• Jumlah: \`${typeSign}${formatRupiah(last.amount)}\`\n` +
      `• Tanggal: _${last.date}_\n\n` +
      `Apakah Anda yakin ingin menghapus transaksi di atas?`,
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: "Markdown",
        ...deleteKeyboard
      }
    );
  } else if (data === "action_confirm_delete") {
    const deleted = await deleteLastTransaction(dbUserId);
    if (deleted) {
      bot.editMessageText(
        `✅ *Transaksi berhasil dihapus!*\n\n` +
        `Dihapus: ${deleted.category} - ${deleted.note} (${formatRupiah(deleted.amount)})`,
        {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          parse_mode: "Markdown",
          ...RIWAYAT_MENU
        }
      );
    } else {
      bot.editMessageText("❌ Gagal menghapus transaksi.", {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: "Markdown",
        ...RIWAYAT_MENU
      });
    }
  } else if (data === "action_pengaturan_menu") {
    bot.editMessageText("⚙️ *Pengaturan & Info Akun:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...PENGATURAN_MENU
    });
  } else if (data === "action_settings") {
    const settings = getSettings();
    bot.editMessageText("⚙️ *Pengaturan Pengingat & Notifikasi:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...SETTINGS_MENU(settings)
    });
  } else if (data === "action_bantuan_menu") {
    bot.editMessageText("❓ *Pilih Topik Bantuan:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...BANTUAN_MENU
    });
  } else if (data === "action_dismiss_reminder") {
    bot.deleteMessage(msg.chat.id, msg.message_id);
    bot.sendMessage(msg.chat.id, "Okey, semangat mencatat keuangannya! 💪");
  }

  // 2. Select-Category flows
  else if (data.startsWith("cat_exp_")) {
    const cat = data.replace("cat_exp_", "");
    session.mode = "awaiting_custom_expense";
    session.tempData = { category: cat, type: "Expense" };
    bot.editMessageText(
      `📝 Kategori terpilih: *${cat}* (Pengeluaran)\n\n` +
      `Silakan ketik *jumlah nominal* dan keterangan tambahan jika ada.\n` +
      `Contoh: \`25000\` atau \`25rb roti panggang\``,
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "◀ Batal", callback_data: "guide_expense" }]]
        }
      }
    );
  } else if (data.startsWith("cat_inc_")) {
    const cat = data.replace("cat_inc_", "");
    session.mode = "awaiting_custom_income";
    session.tempData = { category: cat, type: "Income" };
    bot.editMessageText(
      `📥 Kategori terpilih: *${cat}* (Pemasukan)\n\n` +
      `Silakan ketik *jumlah nominal* dan keterangan tambahan jika ada.\n` +
      `Contoh: \`1.2jt\` atau \`1200000 bonus project\``,
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "◀ Batal", callback_data: "guide_income" }]]
        }
      }
    );
  } else if (data.startsWith("set_bud_")) {
    const cat = data.replace("set_bud_", "");
    session.mode = "awaiting_custom_budget";
    session.tempData = { category: cat };
    bot.editMessageText(
      `🎯 Mengatur Budget untuk Kategori: *${cat}*\n\n` +
      `Silakan ketik nominal budget bulanan.\n` +
      `Contoh: \`1.5jt\` atau \`1500000\``,
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "◀ Batal", callback_data: "action_budget_set_menu" }]]
        }
      }
    );
  }

  // 3. Settings updates
  else if (data === "set_rem_status") {
    const settings = getSettings();
    settings.active = !settings.active;
    saveSettings(settings);
    bot.editMessageText("⚙️ *Pengaturan Pengingat & Notifikasi:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...SETTINGS_MENU(settings)
    });
  } else if (data === "set_rem_weekly") {
    const settings = getSettings();
    settings.weeklySummary = !settings.weeklySummary;
    saveSettings(settings);
    bot.editMessageText("⚙️ *Pengaturan Pengingat & Notifikasi:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...SETTINGS_MENU(settings)
    });
  } else if (data === "set_rem_monthly") {
    const settings = getSettings();
    settings.monthlyReport = !settings.monthlyReport;
    saveSettings(settings);
    bot.editMessageText("⚙️ *Pengaturan Pengingat & Notifikasi:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...SETTINGS_MENU(settings)
    });
  } else if (data === "set_rem_time_menu") {
    bot.editMessageText("🕐 *Pilih Jam Pengingat Harian:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...TIME_MENU
    });
  } else if (data.startsWith("time_set_")) {
    const selectedTime = data.replace("time_set_", "");
    const settings = getSettings();
    settings.time = selectedTime;
    saveSettings(settings);
    bot.editMessageText("⚙️ *Pengaturan Pengingat & Notifikasi:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...SETTINGS_MENU(settings)
    });
  } else if (data === "set_rem_days_menu") {
    const settings = getSettings();
    bot.editMessageText("📅 *Toggle hari aktif pengingat harian:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...DAYS_MENU(settings)
    });
  } else if (data.startsWith("day_toggle_")) {
    const dayNum = parseInt(data.replace("day_toggle_", ""));
    const settings = getSettings();
    
    if (settings.days.includes(dayNum)) {
      settings.days = settings.days.filter((d) => d !== dayNum);
    } else {
      settings.days.push(dayNum);
      settings.days.sort();
    }
    saveSettings(settings);
    
    bot.editMessageText("📅 *Toggle hari aktif pengingat harian:*", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "Markdown",
      ...DAYS_MENU(settings)
    });
  } else if (data.startsWith("del_bud_")) {
    const cat = data.replace("del_bud_", "");
    try {
      await deleteBudget(dbUserId, cat);
      bot.editMessageText(
        `🗑️ *Budget kategori ${cat} berhasil dihapus!*\n\n` +
        `Ketik /menu untuk kembali ke menu utama.`,
        {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "◀ Kembali ke Budget", callback_data: "action_budget_menu" }]]
          }
        }
      );
    } catch (err) {
      bot.sendMessage(msg.chat.id, `❌ Gagal menghapus budget: ${err.message}`);
    }
  } else if (data.startsWith("flt_cat_")) {
    const cat = data.replace("flt_cat_", "");
    try {
      const txs = await getTransactionsByCategory(dbUserId, cat);
      const lines = txs.map((t, idx) => {
        const typeSign = t.type === "Expense" ? "-" : "+";
        const amountFormatted = formatRupiah(Number(t.amount) || 0);
        return `${idx + 1}. *${t.category}* | ${t.note || "-"} | \`${typeSign}${amountFormatted}\` | _${t.date}_`;
      }).join("\n");

      const responseMsg = [
        `🔍 *10 Transaksi Terakhir Kategori ${cat}:*\n`,
        lines || "_(belum ada transaksi untuk kategori ini)_"
      ].join("\n");

      bot.editMessageText(responseMsg, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_filter_cat" }]]
        }
      });
    } catch (err) {
      bot.sendMessage(msg.chat.id, `❌ Gagal memfilter riwayat: ${err.message}`);
    }
  } else if (data === "action_export") {
    try {
      const txs = await getTransactionsForExport(dbUserId);
      let csvContent = "Tanggal,Tipe,Kategori,Jumlah,Keterangan\n";
      for (const t of txs) {
        const safeNote = (t.note || "").replace(/"/g, '""');
        csvContent += `"${t.date}","${t.type}","${t.category}",${t.amount},"${safeNote}"\n`;
      }
      const csvBuffer = Buffer.from(csvContent, "utf-8");
      await bot.sendDocument(msg.chat.id, csvBuffer, {
        caption: "📊 Berikut adalah data riwayat transaksi kamu dalam format CSV."
      }, {
        filename: `riwayat_transaksi_${new Date().toISOString().slice(0, 10)}.csv`,
        contentType: "text/csv"
      });
    } catch (err) {
      bot.sendMessage(msg.chat.id, `❌ Gagal mengekspor data: ${err.message}`);
    }
  } else if (data === "action_link_dashboard") {
    const loadingMsg = await bot.sendMessage(msg.chat.id, "🔗 *Membuat kode penghubung...*", { parse_mode: "Markdown" });
    try {
      const telegramName = callbackQuery.from.username || callbackQuery.from.first_name || "User";
      const code = await createLinkCode(telegramId, telegramName);
      await bot.deleteMessage(msg.chat.id, loadingMsg.message_id);
      await bot.sendMessage(
        msg.chat.id,
        `🔑 *Kode Penghubung Siap!*\n\n` +
        `Masukkan kode berikut di menu **Pengaturan Profil** dashboard web kamu:\n\n` +
        `*${code}*\n\n` +
        `_Kode ini hanya berlaku selama 10 menit._`,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      try {
        await bot.deleteMessage(msg.chat.id, loadingMsg.message_id);
      } catch (e) {}
      await bot.sendMessage(msg.chat.id, `❌ *Gagal membuat kode:*\n${err.message}`, { parse_mode: "Markdown" });
    }
  } else if (data === "action_profil") {
    try {
      const profile = await getProfileInfo(dbUserId);
      const name = profile?.display_name || "Tidak Diketahui";
      const tgId = profile?.telegram_id || telegramId;
      bot.editMessageText(
        `👤 *Informasi Profil Akun Terhubung:*\n\n` +
        `• Nama Akun: *${name}*\n` +
        `• ID Telegram: \`${tgId}\`\n` +
        `• Status Koneksi: *Terhubung* ✅\n\n` +
        `Akun kamu telah terintegrasi dengan database & dashboard web secara penuh.`,
        {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_pengaturan_menu" }]]
          }
        }
      );
    } catch (err) {
      bot.sendMessage(msg.chat.id, `❌ Gagal memuat profil: ${err.message}`);
    }
  } else if (data === "help_format") {
    bot.editMessageText(
      `📝 *Bantuan: Format Pencatatan*\n\n` +
      `Kamu bisa mencatat transaksi langsung dengan mengetik pesan biasa di chat:\n\n` +
      `• *Pengeluaran:* [keterangan] [nominal]\n` +
      `  Contoh: \`kopi 25rb\`, \`makan siang 35k\`, \`20000 parkir\`\n\n` +
      `• *Pemasukan:* [keterangan] [nominal] masuk\n` +
      `  Contoh: \`gaji 5jt masuk\`, \`freelance 1.2jt masuk\`\n\n` +
      `💡 *Kategori Otomatis*: Bot akan menebak kategori yang paling cocok (Makanan, Belanja, Hiburan, dll) secara pintar.`,
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_bantuan_menu" }]]
        }
      }
    );
  } else if (data === "help_shorthand") {
    bot.editMessageText(
      `💡 *Bantuan: Shorthand Nominal*\n\n` +
      `Untuk mempercepat pencatatan, kamu bisa menggunakan shorthand (singkatan) nominal berikut:\n\n` +
      `• \`k\` atau \`rb\` atau \`ribu\` → Ribuan (x1.000)\n` +
      `  Contoh: \`15k\` atau \`15rb\` → \`15.000\`\n\n` +
      `• \`jt\` atau \`juta\` → Jutaan (x1.000.000)\n` +
      `  Contoh: \`2.5jt\` atau \`2.5juta\` → \`2.500.000\``,
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_bantuan_menu" }]]
        }
      }
    );
  } else if (data === "help_commands") {
    bot.editMessageText(
      `⌨️ *Bantuan: Daftar Perintah (Commands)*\n\n` +
      `Berikut adalah daftar perintah slash yang didukung bot:\n\n` +
      `• /start → Memulai bot dan menampilkan sambutan\n` +
      `• /menu → Membuka Menu Utama Keuangan\n` +
      `• /link → Membuat kode penghubung akun ke dashboard\n` +
      `• /help → Menampilkan panduan cepat`,
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_bantuan_menu" }]]
        }
      }
    );
  } else if (data === "help_about") {
    bot.editMessageText(
      `ℹ️ *Tentang KasLeo*\n\n` +
      `*KasLeo Bot* v2.0.0\n` +
      `Aplikasi asisten pencatat keuangan pribadi terintegrasi database Cloud & Dashboard interaktif Next.js.\n\n` +
      `*Fitur Utama:*\n` +
      `• Pencatatan transaksi kilat parser teks pintar.\n` +
      `• Integrasi instan dengan dashboard web pribadi.\n` +
      `• Sistem kuota/budget bulanan dengan notifikasi limit.\n` +
      `• Ekspor riwayat keuangan mandiri via Telegram.`,
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_bantuan_menu" }]]
        }
      }
    );
  }
});

// Message listener (Handles chat inputs)
bot.on("message", async (msg) => {
  if (!isOwner(msg)) return;
  
  const telegramId = msg.from.id;
  const text = msg.text ? msg.text.trim() : "";

  if (text.startsWith("/")) return;

  const dbUserId = await getUserIdByTelegramId(telegramId);
  if (!dbUserId) {
    bot.sendMessage(
      msg.chat.id,
      "⚠️ *Bot belum terhubung dengan akun Dashboard!*\n\n" +
      "Silakan hubungkan akun terlebih dahulu:\n" +
      "1. Buka dashboard web kamu.\n" +
      "2. Masuk ke **Pengaturan Profil**.\n" +
      "3. Ketik perintah `/link` di bot ini.\n" +
      "4. Masukkan kode 6 digit yang diberikan bot ke dashboard web.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const session = getSession(telegramId);

  // Intercept Reply Keyboard Button clicks
  if (text === "🎛️ Menu Utama") {
    clearSession(telegramId);
    bot.sendMessage(msg.chat.id, "🎛️ *Menu Utama Keuangan:*", { parse_mode: "Markdown", ...MAIN_MENU });
    return;
  }

  if (text === "📊 Ringkasan") {
    clearSession(telegramId);
    bot.sendMessage(msg.chat.id, "📊 *Pilih Periode Ringkasan Keuangan:*", { parse_mode: "Markdown", ...RINGKASAN_MENU });
    return;
  }

  if (text === "💰 Cek Budget") {
    clearSession(telegramId);
    bot.sendMessage(msg.chat.id, "💰 *Menu Budgeting:*", { parse_mode: "Markdown", ...BUDGET_MENU_FULL });
    return;
  }

  if (text === "📋 Riwayat") {
    clearSession(telegramId);
    bot.sendMessage(msg.chat.id, "📋 *Pilihan Riwayat Transaksi:*", { parse_mode: "Markdown", ...RIWAYAT_MENU });
    return;
  }

  // 1. Session flow: awaiting amount for custom category setting
  if (session.mode === "awaiting_custom_expense" || session.mode === "awaiting_custom_income") {
    const parsed = parseNumberAndNote(text);
    if (!parsed) {
      bot.sendMessage(msg.chat.id, "❌ Format salah. Harap masukkan nominal angka yang benar.\nContoh: `25000` atau `25rb kopi`.");
      return;
    }

    const { amount, note } = parsed;
    const category = session.tempData ? session.tempData.category : "Lainnya";
    const type = session.tempData ? session.tempData.type : (session.mode === "awaiting_custom_income" ? "Income" : "Expense");
    
    const finalNote = note === "-" && session.tempData ? `Catat manual ${category}` : note;
    
    const transaction = {
      date: new Date().toISOString().slice(0, 10),
      type,
      category,
      amount,
      note: finalNote,
    };

    try {
      await addTransaction(dbUserId, transaction);
      clearSession(telegramId);
      
      const typeLabel = type === "Income" ? "Pemasukan" : "Pengeluaran";
      bot.sendMessage(
        msg.chat.id,
        `✅ *Catatan Berhasil!* (${typeLabel})\n\n` +
        `• Kategori: *${category}*\n` +
        `• Nominal: *${formatRupiah(amount)}*\n` +
        `• Catatan: _${finalNote}_\n\n` +
        `Ketik lagi untuk mencatat, atau ketik /menu untuk membuka dashboard menu.`,
        { parse_mode: "Markdown" }
      );
      
      if (type === "Expense") {
        await checkBudgetAlert(dbUserId, transaction, bot, msg.chat.id);
      }
    } catch (err) {
      bot.sendMessage(msg.chat.id, `❌ Gagal menyimpan transaksi: ${err.message}`);
    }
    return;
  }

  // 2. Session flow: awaiting budget value
  if (session.mode === "awaiting_custom_budget") {
    const parsed = parseNumberAndNote(text);
    if (!parsed || parsed.amount <= 0) {
      bot.sendMessage(msg.chat.id, "❌ Format nominal budget salah. Harap masukkan angka yang valid.\nContoh: `1.5jt` atau `1500000`.");
      return;
    }

    const category = session.tempData ? session.tempData.category : "";
    const amount = parsed.amount;

    if (!category) {
      bot.sendMessage(msg.chat.id, "❌ Terjadi kesalahan sesi. Silakan coba atur dari menu lagi.");
      clearSession(telegramId);
      return;
    }

    try {
      await setBudget(dbUserId, category, amount);
      clearSession(telegramId);
      bot.sendMessage(
        msg.chat.id,
        `✅ *Budget Kategori Berhasil Diatur!*\n\n` +
        `• Kategori: *${category}*\n` +
        `• Batas Budget: *${formatRupiah(amount)}* / bulan\n\n` +
        `Ketik /menu untuk kembali ke menu navigasi.`,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      bot.sendMessage(msg.chat.id, `❌ Gagal mengatur budget: ${err.message}`);
    }
    return;
  }

  // 3. Regular chat flow (Instant input parse)
  const parsed = await parseMessage(text);
  if (!parsed) {
    bot.sendMessage(
      msg.chat.id,
      `⚠️ *Format tidak dikenali.* \n\n` +
      `Gunakan format langsung seperti:\n` +
      `• \`kopi 25rb\` (pengeluaran)\n` +
      `• \`masuk 5jt bonus\` (pemasukan)\n\n` +
      `Atau ketik /menu untuk mencatat lewat tombol navigasi.`,
      { parse_mode: "Markdown", ...REPLY_KEYBOARD }
    );
    return;
  }

  try {
    await addTransaction(dbUserId, parsed);
    const typeLabel = parsed.type === "Income" ? "Pemasukan" : "Pengeluaran";
    bot.sendMessage(
      msg.chat.id,
      `✅ *Dicatat otomatis!* (${typeLabel})\n\n` +
      `• Kategori: *${parsed.category}*\n` +
      `• Nominal: *${formatRupiah(parsed.amount)}*\n` +
      `• Catatan: _${parsed.note}_\n\n` +
      `💡 _Kategori ditebak otomatis via keyword/AI._`,
      { parse_mode: "Markdown", ...REPLY_KEYBOARD }
    );

    if (parsed.type === "Expense") {
      await checkBudgetAlert(dbUserId, parsed, bot, msg.chat.id);
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Gagal menyimpan transaksi: ${err.message}`);
  }
});
