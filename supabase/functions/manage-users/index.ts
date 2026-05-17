import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://app.carevaultng.com";

const getRedirectUrl = (path: string) => `${APP_URL}${path}`;

const jsonResponse = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller using JWT claims (no session check needed)
    const authHeader = req.headers.get("Authorization")!;
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) throw new Error("Unauthorized");
    const caller = { id: claimsData.claims.sub as string };

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();
    const role = callerRole?.role;
    if (role !== "carevault_admin" && role !== "facility_admin" && role !== "administrator") {
      throw new Error("Forbidden: admin only");
    }
    const isSuperAdmin = role === "carevault_admin";

    // Get caller's facility
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("facility_id")
      .eq("id", caller.id)
      .single();
    // Facility admins must have a facility; CareVault admins can operate without one
    if (!isSuperAdmin && !callerProfile?.facility_id) throw new Error("You must be assigned to a facility");
    const callerFacilityId = callerProfile?.facility_id;

    const { action, ...payload } = await req.json();

    if (action === "invite") {
      const { email, full_name, role, facility_id } = payload;
      // Only CareVault admins can create other CareVault admins or researchers
      if (role === "carevault_admin" && !isSuperAdmin) throw new Error("Only CareVault admins can assign the CareVault Admin role");
      if (role === "researcher" && !isSuperAdmin) throw new Error("Only CareVault admins can invite Researchers");
      // CareVault admins and researchers don't need a facility
      const facilitylessRoles = ["carevault_admin", "researcher"];
      if (!facilitylessRoles.includes(role)) {
        if (!isSuperAdmin && facility_id !== callerFacilityId) throw new Error("Cannot manage users outside your facility");
        if (!facility_id) throw new Error("Facility is required for this role");
      }

      const intendedRole = role || "clinician";
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name, facility_id, role: intendedRole },
        redirectTo: getRedirectUrl("/reset-password"),
      });
      if (createErr) {
        const msg = (createErr.message || "").toLowerCase();
        if (msg.includes("already") || msg.includes("registered") || (createErr as any).status === 422) {
          throw new Error(`A user with the email ${email} already exists. Use "Resend Invite" or "Reset Password" from the user's row instead.`);
        }
        throw createErr;
      }

      const userId = newUser.user.id;

      // Upsert role — handles both: trigger already ran (update) and trigger hasn't run yet (insert).
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: intendedRole }, { onConflict: "user_id" });
      if (roleErr) throw new Error(`Role assignment failed: ${roleErr.message}`);

      // Upsert profile — ensures full_name and facility_id are set regardless of trigger timing.
      const { error: profileErr } = await supabaseAdmin
        .from("profiles")
        .upsert(
          { id: userId, full_name, facility_id: facility_id || null },
          { onConflict: "id" }
        );
      if (profileErr) throw new Error(`Profile assignment failed: ${profileErr.message}`);

      return jsonResponse({ ok: true, user: newUser.user });
    }

    if (action === "update_role") {
      const { user_id, role } = payload;
      // Verify target user is in same facility
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("facility_id")
        .eq("id", user_id)
        .single();
      if (!isSuperAdmin && targetProfile?.facility_id !== callerFacilityId) throw new Error("User not in your facility");
      if (role === "carevault_admin" && !isSuperAdmin) throw new Error("Only CareVault admins can assign the CareVault Admin role");

      if (role === "researcher" && !isSuperAdmin) throw new Error("Only CareVault admins can assign the Researcher role");

      await supabaseAdmin.from("user_roles").update({ role }).eq("user_id", user_id);
      return jsonResponse({ ok: true, success: true });
    }

    if (action === "deactivate") {
      const { user_id } = payload;
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("facility_id")
        .eq("id", user_id)
        .single();
      if (!isSuperAdmin && targetProfile?.facility_id !== callerFacilityId) throw new Error("User not in your facility");

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
      if (error) throw error;
      return jsonResponse({ ok: true, success: true });
    }

    if (action === "activate") {
      const { user_id } = payload;
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("facility_id")
        .eq("id", user_id)
        .single();
      if (!isSuperAdmin && targetProfile?.facility_id !== callerFacilityId) throw new Error("User not in your facility");

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      if (error) throw error;
      return jsonResponse({ ok: true, success: true });
    }

    if (action === "delete") {
      const { user_id } = payload;
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("facility_id")
        .eq("id", user_id)
        .single();
      if (!isSuperAdmin && targetProfile?.facility_id !== callerFacilityId) throw new Error("User not in your facility");
      if (user_id === caller.id) throw new Error("Cannot delete yourself");

      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return jsonResponse({ ok: true, success: true });
    }

    if (action === "reset_password") {
      const { user_id } = payload;
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("facility_id")
        .eq("id", user_id)
        .single();
      if (!isSuperAdmin && targetProfile?.facility_id !== callerFacilityId) throw new Error("User not in your facility");

      // Get user email
      const { data: { user: targetUser }, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (getUserErr || !targetUser?.email) throw new Error("Could not find user email");

      // Generate a password reset link
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: targetUser.email,
        options: {
          redirectTo: getRedirectUrl("/reset-password"),
        },
      });
      if (linkErr) throw linkErr;

      return jsonResponse({ ok: true, success: true, message: `Password reset link generated for ${targetUser.email}` });
    }

    if (action === "resend_invite") {
      const { user_id } = payload;
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("facility_id")
        .eq("id", user_id)
        .single();
      if (!isSuperAdmin && targetProfile?.facility_id !== callerFacilityId) throw new Error("User not in your facility");

      const { data: { user: targetUser }, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (getUserErr || !targetUser?.email) throw new Error("Could not find user email");

      // Read the stored role so resend carries the correct one
      const { data: storedRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user_id)
        .single();

      const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(targetUser.email, {
        data: { ...targetUser.user_metadata, role: storedRole?.role || "clinician" },
        redirectTo: getRedirectUrl("/reset-password"),
      });
      if (inviteErr) throw inviteErr;

      return jsonResponse({ ok: true, success: true, message: `Invite resent to ${targetUser.email}` });
    }

    if (action === "list") {
      let query = supabaseAdmin
        .from("profiles")
        .select("id, full_name, facility_id, created_at");
      if (!isSuperAdmin) {
        query = query.eq("facility_id", callerFacilityId);
      }
      const { data: users } = await query;

      // Get facility names for mapping
      const facilityIds = [...new Set((users || []).map((u) => u.facility_id).filter(Boolean))];
      const { data: facilityRows } = facilityIds.length > 0
        ? await supabaseAdmin.from("facilities").select("id, name").in("id", facilityIds)
        : { data: [] };
      const facilityMap = Object.fromEntries((facilityRows || []).map((f) => [f.id, f.name]));

      // Get roles for these users
      const userIds = (users || []).map((u) => u.id);
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      // Get auth user info (email, banned, confirmed)
      const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

      const enriched = (users || []).map((u) => {
        const roleRow = (roles || []).find((r) => r.user_id === u.id);
        const authUser = (authUsers || []).find((a) => a.id === u.id);
        return {
          ...u,
          role: roleRow?.role || "clinician",
          email: authUser?.email || "",
          banned: !!authUser?.banned_until && new Date(authUser.banned_until) > new Date(),
          confirmed: !!authUser?.email_confirmed_at,
          last_sign_in: authUser?.last_sign_in_at || null,
          facility_name: u.facility_id ? facilityMap[u.facility_id] || "Unknown" : "—",
        };
      });

      return jsonResponse({ ok: true, users: enriched });
    }

    throw new Error("Unknown action");
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});
