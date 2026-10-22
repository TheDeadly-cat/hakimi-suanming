import type { LegacyAnnualReadingInput, LegacyAnnualYearReadingInput } from "./legacy-annual-reading-profile";
import * as oldAnnual from "./legacy-outlook-v09/local-annual-outlook";
import * as oldDetailed from "./legacy-outlook-v09/local-detailed-outlook";
import * as oldDomain from "./legacy-outlook-v09/local-annual-domain-reading";
import * as oldMonthly from "./legacy-outlook-v09/local-monthly-domain-reading";
import * as oldLifeStory from "./legacy-outlook-v09/local-life-stage-story";
import * as currentAnnual from "./local-annual-outlook";
import * as currentDetailed from "./local-detailed-outlook";
import * as currentDomain from "./local-annual-domain-reading";
import * as currentMonthly from "./local-monthly-domain-reading";
import * as currentLifeStory from "./local-life-stage-story";
import { buildContextualAnnualReadings } from "./local-contextual-reading";

/** Private proof cache. Historical objects are never accepted from callers or
 * serialized as authority. Two complete reading windows are the maximum. */
const prepared: { key: string; current: LegacyAnnualReadingInput; old: LegacyAnnualReadingInput }[] = [];
const pending = new Map<string, Promise<void>>();
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const fail = (message: string): never => { throw new Error(`旧版岁运准备：${message}`); };
const identity = (input: unknown) => stable({ profile: "outlook-0.9/annual-0.8/detailed-0.5/1", input });
const same = (a: unknown, b: unknown) => stable(a) === stable(b);

function annualContext(input: LegacyAnnualReadingInput, domains: NonNullable<LegacyAnnualReadingInput["annualDomains"]>) {
  if (!input.contextual) return input.contextual;
  const original = input.contextual;
  return { ...structuredClone(original), readings: [
    ...original.readings.filter((item) => item.scope.kind !== "annual").map((item) => structuredClone(item)),
    ...domains.years.flatMap((reading) => buildContextualAnnualReadings({ revision: input.revision, assessment: input.assessment,
      reading, context: original.contextSource.document.context }))
  ] };
}

async function rebuild(input: LegacyAnnualReadingInput): Promise<LegacyAnnualReadingInput> {
  const { revision, assessment } = input;
  const old: LegacyAnnualReadingInput = { revision: structuredClone(revision), assessment: structuredClone(assessment),
    contextual: structuredClone(input.contextual), selectedDecadeId: input.selectedDecadeId };
  if (!!input.annual !== !!input.annualDomains) fail("年度重放需要成对的原窗口与领域输入。");
  if (input.annual && input.annualDomains) {
  const start = input.annual.startYear, end = input.annual.endYear;
  let current = await currentAnnual.buildLocalAnnualOutlookRange(revision, assessment, start, end);
  let originalApi = false;
  if (!same(current, input.annual) && end === start + 9) {
    current = await currentAnnual.buildLocalAnnualOutlook(revision, assessment, start);
    originalApi = true;
  }
  if (!same(current, input.annual)) fail("当前年度窗口不是同修订的完整计算输出。");
  const annual = originalApi ? await oldAnnual.buildLocalAnnualOutlook(revision, assessment, start)
    : await oldAnnual.buildLocalAnnualOutlookRange(revision, assessment, start, end);
  const domainCollection = (value: typeof annual, old: boolean) => ({ version: currentDomain.ANNUAL_DOMAIN_READING_VERSION,
    revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: assessment.sourceBinding.includeHour,
    startYear: start, endYear: end, years: value.years.map((year) => (old ? oldDomain.buildAnnualDomainReading : currentDomain.buildAnnualDomainReading)({ revision, assessment, year })) });
  const currentDomains = domainCollection(current, false);
  if (!same(currentDomains, input.annualDomains)) fail("当前年度领域与原窗口不同。");
  const annualDomains = domainCollection(annual, true);
  if (input.contextual && !same(annualContext(input, currentDomains), input.contextual)) fail("当前背景正文不是相同年度领域的完整输出。");
  const contextual = annualContext(input, annualDomains);
  Object.assign(old, { annual, annualDomains, contextual });
  }
  if (input.life) {
    const year = new Date(Date.parse(input.life.referenceInstant) + 8 * 3600000).getUTCFullYear();
    const explicit = { atInstant: input.life.referenceInstant };
    let currentLife = await currentDetailed.buildLocalLifeOutlook(revision, assessment, year, explicit);
    let options: typeof explicit | undefined = explicit;
    if (!same(currentLife, input.life)) { currentLife = await currentDetailed.buildLocalLifeOutlook(revision, assessment, year); options = undefined; }
    if (!same(currentLife, input.life)) fail("当前人生大运或定位时刻不是原计算输出。");
    old.life = await oldDetailed.buildLocalLifeOutlook(revision, assessment, year, options);
    if (input.lifeStageStory) {
      if (!same(currentLifeStory.buildLifeStageStory({ revision, assessment, life: currentLife }), input.lifeStageStory)) fail("当前大运主线来源不一致。");
      old.lifeStageStory = oldLifeStory.buildLifeStageStory({ revision, assessment, life: old.life });
    }
  } else if (input.lifeStageStory || input.selectedDecadeId) fail("阶段重放缺少实际大运输入。");
  if (input.monthly) {
    const monthly = await currentDetailed.buildLocalMonthlyOutlook(revision, assessment, input.monthly.year);
    if (!same(monthly, input.monthly)) fail("当前月度窗口不是同修订完整输出。");
    old.monthly = await oldDetailed.buildLocalMonthlyOutlook(revision, assessment, monthly.year);
    if (input.monthlyDomains) {
      if (!same(currentMonthly.buildMonthlyDomainReadings({ revision, assessment, monthly, contextual: input.contextual }), input.monthlyDomains)) fail("当前月度领域或背景不同。");
      old.monthlyDomains = oldMonthly.buildMonthlyDomainReadings({ revision, assessment, monthly: old.monthly, contextual: old.contextual });
    }
  } else if (input.monthlyDomains) fail("月度重放缺少实际十二月输入。");
  return old;
}

