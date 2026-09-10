import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
// Recompute the three existing synthetic cases and nine existing threshold inputs.
// This standalone review command writes only to a fresh temporary directory.
const root=path.resolve(import.meta.dirname,'..');
assert.equal(process.argv.length,2,'This command takes no parameters or rule overrides.');
const temporaryParent=fs.realpathSync.native(os.tmpdir());
const relativeTemporaryParent=path.relative(root,temporaryParent);
assert.ok(relativeTemporaryParent==='..'||relativeTemporaryParent.startsWith('..'+path.sep)||path.isAbsolute(relativeTemporaryParent),'Review output must remain outside the source repository.');
const qa=fs.mkdtempSync(path.join(temporaryParent,'hakimi-bazi-strength-review-'));
const require=createRequire(path.join(root,'package.json'));
const {parse}=require('@babel/parser');
const esbuild=require('esbuild');
const hash=b=>createHash('sha256').update(b).digest('hex');
const save=(name,value)=>fs.writeFileSync(path.join(qa,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const expectedVersion=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8')).packages['node_modules/esbuild'].version;
assert.equal(esbuild.version,expectedVersion);
const files=['packages/bazi-interpretation/src/index.test.ts','packages/bazi-core/src/index.test.ts','packages/bazi-interpretation/src/strength-policy.test.ts'];
const sources=files.map(file=>({path:file,text:fs.readFileSync(path.join(root,file),'utf8')}));
function topLevel(source,name){const body=parse(source.text,{sourceType:'module',plugins:['typescript']}).program.body;const found=body.filter(node=>node.type==='FunctionDeclaration'?node.id?.name===name:node.type==='VariableDeclaration'&&node.declarations.some(d=>d.id.name===name));assert.equal(found.length,1,name);const node=found[0];return{path:source.path,name,startLine:node.loc.start.line,endLine:node.loc.end.line,source:source.text.slice(node.start,node.end)};}
const slices=['pillar','chartFacts','weakFacts','strongFacts'].map(name=>topLevel(sources[0],name));
const demo=topLevel(sources[1],'input');
const thresholdAst=parse(sources[2].text,{sourceType:'module',plugins:['typescript']});
const arrays=[];function visit(node){if(!node||typeof node!=='object')return;if(node.type==='ArrayExpression'&&node.elements.length===9&&node.elements.every(n=>n?.type==='CallExpression'&&n.callee.name==='classifyStrengthBand'&&n.arguments.length===2&&n.arguments.every(a=>a.type==='NumericLiteral')))arrays.push(node);for(const v of Object.values(node))if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);}
visit(thresholdAst);assert.equal(arrays.length,1);const pairs=arrays[0].elements.map(n=>n.arguments.map(a=>a.value));
assert.deepEqual(pairs,[[24,76],[25,75],[42,58],[43,57],[57,43],[58,42],[75,25],[76,24],[0,0]]);
const extraction={sources:sources.map(({path:p,text})=>({path:p,size:Buffer.byteLength(text),sha256:hash(text)})),slices:[...slices,demo].map(({source,...row})=>({...row,sourceSha256:hash(source)})),thresholds:{path:sources[2].path,startLine:arrays[0].loc.start.line,endLine:arrays[0].loc.end.line,pairs},scope:'Only pre-existing synthetic fixture declarations and numeric boundary input array extracted; no test body or arbitrary runtime mutation executed.'};
save('input-extraction.json',extraction);
const entry=[
  `import assert from 'node:assert/strict';`,
  `import fs from 'node:fs';`,
  `import path from 'node:path';`,
  `import {calculateChart} from ${JSON.stringify(path.join(root,'packages/bazi-core/src/index.ts'))};`,
  `import {WORKING_DEFAULT_RULE_PROFILE} from ${JSON.stringify(path.join(root,'packages/rule-profiles/src/index.ts'))};`,
  `import {interpretBaziChart,buildStrengthSensitivityReview} from ${JSON.stringify(path.join(root,'packages/bazi-interpretation/src/index.ts'))};`,
  `import {BAZI_STRENGTH_FACTOR_WEIGHTS,BAZI_STRENGTH_BAND_THRESHOLDS,BAZI_STRENGTH_UNRESOLVED_STRUCTURES,classifyStrengthBand} from ${JSON.stringify(path.join(root,'packages/bazi-interpretation/src/strength-policy.ts'))};`,
  ...slices.map(s=>s.source),demo.source,
  `(async()=>{`,
  `const inputBefore=JSON.stringify(input);const profileBefore=JSON.stringify(WORKING_DEFAULT_RULE_PROFILE);`,
  `const chart=await calculateChart(input,WORKING_DEFAULT_RULE_PROFILE);`,
  `assert.equal(JSON.stringify(input),inputBefore);assert.equal(JSON.stringify(WORKING_DEFAULT_RULE_PROFILE),profileBefore);`,
  `const cases=[{name:'weakFacts',provenance:'packages/bazi-interpretation/src/index.test.ts',facts:weakFacts},{name:'strongFacts',provenance:'packages/bazi-interpretation/src/index.test.ts',facts:strongFacts},{name:'fixedDemoBirthInput',provenance:'packages/bazi-core/src/index.test.ts',facts:chart.facts}];`,
  `const rows=[];for(const sample of cases){for(const includeHour of [true,false]){const before=JSON.stringify(sample.facts);const interpretation=interpretBaziChart(sample.facts,{includeHour});const interpretationBefore=JSON.stringify(interpretation);const review=buildStrengthSensitivityReview(interpretation);assert.equal(JSON.stringify(sample.facts),before);assert.equal(JSON.stringify(interpretation),interpretationBefore);assert.equal(review.scenarios.length,6);for(const key of ['selectedOfficialScenarioId','expertStrengthVerdict','overallGoodBad','result'])assert.equal(review[key],null);assert.ok(review.scenarios.every(s=>s.officialRuleCandidate===false));rows.push({caseName:sample.name,provenance:sample.provenance,includeHour,pillars:Object.fromEntries(Object.entries(sample.facts.pillars).map(([position,pillar])=>[position,pillar.ganZhi])),factors:interpretation.strength.factors,baseline:{supportWeight:interpretation.strength.supportWeight,demandWeight:interpretation.strength.demandWeight,band:interpretation.strength.band},review});}}`,
  `const expected=['very_weak','weak','weak','balanced','balanced','strong','strong','very_strong','undetermined'];`,
  `const thresholds=${JSON.stringify(pairs)}.map(([support,demand],index)=>{const band=classifyStrengthBand(support,demand);assert.equal(band,expected[index]);return{support,demand,ratio:support+demand===0?null:support/(support+demand),band};});`,
  `const byHour=[true,false].map(includeHour=>{const selected=rows.filter(r=>r.includeHour===includeHour);const counts=Object.fromEntries(['stable_across_engineering_scenarios','band_sensitive','direction_sensitive','insufficient'].map(k=>[k,selected.filter(r=>r.review.stability===k).length]));return{includeHour,caseCount:selected.length,counts,nonStableCases:selected.filter(r=>r.review.stability!=='stable_across_engineering_scenarios'&&r.review.stability!=='insufficient').length,denominatorMeaning:'three named pre-existing synthetic engineering cases, not a population sample'};});`,
  `const output={scope:'Local engineering review of existing weights, thresholds and month duplication. No empirical truth, school judgement, reviewer qualification, freeze or release authority.',bindingIds:['binding:policy:weights','binding:policy:thresholds','binding:policy:month-duplication'],parameters:{weights:BAZI_STRENGTH_FACTOR_WEIGHTS,thresholds:BAZI_STRENGTH_BAND_THRESHOLDS},syntheticDemoInput:input,ruleProfile:WORKING_DEFAULT_RULE_PROFILE,caseCount:3,modeCount:2,scenarioRows:36,rows,thresholds,byHour,unresolvedStructures:BAZI_STRENGTH_UNRESOLVED_STRUCTURES,structuralInapplicabilityRate:null,structuralInapplicabilityReason:'The existing API exposes known gaps but does not classify case-specific applicability. Unknown cannot be counted as zero.',humanExpertOpinionsReceived:0,selectedAlternative:null,changedRuntimeParameters:false,inputMutationObserved:false,runtime:{node:process.version,icu:process.versions.icu,tz:process.versions.tz}};`,
  `fs.writeFileSync(path.join(${JSON.stringify(qa)},'recomputed.json'),JSON.stringify(output,null,2)+'\\n',{flag:'wx'});console.log(JSON.stringify({caseCount:3,scenarioRows:36,byHour,thresholdCount:thresholds.length,rows:rows.map(r=>({caseName:r.caseName,includeHour:r.includeHour,stability:r.review.stability,pillars:r.pillars,scenarios:r.review.scenarios.map(s=>({id:s.id,support:s.supportWeight,demand:s.demandWeight,band:s.band,direction:s.broadDirection}))}))}));`,
  `})().catch(error=>{console.error(error);process.exitCode=1});`
].join('\n');
save('entry.ts',entry);
const entryPoint=path.join(qa,'entry.ts'),output=path.join(qa,'recompute.cjs');
const built=await esbuild.build({entryPoints:[entryPoint],outfile:output,absWorkingDir:root,tsconfig:path.join(root,'tsconfig.json'),platform:'node',format:'cjs',target:'node24',bundle:true,metafile:true,write:true,logLevel:'warning'});
save('bundle-metafile.json',built.metafile);
const inputPaths=[...new Set([...Object.keys(built.metafile.inputs).map(p=>path.resolve(root,p)),...files.map(p=>path.join(root,p)),path.join(root,'package-lock.json'),path.join(root,'tsconfig.json'),path.join(root,'tsconfig.base.json'),path.join(root,'scripts/review-bazi-strength-engineering-inputs.mjs')])].sort();
const snapshot=()=>inputPaths.map(p=>{const b=fs.readFileSync(p);return{path:p,size:b.length,sha256:hash(b)}});
const before=snapshot();save('execution-inputs-before.json',before);
const start=performance.now();const executed=spawnSync(process.execPath,[output],{cwd:root,encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:4*1024*1024});const elapsedMs=performance.now()-start;
save('stdout.log',executed.stdout??'');save('stderr.log',executed.stderr??'');
const after=snapshot();save('execution-inputs-after.json',after);assert.deepEqual(after,before);
const summary={qa,exitCode:executed.status,signal:executed.signal,error:executed.error?.message??null,elapsedMs,esbuildVersion:esbuild.version,esbuildLockedVersion:expectedVersion,bundleSha256:hash(fs.readFileSync(output)),dependencyInputCount:before.length,dependencyInputsUnchanged:true,sourceRepositoryEditedByDriver:false,applicationBuildPerformed:false,output:executed.status===0?'recomputed.json':null};save('summary.json',summary);console.log(JSON.stringify(summary));if(executed.status!==0)process.exitCode=1;
