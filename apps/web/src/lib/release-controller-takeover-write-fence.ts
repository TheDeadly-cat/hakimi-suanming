export const RELEASE_CONTROLLER_TAKEOVER_WRITE_FENCE_KIND =
  "release_controller_takeover_write_fence_v1" as const;

export type ReleaseControllerTakeoverWriteFenceFacade = Readonly<{
  kind: typeof RELEASE_CONTROLLER_TAKEOVER_WRITE_FENCE_KIND;
  locked: boolean;
}>;

export type ReleaseControllerTakeoverWriteFenceReason =
  | "controller_changed"
  | "pre_activation_freeze";

/**
 * Page-generation latch. There is intentionally no unlock operation: once an
 * old document participates in, or observes, a controller takeover, only a
 * complete navigation may create a fresh writable page generation.
 */
export class ReleaseControllerTakeoverWriteLatch {
  readonly facade: ReleaseControllerTakeoverWriteFenceFacade;
  #locked = false;
  #reason: ReleaseControllerTakeoverWriteFenceReason | null = null;

  constructor() {
    const owner = this;
    this.facade = Object.freeze({
      kind: RELEASE_CONTROLLER_TAKEOVER_WRITE_FENCE_KIND,
      get locked() {
        return owner.#locked;
      }
    });
  }

  latch(reason: ReleaseControllerTakeoverWriteFenceReason): boolean {
    const changed = !this.#locked;
    this.#locked = true;
    this.#reason ??= reason;
    return changed;
  }

  get locked(): boolean {
    return this.#locked;
  }

  get reason(): ReleaseControllerTakeoverWriteFenceReason | null {
    return this.#reason;
  }
}
