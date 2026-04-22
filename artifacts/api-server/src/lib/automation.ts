import { desc, eq, sql } from "drizzle-orm";
import { db, ticketsTable, messagesTable } from "@workspace/db";

/**
 * Paid AI automation stubs. These are deterministic, local heuristics designed
 * to be safe placeholders while a real LLM/vector-search integration is wired
 * in. They intentionally do not call external AI providers.
 */

export interface SuggestedResponse {
  title: string;
  body: string;
  confidence: number;
}

export interface DuplicateCandidate {
  ticketId: string;
  subject: string | null;
  score: number;
}

export type SmartRoutingDepartment = "billing" | "security" | "technical" | "general";

export interface SmartRouting {
  department: SmartRoutingDepartment;
  reason: string;
}

export interface PriorityScore {
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  score: number;
  signals: string[];
}

const KEYWORD_BUCKETS: Record<SmartRoutingDepartment, string[]> = {
  billing: ["invoice", "charge", "refund", "payment", "subscription", "billing"],
  security: ["hacked", "breach", "2fa", "password", "phishing", "unauthorized"],
  technical: ["error", "bug", "crash", "500", "timeout", "integration", "api"],
  general: [],
};

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

export function suggestResponses(subject: string | null, lastMessage: string | null): SuggestedResponse[] {
  const joined = `${subject ?? ""} ${lastMessage ?? ""}`.toLowerCase();
  const suggestions: SuggestedResponse[] = [];

  if (/refund|charge|invoice|billing/.test(joined)) {
    suggestions.push({
      title: "Billing follow-up",
      body: "Thanks for reaching out. I'm pulling up your billing history now and will confirm the charge in question shortly.",
      confidence: 0.72,
    });
  }
  if (/password|2fa|login|access/.test(joined)) {
    suggestions.push({
      title: "Account access",
      body: "For security, I'll send a verification step to the email on file before making any account changes.",
      confidence: 0.7,
    });
  }
  if (/error|bug|crash|timeout/.test(joined)) {
    suggestions.push({
      title: "Diagnostics request",
      body: "Could you share the exact time of the error and any request ID you see? That helps me correlate server logs.",
      confidence: 0.68,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      title: "Acknowledge and triage",
      body: "Thanks for the details. I'm looking into this now and will follow up shortly with next steps.",
      confidence: 0.55,
    });
  }

  return suggestions;
}

export async function findDuplicateCandidates(ticketId: string, limit = 5): Promise<DuplicateCandidate[]> {
  const [target] = await db
    .select({ subject: ticketsTable.subject })
    .from(ticketsTable)
    .where(eq(ticketsTable.id, ticketId))
    .limit(1);

  if (!target?.subject) return [];

  const tokens = new Set(tokenize(target.subject).filter((t) => t.length > 3));
  if (tokens.size === 0) return [];

  const others = await db
    .select({ id: ticketsTable.id, subject: ticketsTable.subject })
    .from(ticketsTable)
    .where(sql`${ticketsTable.id} <> ${ticketId} and ${ticketsTable.subject} is not null`)
    .orderBy(desc(ticketsTable.createdAt))
    .limit(200);

  const scored: DuplicateCandidate[] = [];
  for (const row of others) {
    const otherTokens = new Set(tokenize(row.subject ?? "").filter((t) => t.length > 3));
    if (otherTokens.size === 0) continue;
    let overlap = 0;
    for (const t of tokens) if (otherTokens.has(t)) overlap++;
    const score = overlap / Math.max(tokens.size, otherTokens.size);
    if (score >= 0.4) {
      scored.push({ ticketId: row.id, subject: row.subject, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export function routeTicket(subject: string | null, body: string | null): SmartRouting {
  const haystack = `${subject ?? ""} ${body ?? ""}`.toLowerCase();
  let best: { dept: SmartRoutingDepartment; hits: number } = { dept: "general", hits: 0 };
  for (const [deptRaw, keywords] of Object.entries(KEYWORD_BUCKETS)) {
    const dept = deptRaw as SmartRoutingDepartment;
    const hits = keywords.reduce((acc, kw) => acc + (haystack.includes(kw) ? 1 : 0), 0);
    if (hits > best.hits) best = { dept, hits };
  }
  return {
    department: best.dept,
    reason: best.hits === 0 ? "No strong category signal — default routing" : `${best.hits} keyword hit(s)`,
  };
}

export function scorePriority(subject: string | null, body: string | null, riskScore: number): PriorityScore {
  const text = `${subject ?? ""} ${body ?? ""}`.toLowerCase();
  const signals: string[] = [];
  let score = 0;

  if (/urgent|asap|emergency|down|outage|breach/.test(text)) {
    score += 0.5;
    signals.push("urgent_keywords");
  }
  if (/cannot|can't|blocked|stuck|losing money/.test(text)) {
    score += 0.2;
    signals.push("impact_language");
  }
  if (riskScore >= 0.7) {
    score += 0.25;
    signals.push("high_risk_user");
  } else if (riskScore >= 0.4) {
    score += 0.1;
    signals.push("elevated_risk_user");
  }

  let priority: PriorityScore["priority"] = "NORMAL";
  if (score >= 0.7) priority = "URGENT";
  else if (score >= 0.45) priority = "HIGH";
  else if (score < 0.15) priority = "LOW";

  return { priority, score: Math.min(1, Number(score.toFixed(2))), signals };
}
