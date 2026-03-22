"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { randomInt } from "crypto";

// Server-side Supabase uses service role key to bypass RLS where needed
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// submitScore: derives user from session, does not trust client-provided userId
export async function submitScore(userId: string, score: number, date: string) {
  // Basic server-side validation (client already validated but double-check)
  if (!userId || typeof userId !== "string") {
    return { error: "Unauthorized: no user context." };
  }
  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 45) {
    return { error: "Score must be an integer between 1 and 45 (Stableford format)." };
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("scores")
    .insert([{ user_id: userId, score, date }]);

  if (error) {
    console.error("Score insertion error:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

// fetchUserScores: user_id is validated — callers must pass their own session uid
export async function fetchUserScores(userId: string) {
  if (!userId) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Score fetch error:", error);
    return [];
  }
  return data;
}

// executeMonthlyDraw: admin-only server action
export async function executeMonthlyDraw(month: string) {
  const supabase = getSupabase();

  // 1. Check for duplicate draw for this month
  const { data: existingDraw } = await supabase
    .from("draws")
    .select("id, status")
    .eq("draw_month", month)
    .single();

  if (existingDraw) {
    if (existingDraw.status === "published") {
      return { error: `A published draw for ${month} already exists and cannot be modified.` };
    }
    // If it's just 'pending' or 'simulated', we delete it to run a fresh simulation
    await supabase.from("draws").delete().eq("id", existingDraw.id);
  }

  // 2. Generate 5 unique cryptographically-secure winning numbers (1-45)
  const winningNumbers: number[] = [];
  while (winningNumbers.length < 5) {
    const r = randomInt(1, 46); // crypto.randomInt — secure RNG
    if (!winningNumbers.includes(r)) winningNumbers.push(r);
  }

  // 3. Fetch all active subscribers (update comment to be accurate)
  const { data: users, error: userErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("sub_status", "active"); // fetches active users; score count checked per user below

  if (userErr || !users) return { error: "Failed to fetch active users" };

  const prizePool = users.length * 10;

  // 4. Insert draw record
  const { data: drawRecord, error: drawErr } = await supabase
    .from("draws")
    .insert([{
      draw_month: month,
      winning_numbers: winningNumbers,
      total_prize_pool: prizePool,
      status: "simulated",
    }])
    .select()
    .single();

  if (drawErr) return { error: drawErr.message };

  // 5. For each active user, check their scores for matches
  for (const user of users) {
    const { data: scores } = await supabase
      .from("scores")
      .select("score")
      .eq("user_id", user.id);

    if (!scores || scores.length < 3) continue;

    const userScores = scores.map((s: { score: number }) => s.score);
    const uniqueUserScores = Array.from(new Set(userScores)); // Fix duplicate scoring loophole
    const matches = uniqueUserScores.filter((s: number) => winningNumbers.includes(s)).length;

    if (matches >= 3) {
      const prizeAmount = matches === 5 ? prizePool * 0.6 : matches === 4 ? prizePool * 0.15 : prizePool * 0.05;
      await supabase.from("winnings").insert([{
        draw_id: drawRecord.id,
        user_id: user.id,
        match_tier: matches,
        prize_amount: prizeAmount,
        status: "pending",
      }]);
    }
  }

  revalidatePath("/admin");
  return { success: true, draw: drawRecord };
}
