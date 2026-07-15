import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;
let groq = null;

if (apiKey) {
  groq = new Groq({ apiKey });
} else {
  console.warn("⚠️ GROQ_API_KEY tidak ditemukan. AI Categorizer akan default ke 'Lainnya'.");
}

const CATEGORIES = [
  "Makanan", "Transportasi", "Belanja", "Tagihan",
  "Hiburan", "Kesehatan", "Pendidikan", "Investasi",
  "Donasi", "Gaji", "Lainnya"
];

const learnedKeywords = new Map();

function cleanWord(word) {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

export async function categorizeWithAI(text) {
  if (!text || text === "-") return "Lainnya";
  
  const words = text.split(/\s+/).map(cleanWord).filter(Boolean);
  
  for (const word of words) {
    if (learnedKeywords.has(word)) {
      console.log(`🤖 [Learned Cache Hit] Keyword: '${word}' -> Category: '${learnedKeywords.get(word)}'`);
      return learnedKeywords.get(word);
    }
  }

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
    
    if (CATEGORIES.includes(category)) {
      if (words.length > 0) {
        words.slice(0, 2).forEach((w) => {
          if (w.length > 3) {
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
