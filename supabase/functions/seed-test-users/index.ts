// TEMPORARY test-user seeder. Delete after QA testing.
// Creates 4 deterministic test users with known passwords for end-to-end role testing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_PASSWORD = "CareVaultTest!2026";
const LAGOS_FACILITY = "00000000-0000-4000-a000-000000000001";
const ABUJA_FACILITY = "00000000-0000-4000-a000-000000000002";

const TEST_USERS = [
  { email: "clinician.test@carevault.test", full_name: "QA Clinician", role: "clinician", facility_id: LAGOS_FACILITY },
  { email: "fa.test@carevault.test",        full_name: "QA Facility Admin", role: "facility_admin", facility_id: ABUJA_FACILITY },
  { email: "cva.test@carevault.test",       full_name: "QA CareVault Admin", role: "carevault_admin", facility_id: null },
  { email: "researcher.test@carevault.test",full_name: "QA Researcher", role: "researcher", facility_id: null },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // CareVault-admin gate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData } = await userClient.auth.getClaims(token);
    const callerId = claimsData?.claims?.sub as string | undefined;
    if (!callerId) throw new Error("Unauthorized");
    const { data: callerRole } = await admin.from("user_roles").select("role").eq("user_id", callerId).single();
    if (callerRole?.role !== "carevault_admin") throw new Error("Forbidden: CareVault admin only");

    if (req.method === "DELETE") {
      const results: any[] = [];
      for (const u of TEST_USERS) {
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list?.users?.find((x: any) => x.email === u.email);
        if (existing) {
          await admin.auth.admin.deleteUser(existing.id);
          results.push({ email: u.email, deleted: true });
        } else {
          results.push({ email: u.email, deleted: false, reason: "not found" });
        }
      }
      return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // CREATE / UPSERT
    const results: any[] = [];
    const { data: list } = await admin.auth.admin.listUsers();
    for (const u of TEST_USERS) {
      const existing = list?.users?.find((x: any) => x.email === u.email);
      let userId: string;
      if (existing) {
        userId = existing.id;
        // Reset password to known value
        await admin.auth.admin.updateUserById(userId, { password: TEST_PASSWORD, email_confirm: true });
      } else {
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email: u.email,
          password: TEST_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: u.full_name },
        });
        if (cErr || !created?.user) { results.push({ email: u.email, error: cErr?.message }); continue; }
        userId = created.user.id;
      }
      // Upsert profile (trigger creates a default; we set facility)
      await admin.from("profiles").upsert({ id: userId, full_name: u.full_name, facility_id: u.facility_id });
      // Set role: delete existing, insert desired
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.from("user_roles").insert({ user_id: userId, role: u.role });
      results.push({ email: u.email, role: u.role, password: TEST_PASSWORD, ok: true });
    }
    return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
