import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheetPath = [
  resolve(process.cwd(), "apps/web/src/components/prepared-file-delivery-dialog.css"),
  resolve(process.cwd(), "src/components/prepared-file-delivery-dialog.css")
].find(existsSync);

if (!stylesheetPath) throw new Error("PreparedFileDeliveryDialog stylesheet was not found");

const stylesheet = readFileSync(stylesheetPath, "utf8");

describe("PreparedFileDeliveryDialog responsive overflow contract", () => {
  it("keeps the dialog vertically scrollable without exposing a horizontal scroll range", () => {
    expect(stylesheet).toMatch(
      /\.prepared-delivery-modal\s+\.prepared-delivery-dialog\s*\{[^}]*overflow-x:\s*hidden;[^}]*overflow-y:\s*auto;/su
    );
  });

  it("does not place the sticky header outside the zero-padding dialog at narrow widths", () => {
    expect(stylesheet).toMatch(
      /\.prepared-delivery-dialog \.prepared-delivery-header\s*\{[^}]*margin:\s*0;/su
    );
    expect(stylesheet).not.toMatch(
      /\.prepared-delivery-dialog \.prepared-delivery-header\s*\{[^}]*margin(?:-inline)?:\s*-/su
    );
  });
});
