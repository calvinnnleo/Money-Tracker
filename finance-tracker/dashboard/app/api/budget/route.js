export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { saveDbBudget, deleteDbBudget, hasSupabaseConfig } from "../../../lib/supabase";

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
  return { user };
}

export async function POST(request) {
  const { user } = await getAuthUser(cookies());
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { category, budget } = body;

    if (!category || budget === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (hasSupabaseConfig()) {
      await saveDbBudget(user.id, category, budget);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: true, offline: true });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { user } = await getAuthUser(cookies());
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    if (!category) {
      return NextResponse.json({ error: "Missing category parameter" }, { status: 400 });
    }

    if (hasSupabaseConfig()) {
      await deleteDbBudget(user.id, category);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: true, offline: true });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
