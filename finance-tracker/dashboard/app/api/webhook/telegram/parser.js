import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;
let groq = null;

if (apiKey) {
  groq = new Groq({ apiKey });
}

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

function fallbackRegexParser(text) {
  const parsed = parseNumberAndNote(text);
  if (!parsed) {
    return {
      is_transaction: false,
      reply_message: "Halo! Saya tidak mengenali format tersebut. Silakan ketik nominal dan nama transaksi, contoh: `kopi 25rb` atau `masuk 5jt gaji`."
    };
  }

  let { amount, note } = parsed;
  let type = "Expense";
  const lowerNote = note.toLowerCase();
  if (lowerNote.startsWith("masuk ") || lowerNote.endsWith(" masuk") || lowerNote === "masuk") {
    type = "Income";
    note = note.replace(/\bmasuk\b/gi, "").trim();
  }

  let category = guessCategoryByKeywords(note);
  if (!category) {
    category = type === "Income" ? "Gaji" : "Lainnya";
  }

  return {
    is_transaction: true,
    type,
    amount,
    category,
    note: note || "-",
    reply_message: `✅ *Dicatat otomatis!* (${type === "Income" ? "Pemasukan" : "Pengeluaran"})\n\n` +
      `• Kategori: *${category}*\n` +
      `• Nominal: *Rp${Math.round(amount).toLocaleString("id-ID")}*\n` +
      `• Catatan: _${note || "-"}_`
  };
}

export async function parseMessage(text) {
  if (!groq) {
    console.warn("⚠️ GROQ_API_KEY tidak ditemukan. Fallback ke parser regex.");
    return fallbackRegexParser(text);
  }

  const CATEGORIES = [
    "Makanan", "Transportasi", "Belanja", "Tagihan",
    "Hiburan", "Kesehatan", "Pendidikan", "Investasi",
    "Donasi", "Gaji", "Lainnya"
  ];

  // Use AbortController for a strict 6-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await groq.chat.completions.create(
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `Kamu adalah KasLeo AI, asisten chatbot keuangan pribadi Indonesia yang ramah.
Tugasmu adalah menganalisis pesan chat pengguna dan mengembalikan data terstruktur dalam format JSON.

Pahami jenis pesan berikut:
1. Obrolan Biasa (chit-chat, sapaan seperti "halo", "siapa kamu", "cara pakai", atau pertanyaan umum):
   Set "is_transaction" ke false.
   Berikan balasan ramah di "reply_message" dengan contoh pencatatan (misalnya: "Halo! Saya KasLeo AI. Kamu bisa catat seperti 'makan bakso 35k' atau 'gaji freelance masuk 2jt'.").

2. Transaksi Keuangan (pengeluaran atau pemasukan):
   Set "is_transaction" ke true.
   Klasifikasikan:
   - "type": "Expense" (jika beli, bayar, pengeluaran, keluar) atau "Income" (jika gaji, bonus, masuk, terima uang).
   - "amount": angka nominal bersih (misal "50k" -> 50000, "1.5jt" -> 1500000, "20 ribu" -> 20000).
   - "category": salah satu dari: ${CATEGORIES.join(", ")}.
   - "note": nama barang/kegiatan saja (misal "beli bensin shell 50rb" -> note "bensin shell").
   - "reply_message": konfirmasi sukses mencatat dengan menyebutkan nominal terformat, kategori, dan catatan secara bersahabat.

Kembalikan HANYA format JSON valid seperti ini tanpa markdown code block:
{
  "is_transaction": boolean,
  "type": "Expense" | "Income" | null,
  "amount": number | null,
  "category": string | null,
  "note": string | null,
  "reply_message": string
}`
          },
          {
            role: "user",
            content: text
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 250,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const content = response.choices[0].message.content.trim();
    const result = JSON.parse(content);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("❌ Gagal parseMessage dengan AI:", err.message);
    return fallbackRegexParser(text);
  }
}
