import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;
let groq = null;

if (apiKey) {
  groq = new Groq({ apiKey });
} else {
  console.warn("⚠️ GROQ_API_KEY tidak ditemukan. OCR Scanner tidak akan berfungsi.");
}

const CATEGORIES = [
  "Makanan", "Transportasi", "Belanja", "Tagihan",
  "Hiburan", "Kesehatan", "Pendidikan", "Investasi",
  "Donasi", "Gaji", "Lainnya"
];

/**
 * Download a Telegram photo as base64.
 * @param {string} fileUrl - The direct HTTPS URL to the Telegram file.
 * @returns {Promise<{ base64: string, mimeType: string }>}
 */
async function downloadImageAsBase64(fileUrl) {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Gagal mengunduh gambar: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return { base64, mimeType: contentType.split(";")[0] };
}

/**
 * Scan a receipt image and extract transaction data using Groq Vision.
 * @param {string} telegramFileUrl - The direct Telegram file URL (after calling getFile).
 * @returns {Promise<object>} Structured receipt data.
 */
export async function scanReceipt(telegramFileUrl) {
  if (!groq) {
    return {
      is_receipt: false,
      reply_message: "❌ OCR tidak dapat berjalan karena GROQ_API_KEY belum dikonfigurasi.",
    };
  }

  // Download the image as base64
  let imageData;
  try {
    imageData = await downloadImageAsBase64(telegramFileUrl);
  } catch (err) {
    console.error("❌ Gagal download gambar:", err.message);
    return {
      is_receipt: false,
      reply_message: "❌ Gagal mengunduh gambar dari Telegram. Coba kirim ulang fotonya.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for vision

  try {
    const response = await groq.chat.completions.create(
      {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${imageData.mimeType};base64,${imageData.base64}`,
                },
              },
              {
                type: "text",
                text: `Kamu adalah AI asisten analisis struk belanja untuk aplikasi keuangan Indonesia.

Analisis gambar ini dan tentukan apakah ini adalah struk/nota/kwitansi belanja.

Jika IYA (struk/nota/kwitansi):
Ekstrak informasi berikut dan kembalikan HANYA format JSON valid ini (tanpa markdown):
{
  "is_receipt": true,
  "merchant_name": "nama toko/merchant (misal: Indomaret, Warung Pak Budi, Starbucks)",
  "total_amount": angka total pembayaran bersih dalam Rupiah (tanpa simbol, misal: 45000),
  "category": salah satu dari: ${CATEGORIES.join(", ")},
  "note": "catatan singkat (misal: belanja Indomaret, makan siang, kopi Starbucks)",
  "items": ["daftar item utama jika terlihat, maksimal 5 item paling mahal"],
  "reply_message": "konfirmasi ramah dalam Bahasa Indonesia yang menyebutkan nama toko dan total"
}

Jika BUKAN struk (foto biasa, selfie, pemandangan, dokumen lain):
{
  "is_receipt": false,
  "reply_message": "balasan ramah bahwa gambar tidak terdeteksi sebagai struk belanja, minta kirim foto struk yang lebih jelas"
}

Panduan kategori:
- Makanan: warung, kafe, restoran, fastfood, delivery makanan
- Belanja: minimarket, supermarket, online shop, toko baju, toko elektronik
- Transportasi: SPBU, parkir, tol, bengkel
- Tagihan: PLN, PDAM, wifi, pulsa, kos/kontrakan
- Hiburan: bioskop, karaoke, game, event
- Kesehatan: apotek, klinik, rumah sakit

PENTING: Total amount harus berupa angka numerik murni (bukan string). Jika tidak bisa membaca total dengan yakin, gunakan nilai terbesar yang terlihat di struk.`
              }
            ]
          }
        ],
        temperature: 0,
        max_tokens: 500,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const content = response.choices[0].message.content.trim();

    // Try to parse the JSON from the response
    let result;
    try {
      // Strip any potential markdown code blocks
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("❌ Gagal parse JSON dari Vision AI:", content);
      return {
        is_receipt: false,
        reply_message: "⚠️ AI berhasil membaca gambar tapi gagal mengekstrak data. Coba kirim foto struk yang lebih terang dan jelas.",
      };
    }

    return result;

  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      console.warn("⚠️ OCR Vision API timeout setelah 20 detik.");
      return {
        is_receipt: false,
        reply_message: "⏱️ Maaf, proses membaca struk memakan waktu terlalu lama. Coba lagi dengan foto yang lebih kecil atau lebih terang.",
      };
    }
    console.error("❌ Gagal memanggil OCR Vision API:", err.message);
    return {
      is_receipt: false,
      reply_message: `❌ Terjadi kesalahan saat memproses gambar: ${err.message}`,
    };
  }
}
