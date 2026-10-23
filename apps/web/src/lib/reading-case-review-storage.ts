import { researchNoteRecordSchema, type ResearchNoteRecord } from "@hakimi/contracts";
import { researchRepository, type CreateResearchNoteInput } from "@hakimi/storage";
import { acquireResearchJournalMutation, isCurrentResearchJournalMutation, lockResearchJournalMutationUnknown,
  releaseResearchJournalMutation } from "../components/research-journal-mutation-coordinator";
import { safeVisibleErrorMessage } from "./visible-text";
import { buildReadingCaseReviewEntry, caseReviewNoteReference, readReadingCaseReviewThread, resolveReadingCaseReviewTarget,
  sameCaseReviewReference, LOCAL_READING_CASE_REVIEW_TAG, type CaseReviewReference, type ReadingCaseReviewDraft,
  type ReadingCaseReviewTarget } from "./reading-case-review";

export interface ReadingCaseReviewRepository {
  listResearchNotesByCase(caseId: string, options: { includeArchived: boolean }): Promise<ResearchNoteRecord[]>;
  createResearchNote(input: CreateResearchNoteInput): Promise<ResearchNoteRecord>;
}
export interface AppendReadingCaseReviewInput {
  target: ReadingCaseReviewTarget;
  expectedLatest: CaseReviewReference | null;
  draft: ReadingCaseReviewDraft;
}
/** Append through the existing journal write boundary. No record is updated,
 * and an unknown write outcome cannot be retried as another append. */
export async function appendReadingCaseReview(input: AppendReadingCaseReviewInput,
  repository: ReadingCaseReviewRepository = researchRepository): Promise<ResearchNoteRecord> {
  const captured=structuredClone(input),caseId=captured.target.sourceSnapshot.caseId;
  const operation=acquireResearchJournalMutation("note-save",caseId);
  if(!operation)throw new Error("另一条记录正在保存或等待核对，请先到研究日志确认。");
  let callStarted=false,returnedId:string|null=null;
  try{
    const records=await repository.listResearchNotesByCase(caseId,{includeArchived:true});
    const report=records.find(record=>record.id===captured.target.reportRef.noteId);
    if(!report||report.lifecycle!=="active"||!sameCaseReviewReference(await caseReviewNoteReference(report),captured.target.reportRef))
      throw new Error("原报告已变化、归档或缺失，请重新选择已保存的报告；草稿仍保留。");
    const target=await resolveReadingCaseReviewTarget(report,captured.target.conclusion.stableId);
    if(JSON.stringify(target)!==JSON.stringify(captured.target))throw new Error("原结论或当时信息已变化，请重新选择；草稿仍保留。");
    const thread=await readReadingCaseReviewThread(target,records);
    if(!thread.canAppend||!sameCaseReviewReference(thread.latest?.ref??null,captured.expectedLatest))
      throw new Error("复盘已有变化或关联待核对，请重新读取后接续；草稿仍保留。");
    const body=await buildReadingCaseReviewEntry(target,thread,captured.draft,records);
    if(!isCurrentResearchJournalMutation(operation))throw new Error("当前记录操作已变化，未执行写入。");
    callStarted=true;
    const raw=await repository.createResearchNote({caseId,anchor:{kind:"revision",revisionId:target.sourceSnapshot.revisionId},
      body,tags:[LOCAL_READING_CASE_REVIEW_TAG],sourceRefs:[],lifecycle:"active"});
    returnedId=raw?.id??null;
    const saved=researchNoteRecordSchema.parse(raw);
    if(saved.caseId!==caseId||saved.anchor.kind!=="revision"||saved.anchor.revisionId!==target.sourceSnapshot.revisionId
      ||saved.body!==body||saved.editVersion!==1||saved.createdAt!==saved.updatedAt||saved.createdAt<target.reportSavedAt
      ||(thread.latest&&saved.createdAt<thread.latest.record.createdAt)||saved.lifecycle!=="active"||!saved.tags.includes(LOCAL_READING_CASE_REVIEW_TAG))
      throw new Error("保存响应与本次复盘不一致。");
    return saved;
  }catch(reason){
    if(callStarted){
      lockResearchJournalMutationUnknown(operation,{targetKind:"research_note",targetId:returnedId,action:"追加具体结论复盘",
        expectedState:"原报告与此前复盘保留，新记录追加",draftIdentity:captured.target.conclusion.stableId},
        safeVisibleErrorMessage(reason,"保存结果尚未确认。"),returnedId?"returned_unreconciled":"call_unknown");
      throw new Error("保存结果尚未确认，已停止重复写入。请到研究日志核对，草稿仍保留。");
    }
    throw reason;
  }finally{releaseResearchJournalMutation(operation);}
}
