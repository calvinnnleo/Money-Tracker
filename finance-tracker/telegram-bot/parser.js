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

// Extract number amount and return parsed value along with note text
export function parseNumberAndNote(text) {
  // Regex to match numbers like 25000, 25.000, 1,5jt, 2.5jt, 25rb, 10k, 2.500.000
  // Group 1: the number part (with dots/commas)
  // Group 2: the multiplier unit (jt, juta, rb, ribu, k)
  const regex = /\b([\d.,]+)\s*(juta|jt|ribu|rb|k)?\b/i;
  const match = text.match(regex);
  if (!match) return null;

  const fullMatch = match[0];
  const numberPartRaw = match[1];
  const unit = match[2] ? match[2].toLowerCase() : "";

  // Normalize number part: replace comma with dot for floats, and remove thousands separators (dots)
  // Check if comma is used as decimal separator (e.g. 1,5jt)
  let normalizedNum = numberPartRaw;
  if (normalizedNum.includes(",") && !normalizedNum.includes(".")) {
    // Looks like 1,5jt. Replace comma with dot.
    normalizedNum = normalizedNum.replace(",", ".");
  } else {
    // Looks like 2.500.000 or 150000. Strip all dots.
    normalizedNum = normalizedNum.replace(/\./g, "");
    // Replace commas (if any, like US style)
    normalizedNum = normalizedNum.replace(/,/g, "");
  }

  let amount = parseFloat(normalizedNum);
  if (isNaN(amount)) return null;

  // Apply shorthand multiplier
  if (unit && SHORTHAND[unit]) {
    amount *= SHORTHAND[unit];
  }

  // Remove the number pattern from original text to isolate the note
  let note = text.replace(fullMatch, "").trim();
  // Clean up double spaces
  note = note.replace(/\s+/g, " ");

  return {
    amount: Math.round(amount),
    note: note || "-",
  };
}

export async function parseMessage(text) {
  const cleanText = text.trim();
  
  // Try to parse amount and note
  const parsed = parseNumberAndNote(cleanText);
  if (!parsed) return null;

  let { amount, note } = parsed;
  let type = "Expense";

  // Check if type is income
  const lowerNote = note.toLowerCase();
  if (lowerNote.startsWith("masuk ") || lowerNote.endsWith(" masuk") || lowerNote === "masuk") {
    type = "Income";
    // Strip the "masuk" keyword from note
    note = note.replace(/\bmasuk\b/gi, "").trim();
  } else if (lowerNote.startsWith("keluar ") || lowerNote.endsWith(" keluar") || lowerNote === "keluar") {
    type = "Expense";
    // Strip the "keluar" keyword
    note = note.replace(/\bkeluar\b/gi, "").trim();
  }

  // Clean note again
  note = note || "-";

  // Determine category
  // First, check keywords
  let category = guessCategoryByKeywords(note);
  
  // If not matched, use Groq AI fallback
  if (!category) {
    category = await categorizeWithAI(note);
  }

  // Double check if type is Income, set category to Gaji if it matched Gaji or left as Gaji
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
