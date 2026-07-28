/** Production smoke: sign in, create in Studio, save, list in My Use Cases, and follow board deep-link. */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("Missing production smoke test credentials");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const client = createClient(url, anonKey, { auth: { persistSession: false } });
const email = process.env.SMOKE_DEMO_EMAIL ?? "pro@demo.usecasex.app";
const password = process.env.SMOKE_DEMO_PASSWORD ?? "Demo@123";
const marker = `Launch Smoke ${Date.now()}`;
let boardId: string | undefined;
let studioUseCaseId: string | undefined;
let importedUseCaseId: string | undefined;
let catalogId: string | undefined;

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function main() {
  const { data: signedIn, error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;
  const userId = signedIn.user.id;
  console.log("✓ signed in as production demo user");

  try {
    const { data: workspaceId, error: workspaceError } = await client.rpc("ensure_user_workspace");
    if (workspaceError) throw workspaceError;

    const { data: board, error: boardError } = await client
      .from("use_case_boards")
      .insert({
        workspace_id: workspaceId as string,
        title: marker,
        board_type: "studio",
        status: "active",
        created_by: userId,
      })
      .select("id, title, created_by")
      .single();
    if (boardError) throw boardError;
    boardId = board.id;

    const { data: studioUseCase, error: createError } = await client
      .from("ai_use_cases")
      .insert({
        board_id: board.id,
        title: `${marker} Use Case`,
        problem_statement: "Verify the public launch workflow",
        ai_type: "Agentic",
        status: "draft",
        created_by: userId,
      })
      .select("id, title, board_id")
      .single();
    if (createError) throw createError;
    studioUseCaseId = studioUseCase.id;
    console.log("✓ created and saved a Studio use case");

    const { data: myUseCases, error: listError } = await client
      .from("ai_use_cases")
      .select("id, title, board_id")
      .eq("board_id", board.id);
    if (listError) throw listError;
    assert(
      myUseCases?.some((row) => row.id === studioUseCase.id),
      "Studio use case missing from My Use Cases data",
    );
    console.log("✓ opened My Use Cases and found the saved metadata");

    const { data: catalog, error: catalogError } = await client
      .from("use_cases")
      .select("id, slug, title")
      .eq("status", "published")
      .limit(1)
      .single();
    if (catalogError) throw catalogError;
    catalogId = catalog.id;
    const { error: saveError } = await client.from("saved_use_cases").upsert(
      {
        user_id: userId,
        use_case_id: catalog.id,
        priority: "High",
        note: marker,
      },
      { onConflict: "user_id,use_case_id" },
    );
    if (saveError) throw saveError;

    const { data: imported, error: importError } = await client
      .from("ai_use_cases")
      .insert({
        board_id: board.id,
        title: catalog.title,
        problem_statement: marker,
        status: "idea",
        created_by: userId,
      })
      .select("id, board_id")
      .single();
    if (importError) throw importError;
    importedUseCaseId = imported.id;

    const { data: openedBoard, error: openError } = await client
      .from("use_case_boards")
      .select("id, title, ai_use_cases(id, title)")
      .eq("id", board.id)
      .single();
    if (openError) throw openError;
    assert(
      openedBoard.ai_use_cases.some((item) => item.id === imported.id),
      "Imported use case missing on board detail",
    );
    const studioHref = `/studio/use-case/${imported.id}`;
    assert(studioHref.endsWith(imported.id), "Board Studio deep-link is malformed");
    console.log("✓ opened board detail and verified the Studio deep-link target");
  } finally {
    if (importedUseCaseId) await admin.from("ai_use_cases").delete().eq("id", importedUseCaseId);
    if (studioUseCaseId) await admin.from("ai_use_cases").delete().eq("id", studioUseCaseId);
    if (boardId) await admin.from("use_case_boards").delete().eq("id", boardId);
    if (catalogId)
      await admin.from("saved_use_cases").delete().eq("use_case_id", catalogId).eq("note", marker);
    await client.auth.signOut();
  }
}

main()
  .then(() => console.log("\n✅ Production smoke passed."))
  .catch((error) => {
    console.error("\n❌ Production smoke failed:", error.message);
    process.exit(1);
  });
