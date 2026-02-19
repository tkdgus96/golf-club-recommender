import type { QuizAnswers, RecommendationSet } from "../types";

export interface FitterReportPayload {
  createdAt: string;
  title: string;
  answers: QuizAnswers;
  results: RecommendationSet;
}

function recommendationLines(results: RecommendationSet): string[] {
  const rows: Array<[string, typeof results.driver]> = [
    ["Driver", results.driver],
    ["Fairway Wood", results.fairwayWood],
    ["Hybrid", results.hybrid],
    ["Iron Set", results.ironSet],
    ["Wedge", results.wedge],
    ["Putter", results.putter],
  ];

  return rows
    .filter(([, item]) => Boolean(item))
    .map(([label, item]) => {
      const scored = item!;
      return `${label}: ${scored.club.brand} ${scored.club.name} | Score ${scored.score.toFixed(
        1
      )} | Confidence ${Math.round(scored.confidence.score * 100)}% | $${Number(
        scored.club.price
      ).toFixed(2)}`;
    });
}

export function buildFitterReportText(payload: FitterReportPayload): string {
  const lines: string[] = [];
  lines.push(payload.title);
  lines.push(`Generated: ${new Date(payload.createdAt).toLocaleString()}`);
  lines.push("");
  lines.push("Profile Inputs");
  lines.push(`- Focus Area: ${payload.answers.focusArea || "n/a"}`);
  lines.push(`- Problem: ${payload.answers.problem || "n/a"}`);
  lines.push(`- Skill Level: ${payload.answers.skillLevel}`);
  lines.push(`- Swing Speed: ${payload.answers.swingSpeed}`);
  lines.push(`- Budget: $${payload.answers.budgetMin} - $${payload.answers.budgetMax}`);
  lines.push(`- Playing Frequency: ${payload.answers.playingFrequency}`);
  lines.push(
    `- Goals: ${payload.answers.improvementGoals.length > 0 ? payload.answers.improvementGoals.join(", ") : "n/a"}`
  );
  lines.push("");
  lines.push("Recommended Bag");
  lines.push(...recommendationLines(payload.results));
  lines.push("");
  lines.push(`Total Set Price: $${payload.results.totalPrice.toFixed(2)}`);
  return lines.join("\n");
}

export function downloadTextFile(fileName: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function createSharedReport(payload: FitterReportPayload): string {
  const id = `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  window.localStorage.setItem(`shared-report:${id}`, JSON.stringify(payload));
  return id;
}

export function getSharedReport(id: string): FitterReportPayload | null {
  try {
    const raw = window.localStorage.getItem(`shared-report:${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as FitterReportPayload;
  } catch {
    return null;
  }
}
