import { google } from "googleapis";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

const TRANSACTIONS_TAB = "Transactions";
const BUDGET_TAB = "Budget";

function getAuth() {
  if (!KEY_PATH || !fs.existsSync(KEY_PATH)) {
    throw new Error(`Service account key file tidak ditemukan di path: ${KEY_PATH}`);
  }
  const key = JSON.parse(fs.readFileSync(KEY_PATH, "utf-8"));
  return new google.auth.JWT(
    key.client_email,
    null,
    key.private_key,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
}

async function getSheetsClient() {
  const auth = getAuth();
  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

// Ensure sheets and headers exist
export async function ensureSheetStructure() {
  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existingTitles = meta.data.sheets.map((s) => s.properties.title);

  const requests = [];
  if (!existingTitles.includes(TRANSACTIONS_TAB)) {
    requests.push({ addSheet: { properties: { title: TRANSACTIONS_TAB } } });
  }
  if (!existingTitles.includes(BUDGET_TAB)) {
    requests.push({ addSheet: { properties: { title: BUDGET_TAB } } });
  }
  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests },
    });
  }

  // Header row untuk Transactions
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TRANSACTIONS_TAB}!A1:F1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [["Tanggal", "Tipe", "Kategori", "Jumlah", "Catatan", "Dicatat Pada"]],
    },
  });

  // Header row untuk Budget
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${BUDGET_TAB}!A1:B1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [["Kategori", "Budget Bulanan"]],
    },
  });
}

// Add transaction row
export async function addTransaction({ date, type, category, amount, note }) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TRANSACTIONS_TAB}!A:F`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[date, type, category, amount, note || "", new Date().toISOString()]],
    },
  });
}

// Get all transactions
export async function getAllTransactions() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TRANSACTIONS_TAB}!A2:F`,
  });
  return res.data.values || [];
}

// Get budgets configured
export async function getBudgets() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${BUDGET_TAB}!A2:B`,
  });
  return (res.data.values || []).map(([category, budget]) => ({
    category,
    budget: Number(budget) || 0,
  }));
}

// Get last transaction row
export async function getLastTransaction() {
  const transactions = await getAllTransactions();
  if (transactions.length === 0) return null;
  const last = transactions[transactions.length - 1];
  return {
    rowIndex: transactions.length + 1, // Row is 1-indexed and header row is row 1
    date: last[0],
    type: last[1],
    category: last[2],
    amount: Number(last[3]) || 0,
    note: last[4] || "",
    timestamp: last[5] || "",
  };
}

// Delete last transaction row
export async function deleteLastTransaction() {
  const sheets = await getSheetsClient();
  const lastTx = await getLastTransaction();
  if (!lastTx) return null;

  // Clear the row values (easier and safer than deleting row indices, doesn't shift formulas, but we can also use deleteDimension request if preferred)
  // Deleting dimensions is cleaner for spreadsheet cleanliness. Let's do clear range first.
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `${TRANSACTIONS_TAB}!A${lastTx.rowIndex}:F${lastTx.rowIndex}`,
  });
  
  return lastTx;
}

// Set budget for a category
export async function setBudget(category, amount) {
  const sheets = await getSheetsClient();
  const budgets = await getBudgets();
  
  const existingIdx = budgets.findIndex((b) => b.category.toLowerCase() === category.toLowerCase());
  
  if (existingIdx !== -1) {
    // Update existing budget row
    const rowNum = existingIdx + 2; // budgets is A2:B, index 0 is row 2
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${BUDGET_TAB}!A${rowNum}:B${rowNum}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[category, amount]],
      },
    });
  } else {
    // Append new budget row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${BUDGET_TAB}!A:B`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[category, amount]],
      },
    });
  }
}

// Get detailed status of budget vs actual spending this month
export async function getBudgetStatus() {
  const budgets = await getBudgets();
  const transactions = await getAllTransactions();
  
  const thisMonth = new Date().toISOString().slice(0, 7);
  
  // Calculate expenses per category this month
  const spentMap = {};
  let totalSpent = 0;
  
  for (const [date, type, category, amount] of transactions) {
    if (!date || !date.startsWith(thisMonth)) continue;
    if (type !== "Expense") continue;
    
    const amt = Number(amount) || 0;
    spentMap[category] = (spentMap[category] || 0) + amt;
    totalSpent += amt;
  }
  
  const status = budgets.map((b) => {
    const spent = spentMap[b.category] || 0;
    const percentage = b.budget ? (spent / b.budget) * 100 : 0;
    return {
      category: b.category,
      budget: b.budget,
      spent,
      percentage,
    };
  });
  
  // Add categories that have spending but no budget config
  for (const [cat, spent] of Object.entries(spentMap)) {
    if (!budgets.some((b) => b.category === cat)) {
      status.push({
        category: cat,
        budget: 0,
        spent,
        percentage: 0,
      });
    }
  }
  
  return {
    thisMonth,
    totalSpent,
    status: status.sort((a, b) => b.spent - a.spent),
  };
}
