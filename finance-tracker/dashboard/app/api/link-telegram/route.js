import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code } = await request.json();
    if (!code || code.trim().length !== 6) {
      return NextResponse.json({ error: "Kode harus 6 karakter." }, { status: 400 });
    }

    const formattedCode = code.trim().toUpperCase();

    // Temukan kode di tabel
    const { data: codeData, error: codeError } = await supabase
      .from("telegram_link_codes")
      .select("*")
      .eq("code", formattedCode)
      .eq("used", false)
      .single();

    if (codeError || !codeData) {
      return NextResponse.json({ error: "Kode link tidak valid, sudah digunakan, atau salah." }, { status: 400 });
    }

    // Cek umur kode (maksimal 10 menit)
    const codeAgeMs = Date.now() - new Date(codeData.created_at).getTime();
    if (codeAgeMs > 10 * 60 * 1000) {
      return NextResponse.json({ error: "Kode link sudah kedaluwarsa (lebih dari 10 menit)." }, { status: 400 });
    }

    // Update profile dengan telegram_id baru
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        telegram_id: codeData.telegram_id,
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Gagal update profile:", profileError.message);
      return NextResponse.json({ error: "Gagal menghubungkan profil: " + profileError.message }, { status: 500 });
    }

    // Tandai kode sebagai terpakai
    await supabase
      .from("telegram_link_codes")
      .update({ used: true })
      .eq("id", codeData.id);

    return NextResponse.json({ success: true, telegramName: codeData.telegram_name });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
