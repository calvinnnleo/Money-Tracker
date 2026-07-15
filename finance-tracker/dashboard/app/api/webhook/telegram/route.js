import TelegramBot from "node-telegram-bot-api";
import { NextResponse } from "next/server";
import {
  addTransaction,
  getAllTransactions,
  getBudgets,
  getLastTransaction,
  deleteLastTransaction,
  setBudget,
  deleteBudget,
  getBudgetStatus,
  createLinkCode,
  getUserIdByTelegramId,
  getTransactionsByCategory,
  getTransactionsForExport,
  getProfileInfo,
  getRecentTransactions,
  deleteTransactionById,
} from "./db";
import { getSession, setSession, clearSession } from "./session";
import { checkBudgetAlert } from "./budget-alert";
import { parseMessage, parseNumberAndNote } from "./parser";
import { scanReceipt } from "./ocr-scanner";

const token = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_ID = String(process.env.TELEGRAM_OWNER_ID);

const bot = new TelegramBot(token);

function formatRupiah(n) {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

function getSafeDashboardUrl() {
  const url = process.env.DASHBOARD_URL || "";
  return url;
}

// Keyboard Menu Definitions — MAIN_MENU is a function to dynamically include Dashboard button
function getMainMenu() {
  const dashboardUrl = process.env.DASHBOARD_URL || "";
  const rows = [
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
  ];

  if (dashboardUrl) {
    rows.push([{ text: "📈 Buka Dashboard", url: dashboardUrl }]);
  }

  return { reply_markup: { inline_keyboard: rows } };
}

const REMOVE_KEYBOARD = {
  reply_markup: {
    remove_keyboard: true
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
        { text: "❌ Pilih & Hapus", callback_data: "action_pilih_hapus" },
      ],
      [
        { text: "📤 Export CSV", callback_data: "action_export" },
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
        { text: "👤 Profil & Koneksi", callback_data: "action_profil" },
      ],
      [
        { text: "🔗 Hubungkan Dashboard", callback_data: "action_link_dashboard" },
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
        { text: "📝 Format Pencatatan", callback_data: "help_format" },
        { text: "💡 Shorthand Angka", callback_data: "help_shorthand" },
      ],
      [
        { text: "⌨️ Daftar Perintah", callback_data: "help_commands" },
        { text: "ℹ️ Tentang Aplikasi", callback_data: "help_about" },
      ],
      [
        { text: "◀ Kembali ke Menu", callback_data: "action_menu" },
      ],
    ],
  },
};

