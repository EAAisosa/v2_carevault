import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !caller) throw new Error("Unauthorized");

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();
    if (callerRole?.role !== "administrator") throw new Error("Forbidden: admin only");

    // Get caller's facility
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("facility_id")
      .eq("id", caller.id)
      .single();
    if (!callerProfile?.facility_id) throw new Error("You must be assigned to a facility");

    const { action, ...payload } = await req.json();

    if (action === "invite") {
      const { email, full_name, role, facility_id } = payload;
      // Only allow managing users in caller's own facility
      if (facility_id !== callerProfile.facility_id) throw new Error("Cannot manage users outside your facility");

      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name, facility_id, role: role || "clinician" },
        redirectTo: `${req.headers.get("origin") || "https://carevaultng.lovable.app"}/auth`,
      });
      if (createErr) throw createErr;

      return new Response(JSON.stringify({ user: newUser.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      const { user_id, role } = payload;
      // Verify target user is in same facility
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("facility_id")
        .eq("id", user_id)
        .single();
      if (targetProfile?.facility_id !== callerProfile.facility_id) throw new Error("User not in your facility");

      await supabaseAdmin.from("user_roles").update({ role }).eq("user_id", user_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "deactivate") {
      const { user_id } = payload;
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("facility_id")
        .eq("id", user_id)
        .single();
      if (targetProfile?.facility_id !== callerProfile.facility_id) throw new Error("User not in your facility");

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "activate") {
      const { user_id } = payload;
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("facility_id")
        .eq("id", user_id)
        .single();
      if (targetProfile?.facility_id !== callerProfile.facility_id) throw new Error("User not in your facility");

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { user_id } = payload;
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("facility_id")
        .eq("id", user_id)
        .single();
      if (targetProfile?.facility_id !== callerProfile.facility_id) throw new Error("User not in your facility");
      if (user_id === caller.id) throw new Error("Cannot delete yourself");

      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const { user_id } = payload;
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("facility_id")
        .eq("id", user_id)
        .single();
      if (targetProfile?.facility_id !== callerProfile.facility_id) throw new Error("User not in your facility");

      // Get user email
      const { data: { user: targetUser }, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (getUserErr || !targetUser?.email) throw new Error("Could not find user email");

      // Generate a password reset link
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: targetUser.email,
        options: {
          redirectTo: `${req.headers.get("origin") || "https://carevaultng.lovable.app"}/auth`,
        },
      });
      if (linkErr) throw linkErr;

      return new Response(JSON.stringify({ success: true, message: `Password reset link generated for ${targetUser.email}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "resend_invite") {
      const { user_id } = payload;
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("facility_id")
        .eq("id", user_id)
        .single();
      if (targetProfile?.facility_id !== callerProfile.facility_id) throw new Error("User not in your facility");

      const { data: { user: targetUser }, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (getUserErr || !targetUser?.email) throw new Error("Could not find user email");

      const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(targetUser.email, {
        data: targetUser.user_metadata,
        redirectTo: `${req.headers.get("origin") || "https://carevaultng.lovable.app"}/auth`,
      });
      if (inviteErr) throw inviteErr;

      return new Response(JSON.stringify({ success: true, message: `Invite resent to ${targetUser.email}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const { data: users } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, facility_id, created_at")
        .eq("facility_id", callerProfile.facility_id);

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
        };
      });

      return new Response(JSON.stringify({ users: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
