import "server-only";
import { getAnswers, getServeCounts, type Sunday } from "./data";
import { checkLineup, lineupChecklist } from "./lineup";

/** Problems and missing pieces in a Sunday's lineup, as the builder shows them. */
export async function reviewSunday(sunday: Sunday) {
  const answerRows = await getAnswers([sunday.id]);
  const monthCounts = await getServeCounts(sunday.monthId);
  const answers = new Map(answerRows.map((r) => [r.memberId, r.answer]));
  const issues = checkLineup({
    assignments: sunday.people,
    answers,
    monthCounts,
    names: new Map(sunday.people.map((p) => [p.memberId, p.name])),
  });
  const checklist = lineupChecklist({
    songCount: sunday.songs.filter((s) => !s.isBackup).length,
    roles: sunday.people.map((p) => p.role),
  });
  return {
    issues,
    checklist,
    answers,
    monthCounts,
    canPublish: !issues.some((i) => i.level === "error"),
  };
}
