"use server";

import { createClient } from "@supabase/supabase-js";

// Uses service role key to bypass RLS
function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function fetchAdminData() {
  const supabase = getAdminSupabase();

  // Fetch all profiles (bypassing RLS), excluding the admin email
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@vantage.golf";
  
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .neq("email", adminEmail)
    .order("created_at", { ascending: false });

  // Fetch charities
  const { data: charitiesData, error: charitiesError } = await supabase
    .from("charities")
    .select("*");

  // Fetch draws
  const { data: drawsData, error: drawsError } = await supabase
    .from("draws")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (profilesError) console.error("Admin fetch profiles error:", profilesError);
  if (charitiesError) console.error("Admin fetch charities error:", charitiesError);
  if (drawsError) console.error("Admin fetch draws error:", drawsError);

  return {
    profiles: profilesData || [],
    charities: charitiesData || [],
    draws: drawsData || [],
  };
}
