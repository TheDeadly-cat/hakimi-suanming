import { describe, expect, it } from "vitest";
import {
  RELEASE_CONTROLLER_TAKEOVER_WRITE_FENCE_KIND,
  ReleaseControllerTakeoverWriteLatch
} from "./release-controller-takeover-write-fence";

describe("release controller takeover write latch", () => {
  it("exposes a frozen exact-shape facade backed by a one-way closure", () => {
    const latch = new ReleaseControllerTakeoverWriteLatch();

    expect(Object.keys(latch.facade).sort()).toEqual(["kind", "locked"]);
    expect(latch.facade.kind).toBe(RELEASE_CONTROLLER_TAKEOVER_WRITE_FENCE_KIND);
    expect(latch.facade.locked).toBe(false);
    expect(Object.isFrozen(latch.facade)).toBe(true);
    expect(Reflect.set(latch.facade, "locked", false)).toBe(false);

    expect(latch.latch("pre_activation_freeze")).toBe(true);
    expect(latch.facade.locked).toBe(true);
    expect(latch.reason).toBe("pre_activation_freeze");
    expect(Reflect.set(latch.facade, "locked", false)).toBe(false);
    expect(latch.facade.locked).toBe(true);
  });

  it("keeps the first boundary reason and cannot be reopened by a later controller event", () => {
    const latch = new ReleaseControllerTakeoverWriteLatch();

    expect(latch.latch("controller_changed")).toBe(true);
    expect(latch.latch("pre_activation_freeze")).toBe(false);
    expect(latch.locked).toBe(true);
    expect(latch.reason).toBe("controller_changed");
  });
});
