import { google } from "googleapis";

// GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 = isi file service-account.json, di-encode base64
// (biar aman disimpan sebagai environment variable di Vercel)
function getAuth() {
  const raw = Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64,
    "base64"
  ).toString("utf-8");
  const key = JSON.parse(raw);
  return new google.auth.JWT(key.client_email, null, key.private_key, [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
  ]);
}

export async function fetchTransactions() {
  const auth = getAuth();
  await auth.authorize();
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Transactions!A2:F",
  });

  const rows = res.data.values || [];
  return rows
    .filter((r) => r[0])
    .map(([date, type, category, amount, note]) => ({
      date,
      type,
      category,
      amount: Number(amount) || 0,
      note: note || "",
    }));
}

export async function fetchBudgets() {
  const auth = getAuth();
  await auth.authorize();
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Budget!A2:B",
  });

  const rows = res.data.values || [];
  return rows
    .filter((r) => r[0])
    .map(([category, budget]) => ({ category, budget: Number(budget) || 0 }));
}
