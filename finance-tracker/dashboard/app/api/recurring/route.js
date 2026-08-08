import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getDbRecurring, addDbRecurring, toggleDbRecurring, deleteDbRecurring } from "../../../lib/supabase";

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
    const recurring = await getDbRecurring(user.id);
    return NextResponse.json({ recurring });
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
    const { title, type, category, amount, wallet_id, frequency, day_of_month } = body;

    if (!title || !amount) {
      return NextResponse.json({ error: "Data transaksi rutin tidak lengkap" }, { status: 400 });
    }

    const item = await addDbRecurring(user.id, {
      title,
      type: type || "Expense",
      category: category || "Lainnya",
      amount: Number(amount),
      wallet_id: wallet_id || null,
      frequency: frequency || "monthly",
      day_of_month: Number(day_of_month) || 1,
      is_active: true,
    });

    return NextResponse.json({ success: true, recurring: item });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const { user } = await getAuthUser(cookies());
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const updated = await toggleDbRecurring(user.id, id, is_active);
    return NextResponse.json({ success: true, recurring: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { user } = await getAuthUser(cookies());
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  try {
    await deleteDbRecurring(user.id, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
