import type { ZiweiBirthInputDraft } from "../contract-bridge.ts";
import type { ZiweiBrowserEngineeringArtifactDraft } from "./browser-artifact.ts";

export const ZIWEI_BROWSER_PROBE_PROTOCOL = "hakimi-ziwei-browser-probe/0.2-draft" as const;
export const ZIWEI_BROWSER_PROBE_ADAPTER_ID = "hakimi.ziwei.iztro.browser_probe" as const;

export type BrowserProbeRequest = Readonly<{
  protocolVersion: typeof ZIWEI_BROWSER_PROBE_PROTOCOL;
  requestId: string;
  action: "calculate";
  input: ZiweiBirthInputDraft;
}>;

export type BrowserProbeDisplayStar = Readonly<{
  label: string;
  category: "major" | "minor" | "auxiliary";
  brightnessLabel: string | null;
  transformations: readonly string[];
}>;

export type BrowserProbeDisplayPalace = Readonly<{
  earthlyBranchId: string;
  earthlyBranchLabel: string;
  heavenlyStemLabel: string;
  roleId: string;
  roleLabel: string;
  isBodyPalace: boolean;
  stars: readonly BrowserProbeDisplayStar[];
}>;

export type BrowserProbeDisplayProjection = Readonly<{
  displayPalaces: readonly BrowserProbeDisplayPalace[];
  displaySummary: Readonly<{
    gregorianDate: string;
    lunarDate: string;
    shichen: string;
    sex: string;
    lifePalace: string;
    bodyPalace: string;
    fiveElementBureau: string;
    direction: string;
    ganzhi: string;
  }>;
}>;

export type BrowserProbeSuccessResult = Readonly<{
  artifact: ZiweiBrowserEngineeringArtifactDraft;
}>;

export type BrowserProbeSuccessResponse = Readonly<{
  ok: true;
  protocolVersion: typeof ZIWEI_BROWSER_PROBE_PROTOCOL;
  requestId: string;
  workerInstanceId: string;
  startedAt: string;
  completedAt: string;
  result: BrowserProbeSuccessResult;
}>;

export type BrowserProbeFailureResponse = Readonly<{
  ok: false;
  protocolVersion: typeof ZIWEI_BROWSER_PROBE_PROTOCOL;
  requestId: string | null;
  workerInstanceId: string;
  startedAt: string;
  completedAt: string;
  error: Readonly<{
    code: string;
    message: string;
  }>;
}>;

export type BrowserProbeResponse = BrowserProbeSuccessResponse | BrowserProbeFailureResponse;
