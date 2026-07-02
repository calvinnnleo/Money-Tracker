import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GROQ_API_KEY;
let groq = null;

if (apiKey) {
  groq = new Groq({ apiKey });
} else {
  console.warn("⚠️ GROQ_API_KEY tidak ditemukan di .env. AI Categorizer akan default ke 'Lainnya'.");
}

const CATEGORIES = [
  "Makanan", "Transportasi", "Belanja", "Tagihan",
  "Hiburan", "Kesehatan", "Pendidikan", "Investasi",
  "Donasi", "Gaji", "Lainnya"
];

// Simple in-memory memory of learned note keywords -> category mappings
// to prevent duplicate API requests for identical or similar phrases
const learnedKeywords = new Map();

// Helper to clean up input note for matching
function cleanWord(word) {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

export async function categorizeWithAI(text) {
  if (!text || text === "-") return "Lainnya";
  
  const words = text.split(/\s+/).map(cleanWord).filter(Boolean);
  
  // 1. Check if any word in the text was previously learned
  for (const word of words) {
    if (learnedKeywords.has(word)) {
      console.log(`🤖 [Learned Cache Hit] Keyword: '${word}' -> Category: '${learnedKeywords.get(word)}'`);
      return learnedKeywords.get(word);
    }
  }

  // If Groq client is not initialized, fallback to Lainnya
  if (!groq) {
    return "Lainnya";
  }

  try {
    console.log(`🤖 Panggilan Groq API (llama-3.1-8b-instant) untuk: "${text}"`);
    
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `Kamu adalah asisten pengelola keuangan pribadi Indonesia. 
Tugasmu adalah menganalisis catatan transaksi singkat dan mengelompokkannya ke dalam SATU kategori yang paling cocok dari daftar berikut:
${CATEGORIES.join(", ")}

Aturan:
- Balas HANYA dengan satu kata kategori dari daftar di atas. Jangan beri penjelasan, tanda baca, atau spasi tambahan.
- Konteks adalah transaksi harian di Indonesia (e.g. warkop -> Makanan, bayar kos -> Tagihan, top up shopeepay -> Belanja, isi emoney -> Transportasi, nonton bioskop -> Hiburan, beli buku -> Pendidikan).
- Jika tidak yakin atau tidak cocok dengan yang lain, balas: Lainnya.`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0,
      max_tokens: 15,
    });

    const category = response.choices[0].message.content.trim();
    
    // Validate output
    if (CATEGORIES.includes(category)) {
      // Learn the main words of this note
      if (words.length > 0) {
        // Learn the first 2 significant words
        words.slice(0, 2).forEach((w) => {
          if (w.length > 3) { // Only learn longer words to avoid noise like "di", "ke"
            learnedKeywords.set(w, category);
          }
        });
      }
      return category;
    }
    
    return "Lainnya";
  } catch (err) {
    console.error("❌ Gagal mengategorikan dengan AI:", err.message);
    return "Lainnya";
  }
}
