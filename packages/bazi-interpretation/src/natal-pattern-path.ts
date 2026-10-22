import type { PreliminaryPatternFamily } from "./preliminary-assessment";
import type { TenGodGroup } from "./strength-policy";
import type { StructuralStrengthFocus } from "./structural-strength-assessment";
import { NATAL_WEALTH_RESOURCE_TASK_VERSION, type NatalWealthResourceTask } from "./natal-wealth-resource-task";

export const NATAL_PATTERN_PATH_VERSION = "hakimi.natal-pattern-path/0.3.0" as const;
export interface NatalMonthCommandRole {
  position: "month"; kind: "main_hidden"; stem: string; tenGod: "正官" | "七杀" | "伤官";
}
export interface NatalPatternPath {
  id: string; title: string; candidateId: string | null; required: string[][];
  protectedGroups: TenGodGroup[]; monthCommandRole: NatalMonthCommandRole | null;
}
export interface NatalPatternPathInput {
  family: PreliminaryPatternFamily; monthMainStem: string; monthMainTenGod: string;
  visibleTenGods: readonly string[];
  /** Only the validated current structural assessment may supply this focus. */
  workingFocus?: StructuralStrengthFocus;
  /** The caller evaluates this from its validated natal facts, never a transit. */
  wealthResourceTask?: NatalWealthResourceTask;
}
const G = { output: ["食神", "伤官"], wealth: ["正财", "偏财"], resource: ["正印", "偏印"], official: ["正官"], killing: ["七杀"] };

/** Keeps the existing visible-combination precedence. The new fallback uses
 * only the natal month's main qi, not arbitrary hidden gods. It does not add
 * an exposed stem or establish free stem interactions, roots or 成格. */
export function selectNatalPatternPath(input: NatalPatternPathInput): NatalPatternPath {
  const has = (gods: readonly string[]) => input.visibleTenGods.some((god) => gods.includes(god));
  const path = (id: string, title: string, candidateId: string | null, required: string[][], protectedGroups: TenGodGroup[]): NatalPatternPath =>
    ({ id, title, candidateId, required: required.map((group) => [...group]), protectedGroups, monthCommandRole: null });
  const task = input.wealthResourceTask;
  if (task) {
    if (task.version !== NATAL_WEALTH_RESOURCE_TASK_VERSION || task.monthCommand.stem !== input.monthMainStem
      || task.monthCommand.tenGod !== input.monthMainTenGod) throw new Error("财印选径任务与当前月令或版本不一致。");
    const expectedHint = task.task === "official_joint" ? "official-resource" : task.task === "resource_first" ? "hurting-resource"
      : task.task === "wealth_first" ? "hurting-wealth" : null;
    if (task.preferredPathId !== expectedHint || (expectedHint && !task.applicable)) throw new Error("财印任务与主路径提示不一致。");
    if (expectedHint) {
      const official = task.task === "official_joint", god = official ? "正官" : "伤官";
      if (input.family !== (official ? "official" : "output") || input.monthMainTenGod !== god
        || task.monthCommand.family !== (official ? "official" : "hurting") || !has(G.resource) || !has(G.wealth)
        || task.pairs.length !== 1 || !task.pairs[0]!.separatedByPeers) throw new Error("财印任务缺少同月令的实际透财、透印或限定隔护。");
      const selected = official ? path("official-resource", "官格财印分用", "official-resource", [G.official, G.resource, G.wealth], ["authority", "resource"])
        : task.task === "resource_first" ? path("hurting-resource", "伤官财重护印", "hurting-resource", [["伤官"], G.resource, G.wealth], ["resource", "output"])
          : path("hurting-wealth", "伤官印重用财", "output-wealth", [["伤官"], G.wealth, G.resource], ["output", "wealth"]);
      return has([god]) ? selected : { ...selected, monthCommandRole: { position: "month", kind: "main_hidden", stem: input.monthMainStem, tenGod: god } };
    }
  }
  if (input.workingFocus === "wealth_moderates_resource" && input.family === "resource" && has(G.resource) && has(G.wealth))
    return path("resource-wealth", "印旺用财", "resource-wealth", [G.resource, G.wealth], ["wealth"]);
  if (input.family === "peer" && has(G.output) && has(G.wealth)) return path("peer-output-wealth", "禄劫背景的食伤生财", "output-wealth", [G.output, G.wealth], ["output", "wealth"]);
  if (input.family === "wealth" && has(G.output)) return path("wealth-food", "财格背景的食伤生财", "output-wealth", [G.output, G.wealth], ["output", "wealth"]);
  if (input.family === "output" && has(G.wealth)) return input.monthMainTenGod === "食神"
    ? path("food-wealth", "食神生财", "output-wealth", [["食神"], G.wealth], ["output", "wealth"])
    : path("hurting-wealth", "伤官取财", "output-wealth", [["伤官"], G.wealth], ["output", "wealth"]);
  if (input.family === "resource" && has(G.output)) return path("resource-output", "印格背景的食伤泄秀", "resource-output", [G.resource, G.output], ["output"]);
  if (has(G.official) && has(G.resource)) return path("official-resource", "官印承接", "official-resource", [G.official, G.resource], ["authority", "resource"]);
  if (has(G.official) && has(G.wealth)) return path("official-wealth", "财官相生", "wealth-official", [G.official, G.wealth], ["authority", "wealth"]);
  if (has(["食神"]) && has(G.killing)) return path("food-killings", "食神制杀", "food-killing", [["食神"], G.killing], ["output"]);
  if (has(G.killing) && has(G.resource)) return path("killings-resource", "杀印承接", "killing-resource", [G.killing, G.resource], ["resource"]);
  if (has(["伤官"]) && has(G.resource)) return path("hurting-resource", "伤官配印", "hurting-resource", [["伤官"], G.resource], ["resource", "output"]);
  if (input.family === "resource" || (has(["食神"]) && has(["偏印"]))) return path("resource-preservation", "印食取舍", null, [G.resource], ["resource", "output"]);

  let selected: NatalPatternPath | null = null;
  if (input.family === "official" && input.monthMainTenGod === "正官") {
    if (has(G.resource)) selected = path("official-resource", "官印承接", "official-resource", [G.official, G.resource], ["authority", "resource"]);
    else if (has(G.wealth)) selected = path("official-wealth", "财官相生", "wealth-official", [G.official, G.wealth], ["authority", "wealth"]);
  } else if (input.family === "seven_killings" && input.monthMainTenGod === "七杀") {
    if (has(["食神"])) selected = path("food-killings", "食神制杀", "food-killing", [["食神"], G.killing], ["output"]);
    else if (has(G.resource)) selected = path("killings-resource", "杀印承接", "killing-resource", [G.killing, G.resource], ["resource"]);
  }
  if (selected) return { ...selected, monthCommandRole: { position: "month", kind: "main_hidden", stem: input.monthMainStem, tenGod: input.monthMainTenGod as "正官" | "七杀" } };
  return path(`${input.family}-background`, "", null, [], []);
}
