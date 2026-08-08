import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getDbWallets, addDbWallet, addDbWalletTransfer } from "../../../lib/supabase";

async function getAuthUser(cookieStore) {
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
  return { user, supabase };
}

export async function GET() {
  const { user } = await getAuthUser(cookies());
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const wallets = await getDbWallets(user.id);
    return NextResponse.json({ wallets });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { user } = await getAuthUser(cookies());
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "transfer") {
      const { from_wallet_id, to_wallet_id, amount, note, date } = body;
      if (!from_wallet_id || !to_wallet_id || !amount) {
        return NextResponse.json({ error: "Data transfer tidak lengkap" }, { status: 400 });
      }
      const transfer = await addDbWalletTransfer(user.id, { from_wallet_id, to_wallet_id, amount: Number(amount), note, date });
      return NextResponse.json({ success: true, transfer });
    }

    const { name, emoji, color, type, initial_balance } = body;
    if (!name) {
      return NextResponse.json({ error: "Nama wallet wajib diisi" }, { status: 400 });
    }

    const newWallet = await addDbWallet(user.id, {
      name,
      emoji: emoji || "💳",
      color: color || "#AF52DE",
      type: type || "debit",
      initial_balance: Number(initial_balance) || 0,
    });

    return NextResponse.json({ success: true, wallet: newWallet });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
