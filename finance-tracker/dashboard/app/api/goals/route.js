import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getDbGoals, addDbGoal, addDbGoalContribution, deleteDbGoal } from "../../../lib/supabase";

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
    const goals = await getDbGoals(user.id);
    return NextResponse.json({ goals });
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

    if (action === "deposit") {
      const { goal_id, amount, note } = body;
      if (!goal_id || !amount) {
        return NextResponse.json({ error: "Data setoran tidak lengkap" }, { status: 400 });
      }
      const updatedGoal = await addDbGoalContribution(user.id, goal_id, Number(amount), note || "");
      return NextResponse.json({ success: true, goal: updatedGoal });
    }

    const { title, target_amount, target_date, emoji, color } = body;
    if (!title || !target_amount) {
      return NextResponse.json({ error: "Judul dan target dana wajib diisi" }, { status: 400 });
    }

    const goal = await addDbGoal(user.id, {
      title,
      target_amount: Number(target_amount),
      target_date: target_date || null,
      emoji: emoji || "🎯",
      color: color || "#AF52DE",
      current_amount: 0,
      is_completed: false,
    });

    return NextResponse.json({ success: true, goal });
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
    await deleteDbGoal(user.id, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
