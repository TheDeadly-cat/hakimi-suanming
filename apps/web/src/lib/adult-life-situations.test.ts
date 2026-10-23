import { describe,it,expect } from "vitest";
import { buildLocalReadingAgeContext } from "./local-reading-age-context";
import { buildAdultLifeSituations, type AdultSituationMechanism } from "./adult-life-situations";
const age=buildLocalReadingAgeContext("1995-05-18T00:26:00Z","2032-02-04T00:00:00Z","2033-02-04T00:00:00Z");
const gods=["比肩","劫财","正官","七杀","正印","偏印","食神","伤官","正财","偏财"];
describe("conditional adult situations shared by annual and monthly prose",()=>{
  it("covers all ten actual roles and both domains with only two or three explicit settings",()=>{
    for(const god of gods)for(const domain of ["career","wealth"]as const)for(const effect of ["assists","obstructs","mixed","neutral","unresolved"]as const){
      const input={domain,god,effect,age,appliedWork:null},before=JSON.stringify(input),value=buildAdultLifeSituations(input)!;
      expect(value.title).not.toContain("的实际用途的实际用途");
      expect(value.examples.length).toBeGreaterThanOrEqual(2);expect(value.examples.length).toBeLessThanOrEqual(3);
      expect(value.examples.every(line=>/^若(?:在职|正在求职或进修|有自营业务或实际合作)，/u.test(line))).toBe(true);
      expect(value.lead).not.toContain("现实背景未填写");
      expect(value.lead).not.toMatch(/怎样|是否|能否|如何|哪些|多少|要考虑/u);
      expect(value.examples.join()).not.toMatch(/是可对照的情境|可用的配合在于|容易受牵制的是/u);
      expect(value.applicability.join()).toContain("只对照自己实际已有的身份和事项");
      if(effect==="neutral"||effect==="unresolved")expect(value.examples.join()).not.toMatch(/可用的配合在于|较有条件|较能|容易受牵制|升职|录用|加薪/u);
      if(effect==="mixed")expect(value.examples.every(line=>line.includes("；同时，"))).toBe(true);
      expect(JSON.stringify(input)).toBe(before);
    }
    const examples=gods.map(god=>buildAdultLifeSituations({domain:"career",god,effect:"neutral",age,appliedWork:null})!.examples.join());
    expect(new Set(examples).size).toBe(10);
  });
  it("keeps already supplied identities, childhood, unknown age and mixed-age intervals with their original adapter",()=>{
    for(const appliedWork of ["employed","self_employed","seeking_work","student","caregiving","retired"]as const)expect(buildAdultLifeSituations({domain:"career",god:"正印",effect:"assists",age,appliedWork})).toBeNull();
    for(const birth of [null,"2019-12-22T03:23:00Z","2014-12-22T03:23:00Z"]){const younger=buildLocalReadingAgeContext(birth,"2032-02-04T00:00:00Z","2033-02-04T00:00:00Z");expect(buildAdultLifeSituations({domain:"career",god:"偏财",effect:"assists",age:younger,appliedWork:null})).toBeNull();}
  });
  it("uses mechanism-specific contexts for wealth moderating print, protecting needed support, and exact obstructions",()=>{
    const mechanisms:AdultSituationMechanism[]=["resource_moderation","resource_protection","authority_resource","output_to_wealth","output_overload","authority_conflict","resource_tie","wealth_tie","output_tie","general_constraint"];
    for(const mechanism of mechanisms){
      const result=buildAdultLifeSituations({domain:"career",god:"正财",effect:"obstructs",age,appliedWork:null,mechanism})!;
      const neutral=buildAdultLifeSituations({domain:"career",god:"正财",effect:"neutral",age,appliedWork:null,mechanism})!;
      expect(result.examples).not.toEqual(neutral.examples);
      expect(result.examples.every(line=>line.includes("时，"))).toBe(true);
      for(const domain of ["career","wealth"]as const){
        expect(buildAdultLifeSituations({domain,god:"正财",effect:"neutral",age,appliedWork:null,mechanism})!.lead)
          .not.toMatch(/怎样|是否|能否|如何|哪些|多少|要考虑/u);
      }
    }
    const moderation=buildAdultLifeSituations({domain:"wealth",god:"偏财",effect:"assists",age,appliedWork:null,mechanism:"resource_moderation"})!;
    expect(moderation.examples.join()).toContain("用途重复的投入");expect(moderation.examples.join()).toContain("仍然保留");expect(moderation.examples.join()).not.toMatch(/回款|加薪|结算|待遇/u);
    const protection=buildAdultLifeSituations({domain:"wealth",god:"正财",effect:"obstructs",age,appliedWork:null,mechanism:"resource_protection"})!;
    expect(protection.examples.join()).toContain("必要的学习、指导条件");expect(protection.examples.join()).not.toContain("全部支持撤掉");
    const overload=buildAdultLifeSituations({domain:"career",god:"食神",effect:"obstructs",age,appliedWork:null,mechanism:"output_overload"})!;
    expect(overload.examples.join()).toContain("继续做或说的部分超过当前支持");expect(overload.examples.join()).not.toContain("继续补资料");
    const authority=buildAdultLifeSituations({domain:"career",god:"食神",effect:"obstructs",age,appliedWork:null,mechanism:"authority_conflict"})!;
    expect(authority.examples.join()).toContain("与已有标准对不上");
    const tiedPrint=buildAdultLifeSituations({domain:"career",god:"食神",effect:"obstructs",age,appliedWork:null,mechanism:"resource_tie"})!;
    expect(tiedPrint.examples.join()).toContain("原有指导或帮助");expect(tiedPrint.examples.join()).not.toContain("与已有标准对不上");
  });
  it("keeps neutral themes undecided once in applicability and preserves different wealth and print mechanisms",()=>{
    const make=(god:string,effect:"assists"|"neutral"|"unresolved"="assists")=>buildAdultLifeSituations({domain:"career",god,effect,age,appliedWork:null})!;
    const regularWealth=make("正财"),opportunityWealth=make("偏财"),regularPrint=make("正印"),specialPrint=make("偏印");
    expect(regularWealth.examples.join()).toContain("已交付服务的验收、账款核对或续用约定");
    expect(regularWealth.examples.join()).toContain("已有成果和原合同的确认环节较能接上");
    expect(opportunityWealth.examples.join()).toContain("新客户询问、短期合作或渠道试用");
    expect(opportunityWealth.examples.join()).toContain("有限试用有助于分清真实需求");
    expect(regularPrint.examples.join()).toContain("一条解释或示范补上原来不会做的一步");
    expect(specialPrint.examples.join()).toContain("局部的新办法补上旧流程的缺口");
    expect(new Set([regularWealth,opportunityWealth,regularPrint,specialPrint].map(value=>value.examples.join())).size).toBe(4);
    expect(regularWealth.lead).toContain("已有成果的确认");
    expect(opportunityWealth.lead).toContain("新需求、短期合作");
    expect(regularPrint.lead).toContain("学习指导和必要资料");
    expect(specialPrint.lead).toContain("专项办法与旧方法的取舍");
    for(const effect of ["neutral","unresolved"]as const){
      const neutral=make("正财",effect);
      expect(neutral.examples.join()).not.toMatch(/较能|能够|有助于|未接上|被推迟|顺利|吃力/u);
      expect(neutral.applicability.filter(line=>line.includes("不单独判断"))).toHaveLength(1);
      expect(neutral.examples.join()).toContain("已完成工作的确认、报销或既定待遇约定");
    }
  });
});
