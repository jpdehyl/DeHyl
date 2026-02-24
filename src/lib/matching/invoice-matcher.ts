import type {
  Invoice,
  InvoiceWithSuggestions,
  Project,
  ProjectWithTotals,
  MatchSuggestion,
  ClientMapping,
} from "@/types";

// ===========================================
// Client Alias Mappings
// Maps canonical client names to known aliases
// ===========================================
export const CLIENT_ALIASES: Record<string, string[]> = {
  'Certified Demolition': ['CD', 'Cert Demo', 'Certified Demo', 'Certified Demolition Inc.'],
  'Russell and Sons': ['R&S', 'Russell', 'Russell & Sons', 'James Russell', 'Russell & Sons Enterprises'],
  'ADR Construction': ['ADR'],
  'Snowdon Construction': ['Snowdon', 'Snowden'],
  'Soma Construction': ['Soma', 'SOMA'],
  'Tannen Construction': ['Tannen'],
};

// Build reverse lookup: alias -> canonical name
const ALIAS_TO_CANONICAL: Record<string, string> = {};
for (const [canonical, aliases] of Object.entries(CLIENT_ALIASES)) {
  ALIAS_TO_CANONICAL[canonical.toLowerCase()] = canonical;
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL[alias.toLowerCase()] = canonical;
  }
}

/**
 * Gets the canonical client name from any alias
 */
export function getCanonicalClientName(name: string): string | null {
  return ALIAS_TO_CANONICAL[name.toLowerCase()] || null;
}

/**
 * Checks if two client names match (directly or via aliases)
 */
export function clientNamesMatch(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase();
  const n2 = name2.toLowerCase();

  // Direct match
  if (n1 === n2) return true;

  // Canonical match
  const canonical1 = ALIAS_TO_CANONICAL[n1];
  const canonical2 = ALIAS_TO_CANONICAL[n2];

  if (canonical1 && canonical2 && canonical1 === canonical2) return true;

  return false;
}

interface MatchingContext {
  projects: ProjectWithTotals[];
  clientMappings: ClientMapping[];
}

/**
 * Generates match suggestions for an invoice based on various heuristics
 */
export function generateMatchSuggestions(
  invoice: Invoice,
  context: MatchingContext
): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = [];
  const { projects, clientMappings } = context;

  // Only match to active projects
  const activeProjects = projects.filter((p) => p.status === "active");

  for (const project of activeProjects) {
    const matchResult = calculateMatchScore(invoice, project, clientMappings);

    if (matchResult.score > 0) {
      suggestions.push({
        projectId: project.id,
        projectCode: project.code,
        confidence: matchResult.confidence,
        reason: matchResult.reason,
      });
    }
  }

  // Sort by confidence (high > medium > low) then by reason specificity
  const confidenceOrder = { high: 3, medium: 2, low: 1 };
  suggestions.sort((a, b) => {
    return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
  });

  // Return top 3 suggestions
  return suggestions.slice(0, 3);
}

interface MatchResult {
  score: number;
  confidence: "high" | "medium" | "low";
  reason: string;
}

/**
 * Calculates a match score between an invoice and a project
 */
