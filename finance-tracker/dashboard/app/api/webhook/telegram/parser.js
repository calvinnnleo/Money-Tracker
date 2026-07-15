import { categorizeWithAI } from "./ai-categorizer.js";

const CATEGORY_KEYWORDS = {
  Makanan:       ["makan", "kopi", "jajan", "resto", "warteg", "gofood", "grabfood",
                  "nasi", "ayam", "bakso", "mie", "sate", "es", "teh", "snack",
                  "sarapan", "lunch", "dinner", "brunch", "minum", "cemilan", "starbucks"],
  Transportasi:  ["bensin", "ojek", "grab", "gojek", "parkir", "tol", "kereta",
                  "bus", "angkot", "taxi", "mrt", "transjakarta", "lrt",
                  "indriver", "maxim", "travel", "tiket pesawat", "oli", "service motor"],
  Belanja:       ["belanja", "beli", "shopee", "tokopedia", "lazada", "blibli",
                  "toko", "mall", "baju", "sepatu", "celana", "jaket", "minimarket",
                  "alfamart", "indomaret", "supermarket", "kaos", "skincare", "makeup"],
  Tagihan:       ["listrik", "wifi", "internet", "pulsa", "tagihan", "pdam",
                  "kos", "kontrakan", "sewa", "cicilan", "kredit", "iuran", "netflix", "spotify", "youtube premium"],
  Hiburan:       ["nonton", "game", "bioskop", "tiket konser", "karaoke", "billiard",
                  "wisata", "liburan", "hotel", "staycation", "top up game", "steam"],
  Kesehatan:     ["obat", "dokter", "rumah sakit", "apotek", "vitamin",
                  "gym", "supplement", "klinik", "bpjs", "sakit", "periksa"],
  Pendidikan:    ["buku", "kursus", "kuliah", "sekolah", "les", "udemy",
                  "coursera", "seminar", "workshop", "tutor", "spp", "pendaftaran"],
  Investasi:     ["investasi", "saham", "reksadana", "crypto", "nabung",
                  "deposito", "obligasi", "emas", "bibit", "ajaib"],
  Donasi:        ["donasi", "sedekah", "zakat", "infaq", "amal", "sumbangan", "kondangan", "kado"],
  Gaji:          ["gaji", "salary", "bonus", "thr", "freelance", "honor",
                  "upah", "komisi", "transfer masuk", "dividen"],
  Lainnya:       [],
};

const SHORTHAND = {
  "rb":   1000,
  "ribu": 1000,
  "k":    1000,
  "jt":   1000000,
  "juta": 1000000,
};

function guessCategoryByKeywords(note) {
  const lower = note.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return null;
}

export function parseNumberAndNote(text) {
  const regex = /\b([\d.,]+)\s*(juta|jt|ribu|rb|k)?\b/i;
  const match = text.match(regex);
  if (!match) return null;

  const fullMatch = match[0];
  const numberPartRaw = match[1];
  const unit = match[2] ? match[2].toLowerCase() : "";

  let normalizedNum = numberPartRaw;
  if (normalizedNum.includes(",") && !normalizedNum.includes(".")) {
    normalizedNum = normalizedNum.replace(",", ".");
  } else {
    normalizedNum = normalizedNum.replace(/\./g, "");
    normalizedNum = normalizedNum.replace(/,/g, "");
  }

  let amount = parseFloat(normalizedNum);
  if (isNaN(amount)) return null;

  if (unit && SHORTHAND[unit]) {
    amount *= SHORTHAND[unit];
  }

  let note = text.replace(fullMatch, "").trim();
  note = note.replace(/\s+/g, " ");

  return {
    amount: Math.round(amount),
    note: note || "-",
  };
}

export async function parseMessage(text) {
  const cleanText = text.trim();
  
  const parsed = parseNumberAndNote(cleanText);
  if (!parsed) return null;

  let { amount, note } = parsed;
  let type = "Expense";

  const lowerNote = note.toLowerCase();
  if (lowerNote.startsWith("masuk ") || lowerNote.endsWith(" masuk") || lowerNote === "masuk") {
    type = "Income";
    note = note.replace(/\bmasuk\b/gi, "").trim();
  } else if (lowerNote.startsWith("keluar ") || lowerNote.endsWith(" keluar") || lowerNote === "keluar") {
    type = "Expense";
    note = note.replace(/\bkeluar\b/gi, "").trim();
  }

  note = note || "-";

  let category = guessCategoryByKeywords(note);
  
  if (!category) {
    category = await categorizeWithAI(note);
  }

  if (type === "Income" && category === "Lainnya") {
    category = "Gaji";
  }

  return {
    date: new Date().toISOString().slice(0, 10),
    type,
    category,
    amount,
    note: note === "" ? "-" : note,
  };
}
