import { describe, expectTypeOf, it } from "vitest";
import { api } from "@/api";
import type { CampaignDto, SceneDto } from "@/api";
import type { CampaignId, SceneId } from "./ids";

describe("branded identifiers", () => {
  it("keeps distinct identities while remaining serializable strings", () => {
    expectTypeOf<CampaignId>().toMatchTypeOf<string>();
    expectTypeOf<SceneId>().toMatchTypeOf<string>();
    expectTypeOf<CampaignId>().not.toEqualTypeOf<SceneId>();
    expectTypeOf<CampaignDto["id"]>().toEqualTypeOf<CampaignId>();
    expectTypeOf<SceneDto["id"]>().toEqualTypeOf<SceneId>();
    expectTypeOf(api.renameCampaign).parameter(0).toEqualTypeOf<CampaignId>();
    expectTypeOf(api.renameScene).parameter(0).toEqualTypeOf<SceneId>();
  });
});
