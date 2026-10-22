import { LunarUtil } from "lunar-typescript";
import { canonicalizeStrengthTenGod, strengthTenGodGroup } from "./strength-policy";
import { strengthElementForStem, type PillarPosition } from "./strength-assessment-core";
import type { StructuralStrengthInputFacts } from "./structural-strength-assessment";

export const NATAL_STRUCTURE_TASKS_VERSION = "hakimi.natal-structure-tasks/0.1.0" as const;
export type NatalStructureTaskKind = "resource_food_controls_killing" | "chen_ren_resource_use" | "protect_shallow_food";
export interface NatalTaskRoot { id:string; position:PillarPosition; branch:string; stem:string; layer:"main"|"other" }
export interface NatalTaskActor {
  id:string; position:PillarPosition; stem:string; tenGod:string;
  visibility:"visible"|"main_hidden"|"other_hidden"; roots:NatalTaskRoot[];
}
export interface NatalStructureTask {
  id:NatalStructureTaskKind; kind:NatalStructureTaskKind; pivotIds:string[];
  functions:{operation:"generate"|"control";fromId:string;toId:string}[];
  sourceIds:string[];
}
export interface NatalStructureTasks {
  version:typeof NATAL_STRUCTURE_TASKS_VERSION; includeHour:boolean;
  month:{branch:string;mainStem:string;mainTenGod:string}; actors:NatalTaskActor[]; tasks:NatalStructureTask[];
}
const POSITIONS=["year","month","day","hour"] as const;
const ELEMENTS=["wood","fire","earth","metal","water"];
const fail=(message:string):never=>{throw new Error(`本命作用任务：${message}`);};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);

/** Strict natal predicates shared by explanation and transit consumers.
 * No transit may enter these facts; roots are positions, never a strength score. */
export function evaluateNatalStructureTasks({facts,includeHour}:{facts:StructuralStrengthInputFacts;includeHour:boolean}):NatalStructureTasks{
  const positions=POSITIONS.filter(position=>includeHour||position!=="hour");
  if(!facts?.pillars?.day||!facts.pillars.month)return fail("缺少日柱或月柱。");
  const day=facts.pillars.day.stem;
  for(const position of positions){const p=facts.pillars[position];
    if(!p)return fail("缺少所选柱。");
    const hidden=(LunarUtil.ZHI_HIDE_GAN as Record<string,string[]>)[p.branch];
    if(p.name!==position||p.ganZhi!==p.stem+p.branch||LunarUtil.getJiaZiIndex(p.ganZhi)<0||!hidden||!same(hidden,p.hiddenStems)
      ||!same(p.branchTenGods.map(canonicalizeStrengthTenGod),hidden.map(stem=>canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string,string>)[day+stem]!)))
      ||(position==="day"?p.stemTenGod!=="日主":canonicalizeStrengthTenGod(p.stemTenGod)!==canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string,string>)[day+p.stem]!)))return fail("所选柱透藏或十神不一致。");
  }
  const rootsFor=(stem:string):NatalTaskRoot[]=>positions.flatMap(position=>facts.pillars[position]!.hiddenStems.flatMap((hidden,index)=>
    strengthElementForStem(hidden)===strengthElementForStem(stem)?[{id:`${position}:${facts.pillars[position]!.branch}:${hidden}`,position,branch:facts.pillars[position]!.branch,stem:hidden,layer:index===0?"main" as const:"other" as const}]:[]));
  const actor=(position:PillarPosition,stem=facts.pillars[position]!.stem,visibility:NatalTaskActor["visibility"]="visible"):NatalTaskActor=>({id:`${position}:${visibility}:${stem}`,position,stem,visibility,
    tenGod:position==="day"&&visibility==="visible"?"日主":canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string,string>)[day+stem]!),roots:rootsFor(stem)});
  const dayActor=actor("day"),visible=positions.filter(p=>p!=="day").map(p=>actor(p)),m=facts.pillars.month;
  const month={branch:m.branch,mainStem:m.hiddenStems[0]!,mainTenGod:canonicalizeStrengthTenGod(m.branchTenGods[0]!)};
  const actors=[dayActor,actor("month",month.mainStem,"main_hidden"),...visible];
  const shown=(gods:string[])=>visible.filter(a=>gods.includes(a.tenGod));
  const food=shown(["食神"]),killing=shown(["七杀"]),prints=shown(["正印","偏印"]),wealth=shown(["正财","偏财"]),officials=shown(["正官"]);
  const tasks:NatalStructureTask[]=[];
  const edge=(operation:"generate"|"control",from:NatalTaskActor,to:NatalTaskActor)=>({operation,fromId:from.id,toId:to.id});
  if(strengthTenGodGroup(month.mainTenGod)==="resource"&&food.length&&killing.length)tasks.push({id:"resource_food_controls_killing",kind:"resource_food_controls_killing",pivotIds:food.map(a=>a.id),
    functions:food.flatMap(f=>[edge("generate",dayActor,f),...killing.map(k=>edge("control",f,k))]),sourceIds:["natal-zq-resource-output-killing-task"]});
  const ren=prints.filter(a=>a.stem==="壬");
  if(day==="甲"&&month.branch==="辰"&&ren.length&&!positions.some(p=>facts.pillars[p]!.branch==="戌")&&!visible.some(a=>a.stem==="丙")&&!wealth.length)tasks.push({id:"chen_ren_resource_use",kind:"chen_ren_resource_use",pivotIds:[...ren,...officials].map(a=>a.id),
    functions:ren.flatMap(r=>[...officials.map(o=>edge("generate",o,r)),edge("generate",r,dayActor)]),sourceIds:["natal-zq-mixed-month-resource"]});
  const residual=new Set(["辰:乙","未:丁","戌:辛","丑:癸"]);
  const controlsFood=prints.filter(p=>food.some(f=>(ELEMENTS.indexOf(strengthElementForStem(p.stem))+2)%5===ELEMENTS.indexOf(strengthElementForStem(f.stem))));
  if(food.length===1&&food[0]!.roots.length>0&&food[0]!.roots.every(root=>root.layer==="other"&&residual.has(`${root.branch}:${root.stem}`))
    &&killing.length===1&&killing[0]!.roots.some(root=>root.layer==="main")&&controlsFood.length&&dayActor.roots.some(root=>root.layer==="main")&&!officials.length&&!wealth.length){
    tasks.push({id:"protect_shallow_food",kind:"protect_shallow_food",pivotIds:[food[0]!.id],functions:[edge("control",food[0]!,killing[0]!),...controlsFood.flatMap(p=>[edge("generate",p,dayActor),edge("control",p,food[0]!)])],sourceIds:["natal-zq-food-killing-load-task"]});
  }
  return {version:NATAL_STRUCTURE_TASKS_VERSION,includeHour,month,actors,tasks};
}