const SETTINGS_MENU = (settings) => {
  const statusStr = settings.active ? "✅ Aktif" : "❌ Nonaktif";
  const daysMap = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const daysStr = settings.days.length === 7 ? "Setiap Hari" : settings.days.map((d) => daysMap[d]).join(",");

  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: `Status: ${statusStr}`, callback_data: "set_rem_status" },
          { text: `Hari: ${daysStr}`, callback_data: "set_rem_days_menu" },
        ],
        [
          { text: `Jam: ${settings.time}`, callback_data: "set_rem_time_menu" },
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

const getSettings = () => ({
  active: true,
  days: [1, 2, 3, 4, 5, 6, 0],
  time: "20:00",
  weeklySummary: true,
  monthlyReport: true
});

async function processTelegramUpdate(update) {
  const { message, callback_query } = update;

  if (message) {
    const telegramId = message.from.id;
    const chatId = message.chat.id;
    let text = message.text ? message.text.trim() : "";

    // Convert backslash commands to forward slash commands for convenience (e.g. \menu -> /menu, or single \ -> /menu)
    if (text === "\\") {
      text = "/menu";
    } else if (text.startsWith("\\")) {
      text = "/" + text.slice(1);
    }

    // 0. Handle photo messages (OCR Receipt Scanner)
    if (message.photo && message.photo.length > 0) {
      const dbUserId = await getUserIdByTelegramId(telegramId);
      if (!dbUserId) {
        await bot.sendMessage(
          chatId,
          "⚠️ *Bot belum terhubung dengan akun Dashboard!*\n\nKetik /link untuk menghubungkan akun terlebih dahulu.",
          { parse_mode: "Markdown" }
        );
        return;
      }

      // Get highest resolution photo
      const photoObj = message.photo[message.photo.length - 1];
      const loadingMsg = await bot.sendMessage(chatId, "🔍 *Membaca struk...*\n_Mohon tunggu, AI sedang menganalisis gambarmu._", { parse_mode: "Markdown" });

      try {
        // Get direct file URL from Telegram
        const fileInfo = await bot.getFile(photoObj.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;

        // Call OCR Vision AI
        const ocrResult = await scanReceipt(fileUrl);

        // Clean up loading message
        await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

        if (!ocrResult.is_receipt) {
          await bot.sendMessage(chatId, ocrResult.reply_message || "⚠️ Gambar tidak terdeteksi sebagai struk belanja. Coba kirim foto struk yang lebih jelas.", { parse_mode: "Markdown" });
          return;
        }

        // Build preview message
        const itemsList = ocrResult.items && ocrResult.items.length > 0
          ? ocrResult.items.map(i => `  • ${i}`).join("\n")
          : "  _(tidak terdeteksi)_";

        const previewMsg = 
          `🧾 *Hasil Baca Struk AI*\n\n` +
          `🏪 Merchant: *${ocrResult.merchant_name || "Tidak diketahui"}*\n` +
          `🏷️ Kategori: *${ocrResult.category || "Belanja"}*\n` +
          `💰 Total: *${formatRupiah(ocrResult.total_amount || 0)}*\n` +
          `📝 Catatan: _${ocrResult.note || "-"}_\n\n` +
          `📋 Item terdeteksi:\n${itemsList}\n\n` +
          `Apakah data di atas sudah benar?`;

        // Store OCR result in session for confirmation
        const session = getSession(telegramId);
        session.mode = "awaiting_ocr_confirm";
        session.tempData = {
          amount: ocrResult.total_amount,
          category: ocrResult.category || "Belanja",
          note: ocrResult.note || ocrResult.merchant_name || "Belanja struk",
          type: "Expense",
        };

        await bot.sendMessage(chatId, previewMsg, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Simpan", callback_data: "ocr_confirm" },
                { text: "❌ Batal", callback_data: "ocr_cancel" },
              ]
            ]
          }
        });
      } catch (err) {
        await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
        await bot.sendMessage(chatId, `❌ Gagal memproses struk: ${err.message}`);
      }
      return;
    }

    // 1. Slash commands
    if (text.startsWith("/")) {
      if (text.startsWith("/start")) {
        clearSession(telegramId);
        const dbUserId = await getUserIdByTelegramId(telegramId);

        if (!dbUserId) {
          const firstName = message.from.first_name || "User";
          const welcomeUnlinked = 
            `Halo *${firstName}*! 👋\n\n` +
            `Selamat datang di *KasLeo Bot*!\n\n` +
            `Untuk mulai mencatat keuangan dan memantau anggaran, kamu harus menghubungkan Telegram ini ke akun dashboard web kamu terlebih dahulu.\n\n` +
            `*Cara Menghubungkan:* \n` +
            `1. Buka dashboard web kamu.\n` +
            `2. Masuk ke menu **Pengaturan Profil**.\n` +
            `3. Ketik perintah \`/link\` di bot ini.\n` +
            `4. Masukkan kode 6 digit yang diberikan bot ke dashboard web kamu.\n\n` +
            `Ayo ketik \`/link\` sekarang untuk mendapatkan kode!`;

          await bot.sendMessage(chatId, welcomeUnlinked, {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔑 Dapatkan Kode Link (/link)", callback_data: "action_trigger_link" }]
              ]
            }
          });
          return;
        }

        await bot.sendMessage(
          chatId,
          `Halo *${message.from.first_name || "User"}*! 👋\n\n` +
          `Aku bot pencatat keuangan pribadimu yang terkoneksi langsung dengan database & Dashboard.\n\n` +
          `Kamu bisa langsung mencatat pengeluaran secara cepat:\n` +
          `• \`kopi 25rb\`\n` +
          `• \`beli sepatu 350k\`\n` +
          `• \`masuk 5jt gaji bulanan\`\n\n` +
          `Gunakan menu interaktif di bawah ini untuk navigasi cepat!`,
          { parse_mode: "Markdown", ...REMOVE_KEYBOARD }
        );

        await bot.sendMessage(chatId, "🎛️ *Menu Utama Keuangan:*", { parse_mode: "Markdown", ...getMainMenu() });
        return;
      }

      if (text.startsWith("/menu")) {
        clearSession(telegramId);
        const dbUserId = await getUserIdByTelegramId(telegramId);
        if (!dbUserId) {
          await bot.sendMessage(
            chatId,
            "⚠️ *Bot belum terhubung dengan akun Dashboard!*\n\n" +
            "Ketik perintah `/link` untuk memulai proses penghubungan akun.",
            { parse_mode: "Markdown" }
          );
          return;
        }

        await bot.sendMessage(chatId, "🎛️ *Menu Utama Keuangan:*", { parse_mode: "Markdown", ...getMainMenu() });
        return;
      }

      if (text.startsWith("/link")) {
        clearSession(telegramId);
        const loadingMsg = await bot.sendMessage(chatId, "🔗 *Membuat kode penghubung...*", { parse_mode: "Markdown" });
        try {
          const telegramName = message.from.username || message.from.first_name || "User";
          const code = await createLinkCode(telegramId, telegramName);
          await bot.deleteMessage(chatId, loadingMsg.message_id);
          await bot.sendMessage(
            chatId,
            `🔑 *Kode Penghubung Siap!*\n\n` +
            `Masukkan kode berikut di menu **Pengaturan Profil** dashboard web kamu:\n\n` +
            `*${code}*\n\n` +
            `_Kode ini hanya berlaku selama 10 menit._`,
            { parse_mode: "Markdown" }
          );
        } catch (err) {
          try {
            await bot.deleteMessage(chatId, loadingMsg.message_id);
          } catch (e) {}
          await bot.sendMessage(chatId, `❌ *Gagal membuat kode penghubung:*\n${err.message}`, { parse_mode: "Markdown" });
        }
        return;
      }

      if (text.startsWith("/help")) {
        await bot.sendMessage(
          chatId,
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
        return;
      }
      return;
    }

    // 2. Reply Keyboard and text parsing
    const dbUserId = await getUserIdByTelegramId(telegramId);
    if (!dbUserId) {
      await bot.sendMessage(
        chatId,
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

    if (text === "🎛️ Menu Utama") {
      clearSession(telegramId);
      await bot.sendMessage(chatId, "🎛️ *Menu Utama Keuangan:*", { parse_mode: "Markdown", ...getMainMenu() });
      return;
    }
    if (text === "📊 Ringkasan") {
      clearSession(telegramId);
      await bot.sendMessage(chatId, "📊 *Pilih Periode Ringkasan Keuangan:*", { parse_mode: "Markdown", ...RINGKASAN_MENU });
      return;
    }
    if (text === "💰 Cek Budget") {
      clearSession(telegramId);
      await bot.sendMessage(chatId, "💰 *Menu Budgeting:*", { parse_mode: "Markdown", ...BUDGET_MENU_FULL });
      return;
    }
    if (text === "📋 Riwayat") {
      clearSession(telegramId);
      await bot.sendMessage(chatId, "📋 *Pilihan Riwayat Transaksi:*", { parse_mode: "Markdown", ...RIWAYAT_MENU });
      return;
    }

    if (session.mode === "awaiting_custom_expense" || session.mode === "awaiting_custom_income") {
      const parsed = parseNumberAndNote(text);
      if (!parsed) {
        await bot.sendMessage(chatId, "❌ Format salah. Harap masukkan nominal angka yang benar.\nContoh: `25000` atau `25rb kopi`.");
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
        await bot.sendMessage(
          chatId,
          `✅ *Catatan Berhasil!* (${typeLabel})\n\n` +
          `• Kategori: *${category}*\n` +
          `• Nominal: *${formatRupiah(amount)}*\n` +
          `• Catatan: _${finalNote}_\n\n` +
          `Ketik lagi untuk mencatat, atau ketik /menu untuk membuka dashboard menu.`,
          { parse_mode: "Markdown" }
        );
        if (type === "Expense") {
          await checkBudgetAlert(dbUserId, transaction, bot, chatId);
        }
      } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal menyimpan transaksi: ${err.message}`);
      }
      return;
    }

    if (session.mode === "awaiting_custom_budget") {
      const parsed = parseNumberAndNote(text);
      if (!parsed || parsed.amount <= 0) {
        await bot.sendMessage(chatId, "❌ Format nominal budget salah. Harap masukkan angka yang valid.\nContoh: `1.5jt` atau `1500000`.");
        return;
      }

      const category = session.tempData ? session.tempData.category : "";
      const amount = parsed.amount;

      if (!category) {
        await bot.sendMessage(chatId, "❌ Terjadi kesalahan sesi. Silakan coba atur dari menu lagi.");
        clearSession(telegramId);
        return;
      }

      try {
        await setBudget(dbUserId, category, amount);
        clearSession(telegramId);
        await bot.sendMessage(
          chatId,
          `✅ *Budget Kategori Berhasil Diatur!*\n\n` +
          `• Kategori: *${category}*\n` +
          `• Batas Budget: *${formatRupiah(amount)}* / bulan\n\n` +
          `Ketik /menu untuk kembali ke menu navigasi.`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal mengatur budget: ${err.message}`);
      }
      return;
    }

    const aiResult = await parseMessage(text);
    if (!aiResult) {
      await bot.sendMessage(
        chatId,
        "⚠️ Maaf, terjadi kesalahan saat asisten AI memproses pesan kamu.",
        { parse_mode: "Markdown", ...REMOVE_KEYBOARD }
      );
      return;
    }

    if (aiResult.is_transaction) {
      const transaction = {
        date: new Date().toISOString().slice(0, 10),
        type: aiResult.type,
        category: aiResult.category,
        amount: aiResult.amount,
        note: aiResult.note || "-",
      };

      try {
        await addTransaction(dbUserId, transaction);
        await bot.sendMessage(
          chatId,
          aiResult.reply_message || `✅ *Dicatat otomatis!* (${transaction.type === "Income" ? "Pemasukan" : "Pengeluaran"})\n\n` +
          `• Kategori: *${transaction.category}*\n` +
          `• Nominal: *${formatRupiah(transaction.amount)}*\n` +
          `• Catatan: _${transaction.note}_`,
          { parse_mode: "Markdown", ...REMOVE_KEYBOARD }
        );
        if (transaction.type === "Expense") {
          await checkBudgetAlert(dbUserId, transaction, bot, chatId);
        }
      } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal menyimpan transaksi: ${err.message}`);
      }
    } else {
      // Obrolan biasa / chit-chat
      await bot.sendMessage(chatId, aiResult.reply_message, { parse_mode: "Markdown", ...REMOVE_KEYBOARD });
    }
  }

  if (callback_query) {
    const msg = callback_query.message;
    const telegramId = callback_query.from.id;
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const data = callback_query.data;

    await bot.answerCallbackQuery(callback_query.id);

    const dbUserId = await getUserIdByTelegramId(telegramId);
    const session = getSession(telegramId);

    // OCR Receipt confirmation handlers
    if (data === "ocr_confirm") {
      if (!session.tempData || session.mode !== "awaiting_ocr_confirm") {
        await bot.editMessageText("❌ Sesi konfirmasi struk sudah kedaluwarsa. Kirim foto struk lagi ya!", {
          chat_id: chatId, message_id: messageId, parse_mode: "Markdown"
        });
        return;
      }

      const { amount, category, note, type } = session.tempData;
      const transaction = {
        date: new Date().toISOString().slice(0, 10),
        type,
        category,
        amount,
        note,
      };

      try {
        await addTransaction(dbUserId, transaction);
        clearSession(telegramId);
        await bot.editMessageText(
          `✅ *Struk berhasil disimpan!*\n\n` +
          `• Kategori: *${category}*\n` +
          `• Nominal: *${formatRupiah(amount)}*\n` +
          `• Catatan: _${note}_\n\n` +
          `💡 _Terima kasih sudah pakai KasLeo OCR Scanner!_`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[{ text: "🎛️ Menu Utama", callback_data: "action_menu" }]]
            }
          }
        );
        if (type === "Expense") {
          await checkBudgetAlert(dbUserId, transaction, bot, chatId);
        }
      } catch (err) {
        await bot.editMessageText(`❌ Gagal menyimpan transaksi struk: ${err.message}`, {
          chat_id: chatId, message_id: messageId
        });
      }
      return;
    }

    if (data === "ocr_cancel") {
      clearSession(telegramId);
      await bot.editMessageText(
        "🗑️ *Transaksi struk dibatalkan.*\n\nKirim foto struk lagi jika ingin mencoba ulang.",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "🎛️ Menu Utama", callback_data: "action_menu" }]]
          }
        }
      );
      return;
    }

    if (data === "action_trigger_link") {
      const loadingMsg = await bot.sendMessage(chatId, "🔗 *Membuat kode penghubung...*", { parse_mode: "Markdown" });
      try {
        const telegramName = callback_query.from.username || callback_query.from.first_name || "User";
        const code = await createLinkCode(telegramId, telegramName);
        await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
        await bot.sendMessage(
          chatId,
          `🔑 *Kode Penghubung Siap!*\n\n` +
          `Masukkan kode berikut di menu **Pengaturan Profil** dashboard web kamu:\n\n` +
          `*${code}*\n\n` +
          `_Kode ini hanya berlaku selama 10 menit._`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        try {
          await bot.deleteMessage(chatId, loadingMsg.message_id);
        } catch (e) {}
        await bot.sendMessage(
          chatId,
          `❌ *Gagal membuat kode penghubung:*\n${err.message}`,
          { parse_mode: "Markdown" }
        );
      }
      return;
    }

    if (!dbUserId && data !== "action_dismiss_reminder") {
      await bot.sendMessage(
        chatId,
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

    if (data === "action_menu") {
      clearSession(telegramId);
      await bot.editMessageText("🎛️ *Menu Utama Keuangan:*", {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        ...getMainMenu(),
      });
    } else if (data === "action_catat") {
      clearSession(telegramId);
      await bot.editMessageText("📝 *Pilih Jenis Transaksi:*", {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        ...CATAT_MENU,
      });
    } else if (data === "guide_expense") {
      session.mode = "awaiting_custom_expense";
      await bot.editMessageText(
        `📝 *Catat Pengeluaran Baru*\n\n` +
        `Silakan ketik nominal dan catatan pengeluaran.\n` +
        `Contoh: \`kopi 25rb\` atau \`makan siang 35k\`\n\n` +
        `Atau langsung pilih kategori di bawah jika catatannya ingin otomatis dikategorikan:`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          ...CATEGORY_MENU_EXPENSE,
        }
      );
    } else if (data === "guide_income") {
      session.mode = "awaiting_custom_income";
      await bot.editMessageText(
        `📥 *Catat Pemasukan Baru*\n\n` +
        `Silakan ketik nominal dan catatan pemasukan.\n` +
        `Contoh: \`gaji 5jt\` atau \`project 2.5jt\`\n\n` +
        `Atau langsung pilih kategori di bawah:`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          ...CATEGORY_MENU_INCOME,
        }
      );
    } else if (data === "action_ringkasan_menu") {
      await bot.editMessageText("📊 *Pilih Periode Ringkasan Keuangan:*", {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        ...RINGKASAN_MENU,
      });
    } else if (data === "action_ringkasan_hari") {
      const rows = await getAllTransactions(dbUserId);
      const today = new Date().toISOString().slice(0, 10);
      let income = 0, expense = 0;
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
      await bot.editMessageText(responseMsg, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_ringkasan_menu" }]]
        }
      });
    } else if (data === "action_ringkasan_minggu") {
      const rows = await getAllTransactions(dbUserId);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const limitDate = sevenDaysAgo.toISOString().slice(0, 10);
      let income = 0, expense = 0;
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
      await bot.editMessageText(responseMsg, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_ringkasan_menu" }]]
        }
      });
    } else if (data === "action_ringkasan" || data === "action_ringkasan_bulan") {
      const rows = await getAllTransactions(dbUserId);
      const thisMonth = new Date().toISOString().slice(0, 7);
      let income = 0, expense = 0;
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
      await bot.editMessageText(responseMsg, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_ringkasan_menu" }]]
        }
      });
    } else if (data === "action_budget_menu") {
      await bot.editMessageText("💰 *Menu Budgeting:*", {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        ...BUDGET_MENU_FULL
      });
    } else if (data === "action_budget") {
      const status = await getBudgetStatus(dbUserId);
      const lines = status.status.map((b) => {
        const icon = b.percentage >= 100 ? "🚨" : b.percentage >= 80 ? "⚠️" : "✅";
        const limitStr = b.budget ? `/${formatRupiah(b.budget)}` : "";
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
      await bot.editMessageText(responseMsg, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "➕ Set Budget Kategori", callback_data: "action_budget_set_menu" }],
            [{ text: "◀ Kembali ke Budget", callback_data: "action_budget_menu" }]
          ]
        }
      });
    } else if (data === "action_budget_set_menu") {
      await bot.editMessageText("🎯 *Pilih kategori yang ingin diatur budgetnya:*", {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        ...BUDGET_SELECT_MENU
      });
    } else if (data === "action_budget_delete_menu") {
      await bot.editMessageText("🗑️ *Pilih kategori budget yang ingin dihapus:*", {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        ...BUDGET_DELETE_MENU
      });
    } else if (data === "action_riwayat_menu") {
      await bot.editMessageText("📋 *Pilihan Riwayat Transaksi:*", {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        ...RIWAYAT_MENU
      });
    } else if (data === "action_riwayat") {
      const txs = await getAllTransactions(dbUserId);
      const recent = txs.slice(-10).reverse();
      const lines = recent.map((t, idx) => {
        const typeSign = t[1] === "Expense" ? "-" : "+";
        const amountFormatted = formatRupiah(Number(t[3]) || 0);
        return `${idx + 1}. *${t[2]}* | ${t[4] || "-"} | \`${typeSign}${amountFormatted}\` | _${t[0]}_`;
      }).join("\n");
      const responseMsg = [
        `📋 *10 Transaksi Terakhir:*\n`,
        lines || "_(belum ada riwayat transaksi)_"
      ].join("\n");
      await bot.editMessageText(responseMsg, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "◀ Kembali ke Riwayat", callback_data: "action_riwayat_menu" }]]
        }
      });
    } else if (data === "action_filter_cat") {
      await bot.editMessageText("🔍 *Pilih kategori untuk memfilter riwayat:*", {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        ...FILTER_CAT_MENU
      });
    } else if (data === "action_hapus") {
      const last = await getLastTransaction(dbUserId);
      if (!last) {
        await bot.sendMessage(chatId, "Tidak ada transaksi untuk dihapus.");
        return;
      }
      const typeSign = last.type === "Expense" ? "-" : "+";
      await bot.editMessageText(
        `🗑️ *Konfirmasi Hapus Transaksi Terakhir:*\n\n` +
        `• Kategori: *${last.category}*\n` +
        `• Catatan: *${last.note}*\n` +
        `• Jumlah: \`${typeSign}${formatRupiah(last.amount)}\`\n` +
        `• Tanggal: _${last.date}_\n\n` +
        `Apakah Anda yakin ingin menghapus transaksi di atas?`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🗑️ Ya, Hapus", callback_data: "action_confirm_delete" },
                { text: "❌ Batal", callback_data: "action_riwayat_menu" }
              ]
            ]
          }
        }
      );
    } else if (data === "action_confirm_delete") {
      const deleted = await deleteLastTransaction(dbUserId);
      if (deleted) {
        await bot.editMessageText(
          `✅ *Transaksi berhasil dihapus!*\n\n` +
          `Dihapus: ${deleted.category} - ${deleted.note} (${formatRupiah(deleted.amount)})`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            ...RIWAYAT_MENU
          }
        );
      } else {
        await bot.editMessageText("❌ Gagal menghapus transaksi.", {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          ...RIWAYAT_MENU
        });
      }
    } else if (data === "action_pilih_hapus") {
      try {
        const recent = await getRecentTransactions(dbUserId, 5);
        if (recent.length === 0) {
          await bot.editMessageText("📭 *Belum ada riwayat transaksi untuk dihapus.*", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[{ text: "◀ Kembali ke Riwayat", callback_data: "action_riwayat_menu" }]]
            }
          });
          return;
        }
        const buttons = recent.map((t) => {
          const categoryEmoji = {
            Makanan: "🍔", Transportasi: "🚗", Belanja: "🛍️", Tagihan: "📱",
            Hiburan: "🎮", Kesehatan: "💊", Pendidikan: "📚", Investasi: "📈",
            Donasi: "🎁", Gaji: "💰", Lainnya: "📌"
          }[t.category] || "📌";
          const sign = t.type === "Expense" ? "-" : "+";
          const formattedAmount = formatRupiah(t.amount);
          return [{ text: `${categoryEmoji} ${t.note || t.category} (${sign}${formattedAmount})`, callback_data: `action_del_prompt_${t.id}` }];
        });
        buttons.push([{ text: "◀ Kembali ke Riwayat", callback_data: "action_riwayat_menu" }]);
        await bot.editMessageText("❌ *Pilih Transaksi yang Ingin Dihapus:*", {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: buttons }
        });
      } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal memuat daftar transaksi: ${err.message}`);
      }
    } else if (data.startsWith("action_del_prompt_")) {
      const id = data.replace("action_del_prompt_", "");
      try {
        const recent = await getRecentTransactions(dbUserId, 10);
        const target = recent.find((t) => String(t.id) === id);
        if (!target) {
          await bot.editMessageText("❌ Transaksi tidak ditemukan.", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            ...RIWAYAT_MENU
          });
          return;
        }
        const sign = target.type === "Expense" ? "-" : "+";
        await bot.editMessageText(
          `⚠️ *Konfirmasi Hapus Transaksi:* ⚠️\n\n` +
          `• Kategori: *${target.category}*\n` +
          `• Catatan: *${target.note || "-"}*\n` +
          `• Jumlah: \`${sign}${formatRupiah(target.amount)}\`\n` +
          `• Tanggal: _${target.date}_\n\n` +
          `Apakah Anda yakin ingin menghapus transaksi di atas secara permanen?`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "🗑️ Ya, Hapus Permanen", callback_data: `action_del_confirm_${id}` },
                  { text: "❌ Batal", callback_data: "action_pilih_hapus" }
                ]
              ]
            }
          }
        );
      } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal mengambil detail transaksi: ${err.message}`);
      }
    } else if (data.startsWith("action_del_confirm_")) {
      const id = data.replace("action_del_confirm_", "");
      try {
        await deleteTransactionById(dbUserId, id);
        await bot.editMessageText("✅ *Transaksi berhasil dihapus secara permanen!*", {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          ...RIWAYAT_MENU
        });
      } catch (err) {
        await bot.editMessageText(`❌ *Gagal menghapus transaksi:* ${err.message}`, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          ...RIWAYAT_MENU
        });
      }
    } else if (data === "action_pengaturan_menu") {
      await bot.editMessageText("⚙️ *Pengaturan & Info Akun:*", {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        ...PENGATURAN_MENU
      });
    } else if (data === "action_settings") {
      const settings = getSettings();
      await bot.editMessageText("⚙️ *Pengaturan Pengingat & Notifikasi:*", {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        ...SETTINGS_MENU(settings)
      });
    } else if (data === "action_bantuan_menu") {
      await bot.editMessageText("❓ *Pilih Topik Bantuan:*", {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        ...BANTUAN_MENU
      });
    } else if (data === "action_dismiss_reminder") {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await bot.sendMessage(chatId, "Okey, semangat mencatat keuangannya! 💪");
    } else if (data.startsWith("cat_exp_")) {
      const cat = data.replace("cat_exp_", "");
      session.mode = "awaiting_custom_expense";
      session.tempData = { category: cat, type: "Expense" };
      await bot.editMessageText(
        `📝 Kategori terpilih: *${cat}* (Pengeluaran)\n\n` +
        `Silakan ketik *jumlah nominal* dan keterangan tambahan jika ada.\n` +
        `Contoh: \`25000\` atau \`25rb roti panggang\``,
        {
          chat_id: chatId,
          message_id: messageId,
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
      await bot.editMessageText(
        `📥 Kategori terpilih: *${cat}* (Pemasukan)\n\n` +
        `Silakan ketik *jumlah nominal* dan keterangan tambahan jika ada.\n` +
        `Contoh: \`1.2jt\` atau \`1200000 bonus project\``,
        {
          chat_id: chatId,
          message_id: messageId,
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
      await bot.editMessageText(
        `🎯 Mengatur Budget untuk Kategori: *${cat}*\n\n` +
        `Silakan ketik nominal budget bulanan.\n` +
        `Contoh: \`1.5jt\` atau \`1500000\``,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "◀ Batal", callback_data: "action_budget_set_menu" }]]
          }
        }
      );
    } else if (data.startsWith("del_bud_")) {
      const cat = data.replace("del_bud_", "");
      try {
        await deleteBudget(dbUserId, cat);
        await bot.editMessageText(
          `🗑️ *Budget kategori ${cat} berhasil dihapus!*\n\n` +
          `Ketik /menu untuk kembali ke menu utama.`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[{ text: "◀ Kembali ke Budget", callback_data: "action_budget_menu" }]]
            }
          }
        );
      } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal menghapus budget: ${err.message}`);
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
        await bot.editMessageText(responseMsg, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_filter_cat" }]]
          }
        });
      } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal memfilter riwayat: ${err.message}`);
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
        await bot.sendDocument(chatId, csvBuffer, {
          caption: "📊 Berikut adalah data riwayat transaksi kamu dalam format CSV."
        }, {
          filename: `riwayat_transaksi_${new Date().toISOString().slice(0, 10)}.csv`,
          contentType: "text/csv"
        });
      } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal mengekspor data: ${err.message}`);
      }
    } else if (data === "action_link_dashboard") {
      const loadingMsg = await bot.sendMessage(chatId, "🔗 *Membuat kode penghubung...*", { parse_mode: "Markdown" });
      try {
        const telegramName = callback_query.from.username || callback_query.from.first_name || "User";
        const code = await createLinkCode(telegramId, telegramName);
        await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
        await bot.sendMessage(
          chatId,
          `🔑 *Kode Penghubung Siap!*\n\n` +
          `Masukkan kode berikut di menu **Pengaturan Profil** dashboard web kamu:\n\n` +
          `*${code}*\n\n` +
          `_Kode ini hanya berlaku selama 10 menit._`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        try {
          await bot.deleteMessage(chatId, loadingMsg.message_id);
        } catch (e) {}
        await bot.sendMessage(chatId, `❌ *Gagal membuat kode:*\n${err.message}`, { parse_mode: "Markdown" });
      }
    } else if (data === "action_profil") {
      try {
        const profile = await getProfileInfo(dbUserId);
        const name = profile?.display_name || "Tidak Diketahui";
        const tgId = profile?.telegram_id || telegramId;
        await bot.editMessageText(
          `👤 *Informasi Profil Akun Terhubung:*\n\n` +
          `• Nama Akun: *${name}*\n` +
          `• ID Telegram: \`${tgId}\`\n` +
          `• Status Koneksi: *Terhubung* ✅\n\n` +
          `Akun kamu telah terintegrasi dengan database & dashboard web secara penuh.`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_pengaturan_menu" }]]
            }
          }
        );
      } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal memuat profil: ${err.message}`);
      }
    } else if (data === "help_format") {
      await bot.editMessageText(
        `📝 *Bantuan: Format Pencatatan*\n\n` +
        `Kamu bisa mencatat transaksi langsung dengan mengetik pesan biasa di chat:\n\n` +
        `• *Pengeluaran:* [keterangan] [nominal]\n` +
        `  Contoh: \`kopi 25rb\`, \`makan siang 35k\`, \`20000 parkir\`\n\n` +
        `• *Pemasukan:* [keterangan] [nominal] masuk\n` +
        `  Contoh: \`gaji 5jt masuk\`, \`freelance 1.2jt masuk\`\n\n` +
        `💡 *Kategori Otomatis*: Bot akan menebak kategori yang paling cocok (Makanan, Belanja, Hiburan, dll) secara pintar.`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_bantuan_menu" }]]
          }
        }
      );
    } else if (data === "help_shorthand") {
      await bot.editMessageText(
        `💡 *Bantuan: Shorthand Nominal*\n\n` +
        `Untuk mempercepat pencatatan, kamu bisa menggunakan shorthand (singkatan) nominal berikut:\n\n` +
        `• \`k\` atau \`rb\` atau \`ribu\` → Ribuan (x1.000)\n` +
        `  Contoh: \`15k\` atau \`15rb\` → \`15.000\`\n\n` +
        `• \`jt\` atau \`juta\` → Jutaan (x1.000.000)\n` +
        `  Contoh: \`2.5jt\` atau \`2.5juta\` → \`2.500.000\``,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_bantuan_menu" }]]
          }
        }
      );
    } else if (data === "help_commands") {
      await bot.editMessageText(
        `⌨️ *Bantuan: Daftar Perintah (Commands)*\n\n` +
        `Berikut adalah daftar perintah slash yang didukung bot:\n\n` +
        `• /start → Memulai bot dan menampilkan sambutan\n` +
        `• /menu → Membuka Menu Utama Keuangan\n` +
        `• /link → Membuat kode penghubung akun ke dashboard\n` +
        `• /help → Menampilkan panduan cepat`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_bantuan_menu" }]]
          }
        }
      );
    } else if (data === "help_about") {
      await bot.editMessageText(
        `ℹ️ *Tentang KasLeo*\n\n` +
        `*KasLeo Bot* v2.0.0\n` +
        `Aplikasi asisten pencatat keuangan pribadi terintegrasi database Cloud & Dashboard interaktif Next.js.\n\n` +
        `*Fitur Utama:*\n` +
        `• Pencatatan transaksi kilat parser teks pintar.\n` +
        `• Integrasi instan dengan dashboard web pribadi.\n` +
        `• Sistem kuota/budget bulanan dengan notifikasi limit.\n` +
        `• Ekspor riwayat keuangan mandiri via Telegram.`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "◀ Kembali", callback_data: "action_bantuan_menu" }]]
          }
        }
      );
    }
  }
}

export async function POST(request) {
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is not set" }, { status: 500 });
  }

  try {
    const body = await request.json();
    console.log("📥 Received Telegram Update:", JSON.stringify(body));
    
    // Await the entire async processing pipeline so Vercel keeps the function alive!
    await processTelegramUpdate(body);
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Gagal memproses update webhook Telegram:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is not set" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const setup = searchParams.get("setup");

  if (setup === "true") {
    const host = request.headers.get("host") || "";
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    const webhookUrl = `${protocol}://${host}/api/webhook/telegram`;

    try {
      console.log(`🤖 Mendaftarkan webhook URL ke Telegram: ${webhookUrl}`);
      const res = await bot.setWebHook(webhookUrl);
      return NextResponse.json({
        success: true,
        message: `Webhook berhasil dikonfigurasi ke URL: ${webhookUrl}`,
        telegramResponse: res,
      });
    } catch (err) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    status: "online",
    message: "KasLeo Serverless Telegram Webhook Endpoint. Tambahkan ?setup=true untuk mendaftarkan URL webhook otomatis.",
  });
}