function calculateMatchScore(
  invoice: Invoice,
  project: Project,
  clientMappings: ClientMapping[]
): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  const invoiceMemo = (invoice.memo || "").toLowerCase();
  const invoiceClient = invoice.clientName.toLowerCase();

  // 1. Check for project code in memo (highest confidence)
  if (invoiceMemo.includes(project.code.toLowerCase())) {
    score += 100;
    reasons.push("Project code found in memo");
  }

  // 2. Check for project description keywords in memo
  const descWords = project.description
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const matchedDescWords = descWords.filter((word) =>
    invoiceMemo.includes(word)
  );
  if (matchedDescWords.length >= 2) {
    score += 80;
    reasons.push(`Description match: "${matchedDescWords.join(", ")}"`);
  } else if (matchedDescWords.length === 1) {
    score += 40;
    reasons.push(`Partial description match: "${matchedDescWords[0]}"`);
  }

  // 3. Client name matching
  const clientMatch = matchClientName(
    invoiceClient,
    project.clientName,
    project.clientCode,
    clientMappings
  );
  if (clientMatch.exact) {
    score += 60;
    reasons.push("Client name match");
  } else if (clientMatch.partial) {
    score += 30;
    reasons.push("Partial client name match");
  }

  // 4. Check for client code in memo
  if (invoiceMemo.includes(project.clientCode.toLowerCase())) {
    score += 20;
    reasons.push("Client code in memo");
  }

  // Determine confidence based on score
  let confidence: "high" | "medium" | "low";
  if (score >= 100) {
    confidence = "high";
  } else if (score >= 50) {
    confidence = "medium";
  } else if (score >= 20) {
    confidence = "low";
  } else {
    // No meaningful match
    return { score: 0, confidence: "low", reason: "" };
  }

  // Combine reasons
  const reason = reasons.length > 0 ? reasons[0] : "Potential match";

  return { score, confidence, reason };
}

interface ClientMatchResult {
  exact: boolean;
  partial: boolean;
}

/**
 * Matches invoice client name against project client info using mappings
 */
function matchClientName(
  invoiceClient: string,
  projectClientName: string,
  projectClientCode: string,
  clientMappings: ClientMapping[]
): ClientMatchResult {
  const invoiceClientLower = invoiceClient.toLowerCase();
  const projectClientLower = projectClientName.toLowerCase();

  // Direct match
  if (invoiceClientLower === projectClientLower) {
    return { exact: true, partial: false };
  }

  // Check if one contains the other
  if (
    invoiceClientLower.includes(projectClientLower) ||
    projectClientLower.includes(invoiceClientLower)
  ) {
    return { exact: true, partial: false };
  }

  // Check against client mapping
  const mapping = clientMappings.find(
    (m) => m.code.toLowerCase() === projectClientCode.toLowerCase()
  );

  if (mapping) {
    // Check QB customer name
    if (
      mapping.qbCustomerName.toLowerCase() === invoiceClientLower ||
      invoiceClientLower.includes(mapping.qbCustomerName.toLowerCase()) ||
      mapping.qbCustomerName.toLowerCase().includes(invoiceClientLower)
    ) {
      return { exact: true, partial: false };
    }

    // Check aliases
    for (const alias of mapping.aliases) {
      if (
        alias.toLowerCase() === invoiceClientLower ||
        invoiceClientLower.includes(alias.toLowerCase()) ||
        alias.toLowerCase().includes(invoiceClientLower)
      ) {
        return { exact: true, partial: false };
      }
    }

    // Partial match on display name
    if (
      mapping.displayName.toLowerCase().includes(invoiceClientLower.split(" ")[0])
    ) {
      return { exact: false, partial: true };
    }
  }

  // Check for partial word matches
  const invoiceWords = invoiceClientLower.split(/\s+/);
  const projectWords = projectClientLower.split(/\s+/);
  const commonWords = invoiceWords.filter((w) =>
    projectWords.some((pw) => pw.includes(w) || w.includes(pw))
  );

  if (commonWords.length > 0) {
    return { exact: false, partial: true };
  }

  return { exact: false, partial: false };
}

/**
 * Enriches invoices with match suggestions
 */
export function enrichInvoicesWithSuggestions(
  invoices: Invoice[],
  context: MatchingContext
): InvoiceWithSuggestions[] {
  return invoices.map((invoice) => {
    // Skip if already assigned
    if (invoice.projectId) {
      return {
        ...invoice,
        matchSuggestions: [],
      };
    }

    const matchSuggestions = generateMatchSuggestions(invoice, context);

    return {
      ...invoice,
      matchSuggestions,
    };
  });
}

/**
 * Auto-assigns invoices with high confidence matches
 * Returns the list of invoices that were auto-assigned
 */
