import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  readCategories,
  readCategoryPage,
  readPublicCollection,
  readPublicCollections,
} from "@/lib/public-catalog.server";

export const listCategories = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ type: z.enum(["industry", "capability"]) }).parse(d))
  .handler(async ({ data }) => readCategories(data.type));

export const listAllCategories = createServerFn({ method: "GET" }).handler(async () => ({
  industry: await readCategories("industry"),
  capability: await readCategories("capability"),
}));

export const getCategoryPage = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({ type: z.enum(["industry", "capability"]), slug: z.string().min(1).max(200) })
      .parse(d),
  )
  .handler(async ({ data }) => readCategoryPage(data.type, data.slug));

export const listPublicCollectionPages = createServerFn({ method: "GET" }).handler(async () =>
  readPublicCollections(),
);

export const getPublicCollectionPage = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => readPublicCollection(data.slug));
