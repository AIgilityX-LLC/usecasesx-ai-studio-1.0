/**
 * Audit & product-event immutability + activation counting.
 *
 *   • a signed-in tenant user CAN append audit and product events for themselves
 *   • they CANNOT update or delete any audit / product event (append-only)
 *   • they CANNOT forge another actor's record
 *   • activation events are countable by day / workspace via the internal view
 *
 * Run with: bun run tests/audit-immutability.e2e.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("Missing audit test credentials");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const password = process.env.SMOKE_DEMO_PASSWORD ?? "Demo@123";
const email = process.env.SMOKE_DEMO_EMAIL ?? "pro@demo.usecasex.app";
const marker = `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`;

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`✓ ${name}`);
  else {
    failures += 1;
    console.error(`✗ ${name} ${detail}`);
  }
}

async function main() {
  const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const { data: auth, error: authError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (authError || !auth.user) throw authError ?? new Error("sign-in failed");
  const userId = auth.user.id;

  const { data: membership } = await client
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  const workspaceId = (membership as { workspace_id?: string } | null)?.workspace_id ?? null;

  try {
    const { data: audit, error: auditError } = await client
      .from("audit_events")
      .insert({
        actor_id: userId,
        entity_type: "portfolio",
        event_type: "entity.created",
        new_value: { marker },
        request_id: marker,
        severity: "info",
        source: "e2e",
        workspace_id: workspaceId,
      })
      .select("id")
      .maybeSingle();
    check("tenant user can append an audit event", !auditError && !!audit, auditError?.message);

    const update = await client
      .from("audit_events")
      .update({ event_type: "tampered" })
      .eq("request_id", marker)
      .select("id");
    check(
      "audit events are immutable (no update)",
      !!update.error || (update.data?.length ?? 0) === 0,
    );

    const del = await client.from("audit_events").delete().eq("request_id", marker).select("id");
    check("audit events cannot be deleted", !!del.error || (del.data?.length ?? 0) === 0);

    const forge = await client.from("audit_events").insert({
      actor_id: "00000000-0000-4000-8000-000000000000",
      entity_type: "portfolio",
      event_type: "entity.created",
      request_id: `${marker}-forge`,
    });
    check("cannot forge another actor's audit record", !!forge.error);

    const { error: peError } = await client.from("product_events").insert({
      user_id: userId,
      workspace_id: workspaceId,
      event_name: "portfolio.created",
      request_id: marker,
      properties: { marker },
    });
    check("tenant user can append a product event", !peError, peError?.message ?? "");

    const peUpdate = await client
      .from("product_events")
      .update({ event_name: "tampered" })
      .eq("request_id", marker)
      .select("id");
    check(
      "product events are immutable (no update)",
      !!peUpdate.error || (peUpdate.data?.length ?? 0) === 0,
    );

    const peDelete = await client
      .from("product_events")
      .delete()
      .eq("request_id", marker)
      .select("id");
    check(
      "product events cannot be deleted",
      !!peDelete.error || (peDelete.data?.length ?? 0) === 0,
    );

    const peForge = await client.from("product_events").insert({
      user_id: "00000000-0000-4000-8000-000000000000",
      event_name: "portfolio.created",
    });
    check("cannot forge another user's product event", !!peForge.error);

    const { data: funnel, error: funnelError } = await client
      .from("activation_funnel_daily" as never)
      .select("day, workspace_id, event_name, event_count, user_count");
    const row = (funnel ?? []).find((r: any) => r.event_name === "portfolio.created");
    check(
      "activation events countable by day + workspace",
      !funnelError && !!row && Number((row as any).event_count) >= 1,
      funnelError?.message ?? "",
    );
  } finally {
    await admin.from("product_events").delete().eq("request_id", marker);
    await admin.from("audit_events").delete().eq("request_id", marker);
    await admin.from("audit_events").delete().eq("request_id", `${marker}-forge`);
    await client.auth.signOut();
  }
}

main()
  .then(() => {
    if (failures > 0) {
      console.error(`\n❌ Audit immutability failed (${failures}).`);
      process.exit(1);
    }
    console.log("\n✅ Audit immutability & activation counting passed.");
  })
  .catch((error) => {
    console.error("\n❌ Audit immutability crashed:", error.message);
    process.exit(1);
  });
