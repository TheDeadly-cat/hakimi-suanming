import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { lazy, Suspense } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PreparedFileDeliveryLoadBoundary } from "./prepared-file-delivery-load-boundary";

describe("PreparedFileDeliveryLoadBoundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps a rejected delivery chunk local, focuses the alert and offers a close path", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onClose = vi.fn();
    const RejectedDeliveryChunk = lazy(() => Promise.reject(
      new Error("delivery_chunk_rejected")
    ) as Promise<{ default: () => null }>);
    render(
      <PreparedFileDeliveryLoadBoundary onClose={onClose}>
        <Suspense fallback={<div role="status">正在载入本机交付确认…</div>}>
          <RejectedDeliveryChunk />
        </Suspense>
      </PreparedFileDeliveryLoadBoundary>
    );

    expect(screen.getByRole("status")).toBeTruthy();
    const alert = await screen.findByRole("alert");
    expect(screen.getByText("本机交付界面已中断。", { exact: false })).toBeTruthy();
    await waitFor(() => expect(alert).toBe(document.activeElement));
    fireEvent.click(screen.getByRole("button", { name: "清除页面会话工件" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
