/**
 * Server-side regression tests for the collaboration surface.
 *
 * These bypass the UI and hit PostgREST directly with three identities —
 * host, invited member, unrelated outsider — plus an anonymous client, to
 * prove that row-level security, not the UI, is what blocks cross-workspace
 * access to invitations, membership, review notes and the activity timeline.
 *
 * Run with: bun tests/collab-rls.e2e.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_SERVICE_ROLE_KEY");
}

const PASSWORD = "Fixture@123-UCX";
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

const created: string[] = [];
const failures: string[] = [];

function check(condition: unknown, label: string) {
  if (condition) {
    console.log(`✓ ${label}`);
  } else {
    failures.push(label);
    console.error(`✗ ${label}`);
  }
}

type Actor = { client: SupabaseClient; userId: string; email: string; name: string };

async function makeActor(prefix: string): Promise<Actor> {
  const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `rls-${prefix}-${stamp}@usecasex.test`;
  const name = `RLS ${prefix} ${stamp}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error || !data.user) throw error ?? new Error(`could not create ${email}`);
  created.push(data.user.id);
  await admin
    .from("profiles")
    .upsert({ user_id: data.user.id, email, full_name: name }, { onConflict: "user_id" });

  const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error) throw signIn.error;
  return { client, userId: data.user.id, email, name };
}

async function workspaceOf(actor: Actor): Promise<string> {
  const { data, error } = await actor.client.rpc("ensure_user_workspace");
  if (error) throw error;
  return data as string;
}

async function main() {
  const host = await makeActor("host");
  const member = await makeActor("member");
  const outsider = await makeActor("outsider");

  const hostWs = await workspaceOf(host);
  const outsiderWs = await workspaceOf(outsider);
  await workspaceOf(member);
  check(hostWs !== outsiderWs, "each account is provisioned into its own workspace");

  // ------------------------------------------------------------- entity
  const { data: opportunity, error: oppErr } = await host.client
    .from("opportunities")
    .insert({
      workspace_id: hostWs,
      created_by: host.userId,
      title: `RLS collaboration probe ${Date.now()}`,
    })
    .select("id")
    .single();
  if (oppErr) throw oppErr;
  const entityId = opportunity.id as string;

  const { data: comment, error: commentErr } = await host.client
    .from("collab_comments")
    .insert({
      workspace_id: hostWs,
      entity_type: "opportunity",
      entity_id: entityId,
      body: "Host-only review note",
      author_id: host.userId,
    })
    .select("id")
    .single();
  if (commentErr) throw commentErr;

  await host.client.from("collab_review_states").upsert(
    {
      workspace_id: hostWs,
      entity_type: "opportunity",
      entity_id: entityId,
      status: "ready_for_review",
      updated_by: host.userId,
    },
    { onConflict: "entity_type,entity_id" },
  );

  // -------------------------------------------------------- invitations
  const shareToken = `t-${crypto.randomUUID().replace(/-/g, "")}`;
  const emailToken = `t-${crypto.randomUUID().replace(/-/g, "")}`;
  const expiresAt = new Date(Date.now() + 7 * 864e5).toISOString();
  const { error: inviteErr } = await host.client.from("workspace_invitations").insert([
    {
      workspace_id: hostWs,
      email: null,
      role: "contributor",
      token: shareToken,
      expires_at: expiresAt,
      invited_by: host.userId,
    },
    {
      workspace_id: hostWs,
      email: member.email,
      role: "contributor",
      token: emailToken,
      expires_at: expiresAt,
      invited_by: host.userId,
    },
  ]);
  check(!inviteErr, "host can create invitations in their own workspace");

  const outsiderInvite = await outsider.client.from("workspace_invitations").insert({
    workspace_id: hostWs,
    email: null,
    role: "admin",
    token: `t-${crypto.randomUUID().replace(/-/g, "")}`,
    expires_at: expiresAt,
    invited_by: outsider.userId,
  });
  check(Boolean(outsiderInvite.error), "outsider cannot create invitations into another workspace");

  const outsiderReadsInvites = await outsider.client
    .from("workspace_invitations")
    .select("id")
    .eq("workspace_id", hostWs);
  check(
    (outsiderReadsInvites.data ?? []).length === 0,
    "outsider cannot read another workspace's invitations",
  );

  const anonReadsInvites = await anon.from("workspace_invitations").select("id").limit(5);
  check(
    (anonReadsInvites.data ?? []).length === 0,
    "anonymous cannot read invitations",
  );

  const anonAccept = await anon.rpc("accept_workspace_invitation", { _token: shareToken });
  check(Boolean(anonAccept.error), "anonymous cannot redeem an invitation");

  const wrongRecipient = await outsider.client.rpc("accept_workspace_invitation", {
    _token: emailToken,
  });
  check(
    Boolean(wrongRecipient.error),
    "an email-scoped invitation is refused for a different account",
  );

  // ------------------------------------------------- pre-join isolation
  const preJoinComments = await member.client
    .from("collab_comments")
    .select("id")
    .eq("entity_id", entityId);
  check(
    (preJoinComments.data ?? []).length === 0,
    "invited user cannot read review notes before joining",
  );
  const anonComments = await anon.from("collab_comments").select("id").eq("entity_id", entityId);
  check((anonComments.data ?? []).length === 0, "anonymous cannot read review notes");
  const anonTimeline = await anon.from("audit_events").select("id").eq("entity_id", entityId);
  check((anonTimeline.data ?? []).length === 0, "anonymous cannot read the activity timeline");
  const outsiderTimeline = await outsider.client
    .from("audit_events")
    .select("id")
    .eq("entity_id", entityId);
  check(
    (outsiderTimeline.data ?? []).length === 0,
    "outsider cannot read another workspace's activity timeline",
  );
  const outsiderOpportunity = await outsider.client
    .from("opportunities")
    .select("id")
    .eq("id", entityId);
  check(
    (outsiderOpportunity.data ?? []).length === 0,
    "outsider cannot read another workspace's opportunity",
  );
  const outsiderWrite = await outsider.client.from("collab_comments").insert({
    workspace_id: hostWs,
    entity_type: "opportunity",
    entity_id: entityId,
    body: "Should never land",
    author_id: outsider.userId,
  });
  check(Boolean(outsiderWrite.error), "outsider cannot write a review note into that workspace");

  // ----------------------------------------------------------- joining
  const joined = await member.client.rpc("accept_workspace_invitation", { _token: emailToken });
  check(!joined.error, "the intended recipient can redeem their email invitation");

  const memberComments = await member.client
    .from("collab_comments")
    .select("id")
    .eq("entity_id", entityId);
  check((memberComments.data ?? []).length === 1, "a joined member can read the review notes");

  const memberNote = await member.client
    .from("collab_comments")
    .insert({
      workspace_id: hostWs,
      entity_type: "opportunity",
      entity_id: entityId,
      body: "Member note",
      author_id: member.userId,
    })
    .select("id")
    .single();
  check(!memberNote.error, "a joined member can add a review note");

  const memberTimeline = await member.client
    .from("audit_events")
    .select("id")
    .eq("entity_id", entityId);
  check((memberTimeline.data ?? []).length > 0, "a joined member can read the activity timeline");

  // A member is not an admin: they cannot mint invitations or evict the host.
  const memberInvite = await member.client.from("workspace_invitations").insert({
    workspace_id: hostWs,
    email: null,
    role: "admin",
    token: `t-${crypto.randomUUID().replace(/-/g, "")}`,
    expires_at: expiresAt,
    invited_by: member.userId,
  });
  check(
    Boolean(memberInvite.error),
    "a plain member cannot create invitations for the workspace",
  );
  const memberEvictsHost = await member.client
    .from("workspace_members")
    .delete()
    .eq("workspace_id", hostWs)
    .eq("user_id", host.userId)
    .select("user_id");
  check(
    (memberEvictsHost.data ?? []).length === 0,
    "a plain member cannot remove the workspace owner",
  );

  // -------------------------------------------------------- removal
  const removal = await host.client
    .from("workspace_members")
    .delete()
    .eq("workspace_id", hostWs)
    .eq("user_id", member.userId)
    .select("user_id");
  check((removal.data ?? []).length === 1, "the host can remove a member");

  const afterComments = await member.client
    .from("collab_comments")
    .select("id")
    .eq("entity_id", entityId);
  check(
    (afterComments.data ?? []).length === 0,
    "a removed member immediately loses read access to review notes",
  );
  const afterTimeline = await member.client
    .from("audit_events")
    .select("id")
    .eq("entity_id", entityId);
  check(
    (afterTimeline.data ?? []).length === 0,
    "a removed member immediately loses the activity timeline",
  );
  const afterWrite = await member.client.from("collab_comments").insert({
    workspace_id: hostWs,
    entity_type: "opportunity",
    entity_id: entityId,
    body: "After removal",
    author_id: member.userId,
  });
  check(Boolean(afterWrite.error), "a removed member can no longer write review notes");
  const afterOpportunity = await member.client
    .from("opportunities")
    .select("id")
    .eq("id", entityId);
  check(
    (afterOpportunity.data ?? []).length === 0,
    "a removed member can no longer read the opportunity",
  );
  const afterInvites = await member.client
    .from("workspace_invitations")
    .select("id")
    .eq("workspace_id", hostWs);
  check(
    (afterInvites.data ?? []).length === 0,
    "a removed member can no longer read the workspace's invitations",
  );

  void comment;
}

main()
  .then(async () => {
    for (const id of created) {
      try {
        await admin.auth.admin.deleteUser(id);
      } catch {
        /* isolated throwaway tenant; leaving it is harmless */
      }
    }
    if (failures.length > 0) {
      console.error(`\n${failures.length} RLS check(s) failed:\n- ${failures.join("\n- ")}`);
      process.exit(1);
    }
    console.log("\nAll collaboration RLS checks passed.");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