export function getAutoAssignableInvoices(
  invoices: InvoiceWithSuggestions[]
): { invoiceId: string; projectId: string; reason: string }[] {
  const autoAssignable: { invoiceId: string; projectId: string; reason: string }[] = [];

  for (const invoice of invoices) {
    if (invoice.projectId) continue; // Already assigned

    const highConfidenceSuggestion = invoice.matchSuggestions.find(
      (s) => s.confidence === "high"
    );

    if (highConfidenceSuggestion) {
      autoAssignable.push({
        invoiceId: invoice.id,
        projectId: highConfidenceSuggestion.projectId,
        reason: highConfidenceSuggestion.reason,
      });
    }
  }

  return autoAssignable;
}

// ===========================================
// Auto-Match with Numeric Confidence
// ===========================================

export interface AutoMatchResult {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  projectId: string;
  projectCode: string;
  confidence: number; // 0-100
  reason: string;
  autoAssigned: boolean;
}

export interface AutoMatchSummary {
  matched: number;
  unmatched: number;
  results: AutoMatchResult[];
}

interface NumericMatchResult {
  projectId: string;
  projectCode: string;
  confidence: number; // 0-100
  reason: string;
}

/**
 * Calculates numeric confidence score (0-100) for invoice-to-project match
 */
function calculateNumericConfidence(
  invoice: Invoice,
  project: Project,
  clientMappings: ClientMapping[]
): NumericMatchResult | null {
  let confidence = 0;
  const reasons: string[] = [];

  const invoiceMemo = (invoice.memo || "").toLowerCase();
  const invoiceClient = invoice.clientName.toLowerCase();
  const projectClientLower = project.clientName.toLowerCase();
  const projectCodeLower = project.clientCode.toLowerCase();

  // 1. Project code in memo → +90%
  if (invoiceMemo.includes(project.code.toLowerCase())) {
    confidence = Math.max(confidence, 90);
    reasons.push("Project code found in memo");
  }

  // 2. Client code in memo → +90%
  if (invoiceMemo.includes(projectCodeLower) && projectCodeLower.length >= 2) {
    confidence = Math.max(confidence, 90);
    reasons.push("Client code in memo");
  }

  // 3. Exact client name match → 90%
  if (invoiceClient === projectClientLower) {
    confidence = Math.max(confidence, 90);
    reasons.push("Client name exact match");
  }

  // 4. Client alias match → 90%
  if (clientNamesMatch(invoice.clientName, project.clientName)) {
    confidence = Math.max(confidence, 90);
    reasons.push("Client name alias match");
  }

  // 5. Check against client_mappings table
  const mapping = clientMappings.find(
    (m) => m.code.toLowerCase() === projectCodeLower
  );
  if (mapping) {
    // QB customer name match
    if (
      invoiceClient === mapping.qbCustomerName.toLowerCase() ||
      invoiceClient.includes(mapping.qbCustomerName.toLowerCase()) ||
      mapping.qbCustomerName.toLowerCase().includes(invoiceClient)
    ) {
      confidence = Math.max(confidence, 90);
      reasons.push("QB customer name match");
    }
    // Alias match from DB
    for (const alias of mapping.aliases) {
      if (
        invoiceClient === alias.toLowerCase() ||
        invoiceClient.includes(alias.toLowerCase()) ||
        alias.toLowerCase().includes(invoiceClient)
      ) {
        confidence = Math.max(confidence, 90);
        reasons.push(`Client alias match: "${alias}"`);
        break;
      }
    }
  }

  // 6. Partial client name match (substring) → 70%
  if (confidence < 90) {
    if (
      invoiceClient.includes(projectClientLower) ||
      projectClientLower.includes(invoiceClient)
    ) {
      confidence = Math.max(confidence, 70);
      reasons.push("Partial client name match");
    }
  }

  // 7. Word overlap in client names → 60%
  if (confidence < 70) {
    const invoiceWords = invoiceClient.split(/\s+/).filter((w) => w.length > 2);
    const projectWords = projectClientLower.split(/\s+/).filter((w) => w.length > 2);
    const commonWords = invoiceWords.filter((w) =>
      projectWords.some((pw) => pw === w || pw.includes(w) || w.includes(pw))
    );
    if (commonWords.length > 0) {
      confidence = Math.max(confidence, 60);
      reasons.push(`Word match: "${commonWords.join(", ")}"`);
    }
  }

  // 8. Project description keywords in memo → +15%
  const descWords = project.description
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const matchedDescWords = descWords.filter((word) => invoiceMemo.includes(word));
  if (matchedDescWords.length >= 2) {
    confidence += 15;
    reasons.push(`Description keywords: "${matchedDescWords.slice(0, 2).join(", ")}"`);
  }

  // 9. Same month as project code (YYMM) → +10%
  // Project code format: YYMM### (e.g., 2601007 = Jan 2026)
  const projectYYMM = project.code.substring(0, 4);
  const invoiceDate = new Date(invoice.issueDate);
  const invoiceYY = String(invoiceDate.getFullYear()).slice(-2);
  const invoiceMM = String(invoiceDate.getMonth() + 1).padStart(2, "0");
  const invoiceYYMM = invoiceYY + invoiceMM;

  if (projectYYMM === invoiceYYMM) {
    confidence += 10;
    reasons.push("Same month as project");
  }

  // Cap confidence at 100
  confidence = Math.min(confidence, 100);

  if (confidence === 0) {
    return null;
  }

  return {
    projectId: project.id,
    projectCode: project.code,
    confidence,
    reason: reasons[0] || "Potential match",
  };
}

