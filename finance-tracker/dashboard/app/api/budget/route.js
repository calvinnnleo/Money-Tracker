export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { saveDbBudget, deleteDbBudget, hasSupabaseConfig } from "../../../lib/supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const { category, budget } = body;

    if (!category || budget === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (hasSupabaseConfig()) {
      await saveDbBudget(category, budget);
      return NextResponse.json({ success: true });
    } else {
      console.log("ℹ️ Kredensial Supabase tidak ditemukan. Menjalankan simulasi POST budget.");
      return NextResponse.json({ success: true, offline: true });
    }
  } catch (err) {
    console.error("❌ Gagal menyimpan budget:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    if (!category) {
      return NextResponse.json({ error: "Missing category parameter" }, { status: 400 });
    }

    if (hasSupabaseConfig()) {
      await deleteDbBudget(category);
      return NextResponse.json({ success: true });
    } else {
      console.log("ℹ️ Kredensial Supabase tidak ditemukan. Menjalankan simulasi DELETE budget.");
      return NextResponse.json({ success: true, offline: true });
    }
  } catch (err) {
    console.error("❌ Gagal menghapus budget:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

