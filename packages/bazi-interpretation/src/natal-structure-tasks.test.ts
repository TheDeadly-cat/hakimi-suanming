import { describe, expect, it } from "vitest";
import { LunarUtil } from "lunar-typescript";
import { evaluateNatalStructureTasks } from "./natal-structure-tasks";
import type { StructuralStrengthInputFacts } from "./structural-strength-assessment";

// Explicit four-pillar facts; no claim that these variations are birthdays.
function facts(pillars:[string,string,string,string]):StructuralStrengthInputFacts{
  const positions=["year","month","day","hour"] as const,day=pillars[2][0]!;
  return {pillars:Object.fromEntries(pillars.map((ganZhi,i)=>{
    const stem=ganZhi[0]!,branch=ganZhi[1]!,hiddenStems=[...(LunarUtil.ZHI_HIDE_GAN as Record<string,string[]>)[branch]!];
    return [positions[i],{name:positions[i],label:["年柱","月柱","日柱","时柱"][i],ganZhi,stem,branch,hiddenStems,
      stemTenGod:i===2?"日主":(LunarUtil.SHI_SHEN as Record<string,string>)[day+stem],branchTenGods:hiddenStems.map(s=>(LunarUtil.SHI_SHEN as Record<string,string>)[day+s])}];
  })) as StructuralStrengthInputFacts["pillars"]};
}
const run=(p:[string,string,string,string])=>evaluateNatalStructureTasks({facts:facts(p),includeHour:true});
describe("shared strict natal structure tasks",()=>{
  it("retains one Xin pivot and its two functions, without promoting the hidden month print",()=>{
    const result=run(["乙亥","辛巳","己酉","戊辰"]),task=result.tasks[0]!;
    expect(task.pivotIds).toEqual(["month:visible:辛"]);
    expect(task.functions).toEqual([{operation:"generate",fromId:"day:visible:己",toId:"month:visible:辛"},{operation:"control",fromId:"month:visible:辛",toId:"year:visible:乙"}]);
    expect(task.functions.every(edge=>!edge.fromId.includes("main_hidden")&&!edge.toId.includes("main_hidden"))).toBe(true);
  });
  it("keeps two rootless officials separate from Ren's roots and never calls Ren an exposed Gui",()=>{
    const result=run(["辛亥","壬辰","甲子","辛未"]),task=result.tasks[0]!;
    expect(task.kind).toBe("chen_ren_resource_use");expect(task.pivotIds).toEqual(["month:visible:壬","year:visible:辛","hour:visible:辛"]);
    expect(result.actors.filter(a=>a.tenGod==="正官").every(a=>a.roots.length===0)).toBe(true);
    expect(result.month.mainStem).toBe("戊");expect(result.actors.find(a=>a.stem==="壬")!.roots.map(r=>r.stem)).toEqual(["壬","癸","癸"]);
  });
  it("preserves Geng's support and restriction, excluding food-heavy and Changsheng-root counterexamples",()=>{
    const task=run(["庚戌","戊子","壬戌","甲辰"]).tasks[0]!;expect(task.kind).toBe("protect_shallow_food");
    expect(task.functions).toEqual(expect.arrayContaining([{operation:"generate",fromId:"year:visible:庚",toId:"day:visible:壬"},{operation:"control",fromId:"year:visible:庚",toId:"hour:visible:甲"}]));
    for(const p of [["壬辰","甲辰","丙戌","戊戌"],["辛亥","戊子","壬戌","甲辰"],["丙寅","壬辰","甲子","辛未"]] as [string,string,string,string][])expect(run(p).tasks).toEqual([]);
  });
  it("does not borrow an excluded hour or accept invalid ten-god facts",()=>{
    const f=facts(["庚戌","戊子","壬戌","甲辰"]),original=JSON.stringify(f);
    expect(evaluateNatalStructureTasks({facts:f,includeHour:false}).tasks).toEqual([]);expect(JSON.stringify(f)).toBe(original);
    f.pillars.month.stemTenGod="正印";expect(()=>evaluateNatalStructureTasks({facts:f,includeHour:true})).toThrow();
  });
});
