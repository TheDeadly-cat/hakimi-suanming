import { z } from "zod";

export const WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION = "0.1.0-draft.1" as const;
export const WESTERN_ASTROLOGY_SYSTEM_ID = "western-astrology" as const;
export const WESTERN_ASTROLOGY_DRAFT_MVP_RANGE = Object.freeze({
  from: "1900-01-01",
  to: "2100-12-31"
} as const);

const stableIdSchema = z.string().regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/).max(180);
const ianaTimeZoneSchema = z.string().regex(/^(?:UTC|[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)+)$/).max(120);
const gregorianDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidGregorianDate, "日期必须是有效的公历 YYYY-MM-DD");
const minuteTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const secondTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/);

function isValidGregorianDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= monthLengths[month - 1]!;
}

export const westernBirthInputDraftSchema = z
  .strictObject({
    contractVersion: z.literal(WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION),
    systemId: z.literal(WESTERN_ASTROLOGY_SYSTEM_ID),
    calendar: z.literal("proleptic_gregorian"),
    date: gregorianDateSchema,
    time: z.string(),
    timePrecision: z.enum(["exact_minute", "exact_second"]),
    timeZone: ianaTimeZoneSchema,
    dstDisambiguation: z.enum(["reject", "earlier", "later"]),
    location: z.strictObject({
      label: z.string().trim().max(120),
      latitude: z.number().finite().min(-90).max(90),
      longitude: z.number().finite().min(-180).max(180),
      elevationMeters: z.number().finite().min(-500).max(10_000).nullable(),
      precision: z.literal("coordinates")
    }),
    birthSourceRef: stableIdSchema,
    sourceNote: z.string().trim().max(1_000)
  })
  .superRefine((value, context) => {
    const validTime = value.timePrecision === "exact_minute"
      ? minuteTimeSchema.safeParse(value.time).success
      : secondTimeSchema.safeParse(value.time).success;
    if (!validTime) {
      context.addIssue({ code: "custom", path: ["time"], message: "时间格式必须与声明的精度一致" });
    }
    if (value.date < WESTERN_ASTROLOGY_DRAFT_MVP_RANGE.from || value.date > WESTERN_ASTROLOGY_DRAFT_MVP_RANGE.to) {
      context.addIssue({
        code: "custom",
        path: ["date"],
        message: "草案首版只接受现有冻结时区工件可覆盖的 1900-01-01 至 2100-12-31"
      });
    }
  });

export type WesternBirthInputDraft = z.infer<typeof westernBirthInputDraftSchema>;