export async function prepareLegacyOutlook(input: LegacyAnnualReadingInput): Promise<void> {
  const captured = structuredClone(input), key = identity(captured);
  if (prepared.some((item) => item.key === key)) return;
  const running = pending.get(key);
  if (running) return running;
  // No hidden unbounded work queue; a caller can retry after another preparation.
  if (pending.size >= 2) fail("其他历史阅读正在核对，请完成后重试。");
  const work = rebuild(captured).then((old) => {
    prepared.push({ key, current: captured, old });
    while (prepared.length > 2) prepared.shift();
  }).finally(() => pending.delete(key));
  pending.set(key, work);
  return work;
}

export function preparedLegacyOutlook(input: LegacyAnnualReadingInput): LegacyAnnualReadingInput {
  if (!input.annual && !input.annualDomains && !input.life && !input.lifeStageStory && !input.monthly && !input.monthlyDomains && !input.selectedDecadeId && !input.contextual) return structuredClone(input);
  const value = prepared.find((item) => item.key === identity(input));
  if (!value) return fail("尚未核对这个完整来源，请先完成历史个人修订准备。");
  return structuredClone(value.old);
}

export function preparedLegacyYear(input: LegacyAnnualYearReadingInput): LegacyAnnualYearReadingInput {
  for (const proof of prepared) {
    const currentYear = proof.current.annual?.years.find((item) => item.year === input.year.year);
    const currentDomains = proof.current.annualDomains?.years.find((item) => item.year === input.year.year);
    const candidate = { revision: proof.current.revision, assessment: proof.current.assessment, year: currentYear, domains: currentDomains,
      contextual: proof.current.contextual, monthly: input.monthly ? proof.current.monthly : undefined,
      monthlyDomains: input.monthlyDomains ? proof.current.monthlyDomains : undefined };
    if (!same(candidate, { revision: input.revision, assessment: input.assessment, year: input.year, domains: input.domains,
      contextual: input.contextual, monthly: input.monthly, monthlyDomains: input.monthlyDomains })) continue;
    const year = proof.old.annual?.years.find((item) => item.year === input.year.year);
    const domains = proof.old.annualDomains?.years.find((item) => item.year === input.year.year);
    if (year && domains) return structuredClone({ revision: proof.old.revision, assessment: proof.old.assessment, year, domains,
      contextual: proof.old.contextual, monthly: input.monthly ? proof.old.monthly : undefined,
      monthlyDomains: input.monthlyDomains ? proof.old.monthlyDomains : undefined });
  }
  return fail("本年或其背景没有相同完整来源的历史核对记录。");
}
