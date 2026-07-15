import { getAllTransactions, getBudgets } from "./db.js";

function formatRupiah(n) {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

export async function checkBudgetAlert(userId, transaction, bot, chatId) {
  if (transaction.type !== "Expense") return;

  try {
    const budgets = await getBudgets(userId);
    const transactions = await getAllTransactions(userId);

    const thisMonth = new Date().toISOString().slice(0, 7);
    const category = transaction.category;

    const budgetConfig = budgets.find((b) => b.category.toLowerCase() === category.toLowerCase());
    if (!budgetConfig || budgetConfig.budget <= 0) return;

    const budgetLimit = budgetConfig.budget;

    const totalSpent = transactions
      .filter((t) => t[0] && t[0].startsWith(thisMonth) && t[1] === "Expense" && t[2].toLowerCase() === category.toLowerCase())
      .reduce((sum, t) => sum + (Number(t[3]) || 0), 0);

    const percentage = (totalSpent / budgetLimit) * 100;

    if (percentage >= 100) {
      await bot.sendMessage(
        chatId,
        `🚨 *BUDGET OVERLIMIT!* 🚨\n\n` +
        `Pengeluaran kategori *${category}* telah melebihi batas budget bulanan!\n\n` +
        `• Total Terpakai: *${formatRupiah(totalSpent)}*\n` +
        `• Batas Budget: *${formatRupiah(budgetLimit)}*\n` +
        `• Persentase: *${Math.round(percentage)}%*\n\n` +
        `💡 _Ayo kurangi pengeluaran untuk kategori ini!_`,
        { parse_mode: "Markdown" }
      );
    } else if (percentage >= 80) {
      await bot.sendMessage(
        chatId,
        `⚠️ *WARNING: BUDGET HAMPIR HABIS* ⚠️\n\n` +
        `Pengeluaran kategori *${category}* sudah mendekati batas budget bulanan!\n\n` +
        `• Total Terpakai: *${formatRupiah(totalSpent)}*\n` +
        `• Batas Budget: *${formatRupiah(budgetLimit)}*\n` +
        `• Persentase: *${Math.round(percentage)}%*\n\n` +
        `💡 _Sisa budget Anda tinggal ${formatRupiah(budgetLimit - totalSpent)}._`,
        { parse_mode: "Markdown" }
      );
    }
  } catch (err) {
    console.error("❌ Gagal mengecek alert budget:", err.message);
  }
}