/**
 * Finds the best matching project for an invoice with numeric confidence
 * When multiple projects match with same confidence, returns null to avoid misassignment
 */
export function findBestMatch(
  invoice: Invoice,
  projects: Project[],
  clientMappings: ClientMapping[]
): NumericMatchResult | null {
  const activeProjects = projects.filter((p) => p.status === "active");
  const matches: NumericMatchResult[] = [];

  for (const project of activeProjects) {
    const result = calculateNumericConfidence(invoice, project, clientMappings);
    if (result && result.confidence >= 80) {
      matches.push(result);
    }
  }

  // If no matches found
  if (matches.length === 0) {
    return null;
  }

  // If exactly one match, return it
  if (matches.length === 1) {
    return matches[0];
  }

  // Multiple matches - only return if one has significantly higher confidence
  // OR if one has a more specific match (project code in memo)
  matches.sort((a, b) => b.confidence - a.confidence);
  const best = matches[0];
  const secondBest = matches[1];

  // If best match has project code match (reason includes "project code"), prefer it
  if (best.reason.toLowerCase().includes("project code")) {
    return best;
  }

  // If there's a significant confidence gap (>10%), return the best
  if (best.confidence - secondBest.confidence > 10) {
    return best;
  }

  // Multiple projects with similar confidence - don't auto-assign
  // This prevents all invoices from going to the same project
  return null;
}

/**
 * Auto-matches all unassigned invoices to projects
 * Returns matches with confidence > 80% marked for auto-assignment
 */
export function autoMatchInvoices(
  invoices: Invoice[],
  projects: Project[],
  clientMappings: ClientMapping[],
  autoAssignThreshold: number = 80
): AutoMatchSummary {
  const results: AutoMatchResult[] = [];
  let matched = 0;
  let unmatched = 0;

  // Only process unassigned invoices
  const unassignedInvoices = invoices.filter((inv) => !inv.projectId);

  for (const invoice of unassignedInvoices) {
    const match = findBestMatch(invoice, projects, clientMappings);

    if (match) {
      const autoAssigned = match.confidence >= autoAssignThreshold;
      results.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        projectId: match.projectId,
        projectCode: match.projectCode,
        confidence: match.confidence / 100, // Convert to 0-1 for API response
        reason: match.reason,
        autoAssigned,
      });
      if (autoAssigned) {
        matched++;
      } else {
        unmatched++;
      }
    } else {
      unmatched++;
    }
  }

  return {
    matched,
    unmatched,
    results,
  };
}
