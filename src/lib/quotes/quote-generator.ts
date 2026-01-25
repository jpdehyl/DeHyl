/**
 * Quote Generator Algorithm
 *
 * Finds similar completed projects and generates price estimates
 * based on historical data.
 */

import type {
  Project,
  QuoteRequest,
  QuoteResponse,
  SimilarProject,
  QuoteBreakdown,
  ProjectType
} from '@/types';

// Common keywords for description matching
const DEMOLITION_KEYWORDS = ['demo', 'demolition', 'removal', 'tear', 'strip'];
const ABATEMENT_KEYWORDS = ['asbestos', 'lead', 'mold', 'hazmat', 'hazardous', 'abatement'];
const RETAIL_KEYWORDS = ['fitout', 'fit-out', 'retail', 'store', 'shop', 'commercial', 'office'];
const RESTORATION_KEYWORDS = ['restoration', 'repair', 'restore', 'renovate', 'renovation'];

// Default cost breakdown percentages (based on typical demolition projects)
const DEFAULT_BREAKDOWN_PERCENTAGES: QuoteBreakdown = {
  labor: 0.40,      // 40% labor
  materials: 0.10,  // 10% materials/supplies
  disposal: 0.25,   // 25% disposal/hauling
  equipment: 0.15,  // 15% equipment rental
  overhead: 0.10,   // 10% overhead/profit
};

/**
 * Extract keywords from a description for matching
 */
function extractKeywords(description: string): string[] {
  if (!description) return [];

  // Normalize and split into words
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);

  // Remove common words
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'has',
    'was', 'are', 'been', 'will', 'can', 'all', 'new', 'one', 'two'
  ]);

  return words.filter(word => !stopWords.has(word));
}

/**
 * Calculate similarity score between a quote request and a project
 * Returns a score between 0 and 1
 */
export function calculateSimilarity(
  request: QuoteRequest,
  project: Project & { finalRevenue: number }
): number {
  let score = 0;

  // Same client = +0.3 (highest weight for client preference)
  if (request.clientCode && project.clientCode) {
    if (request.clientCode.toLowerCase() === project.clientCode.toLowerCase()) {
      score += 0.3;
    }
  }

  // Same project type = +0.4 (most important factor)
  if (request.projectType && project.projectType) {
    if (request.projectType === project.projectType) {
      score += 0.4;
    } else {
      // Partial match for related types
      const relatedTypes: Record<ProjectType, ProjectType[]> = {
        'interior_demo': ['full_demo', 'retail_fitout'],
        'full_demo': ['interior_demo'],
        'abatement': ['hazmat'],
        'retail_fitout': ['interior_demo', 'restoration'],
        'hazmat': ['abatement'],
        'restoration': ['retail_fitout'],
      };

      const related = relatedTypes[request.projectType] || [];
      if (related.includes(project.projectType)) {
        score += 0.2;
      }
    }
  }

  // Similar square footage (within 30%) = +0.2
  if (request.squareFootage && project.squareFootage) {
    const smaller = Math.min(request.squareFootage, project.squareFootage);
    const larger = Math.max(request.squareFootage, project.squareFootage);
    const ratio = smaller / larger;

    if (ratio > 0.7) {
      // Direct proportion for close matches
      score += 0.2 * ratio;
    } else if (ratio > 0.5) {
      // Partial score for somewhat similar sizes
      score += 0.1;
    }
  }

  // Description keyword overlap = +0.1
  const requestKeywords = extractKeywords(request.description);
  const projectKeywords = extractKeywords(project.description || '');

  if (requestKeywords.length > 0 && projectKeywords.length > 0) {
    const overlap = requestKeywords.filter(k => projectKeywords.includes(k)).length;
    const overlapScore = Math.min(0.1, overlap * 0.025);
    score += overlapScore;
  }

  // Location match = +0.05 (minor factor)
  if (request.location && project.location) {
    const requestLocation = request.location.toLowerCase();
    const projectLocation = project.location.toLowerCase();

    if (requestLocation === projectLocation) {
      score += 0.05;
    } else if (
      requestLocation.includes(projectLocation) ||
      projectLocation.includes(requestLocation)
    ) {
      score += 0.02;
    }
  }

  return Math.min(1, score);
}

/**
 * Find similar completed projects based on the quote request
 */
export function findSimilarProjects(
  request: QuoteRequest,
  allProjects: Project[]
): SimilarProject[] {
  // Filter to closed projects with final revenue
  const completedProjects = allProjects.filter(
    (p): p is Project & { finalRevenue: number } =>
      p.status === 'closed' &&
      p.finalRevenue !== null &&
      p.finalRevenue > 0
  );

  // Calculate similarity for each project
  const projectsWithSimilarity = completedProjects.map(project => ({
    ...project,
    similarity: calculateSimilarity(request, project),
  }));

  // Filter by minimum similarity threshold and sort
  return projectsWithSimilarity
    .filter(p => p.similarity > 0.25)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10)
    .map(p => ({
      id: p.id,
      code: p.code,
      description: p.description,
      clientCode: p.clientCode,
      finalRevenue: p.finalRevenue,
      squareFootage: p.squareFootage,
      pricePerSqFt: p.squareFootage && p.squareFootage > 0
        ? Math.round((p.finalRevenue / p.squareFootage) * 100) / 100
        : null,
      projectType: p.projectType,
      similarity: Math.round(p.similarity * 100) / 100,
    }));
}

/**
 * Calculate the estimated price range based on similar projects
 */
function calculatePriceRange(
  request: QuoteRequest,
  similarProjects: SimilarProject[]
): { low: number; high: number; average: number } {
  if (similarProjects.length === 0) {
    // No similar projects - use typical price per sqft if we have square footage
    if (request.squareFootage) {
      const typicalPricePerSqFt = getTypicalPricePerSqFt(request.projectType);
      const estimate = request.squareFootage * typicalPricePerSqFt;
      return {
        low: Math.round(estimate * 0.8),
        high: Math.round(estimate * 1.2),
        average: Math.round(estimate),
      };
    }
    // Can't estimate without data
    return { low: 0, high: 0, average: 0 };
  }

  // If we have square footage, prefer price-per-sqft calculations
  if (request.squareFootage) {
    const pricesPerSqFt = similarProjects
      .filter(p => p.pricePerSqFt !== null)
      .map(p => p.pricePerSqFt!);

    if (pricesPerSqFt.length > 0) {
      // Weight by similarity for better estimate
      const weightedPrices = similarProjects
        .filter(p => p.pricePerSqFt !== null)
        .map(p => p.pricePerSqFt! * p.similarity);
      const totalWeight = similarProjects
        .filter(p => p.pricePerSqFt !== null)
        .reduce((sum, p) => sum + p.similarity, 0);

      const weightedAvgPerSqFt = totalWeight > 0
        ? weightedPrices.reduce((a, b) => a + b, 0) / totalWeight
        : pricesPerSqFt.reduce((a, b) => a + b, 0) / pricesPerSqFt.length;

      const minPerSqFt = Math.min(...pricesPerSqFt);
      const maxPerSqFt = Math.max(...pricesPerSqFt);

      return {
        low: Math.round(request.squareFootage * minPerSqFt * 0.95),
        high: Math.round(request.squareFootage * maxPerSqFt * 1.05),
        average: Math.round(request.squareFootage * weightedAvgPerSqFt),
      };
    }
  }

  // Fall back to direct revenue comparison
  const revenues = similarProjects.map(p => p.finalRevenue);
  const weightedRevenues = similarProjects.map(p => p.finalRevenue * p.similarity);
  const totalWeight = similarProjects.reduce((sum, p) => sum + p.similarity, 0);

  const weightedAvg = totalWeight > 0
    ? weightedRevenues.reduce((a, b) => a + b, 0) / totalWeight
    : revenues.reduce((a, b) => a + b, 0) / revenues.length;

  const minRevenue = Math.min(...revenues);
  const maxRevenue = Math.max(...revenues);

  return {
    low: Math.round(minRevenue * 0.9),
    high: Math.round(maxRevenue * 1.1),
    average: Math.round(weightedAvg),
  };
}

/**
 * Get typical price per square foot for a project type
 * Based on BC demolition industry averages
 */
function getTypicalPricePerSqFt(projectType: ProjectType): number {
  const typicalPrices: Record<ProjectType, number> = {
    'interior_demo': 8.50,
    'full_demo': 12.00,
    'abatement': 15.00,
    'retail_fitout': 10.00,
    'hazmat': 18.00,
    'restoration': 14.00,
  };

  return typicalPrices[projectType] || 10.00;
}

/**
 * Calculate a breakdown of estimated costs by category
 */
function calculateBreakdown(average: number): QuoteBreakdown {
  return {
    labor: Math.round(average * DEFAULT_BREAKDOWN_PERCENTAGES.labor),
    materials: Math.round(average * DEFAULT_BREAKDOWN_PERCENTAGES.materials),
    disposal: Math.round(average * DEFAULT_BREAKDOWN_PERCENTAGES.disposal),
    equipment: Math.round(average * DEFAULT_BREAKDOWN_PERCENTAGES.equipment),
    overhead: Math.round(average * DEFAULT_BREAKDOWN_PERCENTAGES.overhead),
  };
}

/**
 * Determine confidence level based on number and quality of similar projects
 */
function determineConfidence(
  similarProjects: SimilarProject[],
  request: QuoteRequest
): 'high' | 'medium' | 'low' {
  if (similarProjects.length === 0) {
    return 'low';
  }

  // Check for high-similarity matches
  const highSimilarityCount = similarProjects.filter(p => p.similarity >= 0.6).length;
  const hasSqFtMatches = similarProjects.some(
    p => p.pricePerSqFt !== null && request.squareFootage
  );

  if (highSimilarityCount >= 3 && hasSqFtMatches) {
    return 'high';
  }

  if (highSimilarityCount >= 1 || similarProjects.length >= 5) {
    return 'medium';
  }

  return 'low';
}

/**
 * Generate a quote estimate based on similar historical projects
 */
export function generateQuote(
  request: QuoteRequest,
  allProjects: Project[]
): QuoteResponse {
  // Find similar projects
  const similarProjects = findSimilarProjects(request, allProjects);

  // Calculate price range
  const estimatedRange = calculatePriceRange(request, similarProjects);

  // Determine confidence
  const confidence = determineConfidence(similarProjects, request);

  // Calculate breakdown if we have a valid estimate
  const breakdown = estimatedRange.average > 0
    ? calculateBreakdown(estimatedRange.average)
    : undefined;

  // Calculate suggested price per sqft
  let suggestedPricePerSqFt: number | undefined;
  if (request.squareFootage && estimatedRange.average > 0) {
    suggestedPricePerSqFt = Math.round(
      (estimatedRange.average / request.squareFootage) * 100
    ) / 100;
  } else if (similarProjects.length > 0) {
    const pricesPerSqFt = similarProjects
      .filter(p => p.pricePerSqFt !== null)
      .map(p => p.pricePerSqFt!);
    if (pricesPerSqFt.length > 0) {
      suggestedPricePerSqFt = Math.round(
        (pricesPerSqFt.reduce((a, b) => a + b, 0) / pricesPerSqFt.length) * 100
      ) / 100;
    }
  }

  return {
    estimatedRange,
    confidence,
    basedOn: similarProjects.length,
    similarProjects,
    breakdown,
    suggestedPricePerSqFt,
  };
}

/**
 * Suggest a project type based on description keywords
 */
export function suggestProjectType(description: string): ProjectType | null {
  const desc = description.toLowerCase();

  // Check for abatement/hazmat first (highest priority)
  if (ABATEMENT_KEYWORDS.some(k => desc.includes(k))) {
    return desc.includes('mold') ? 'abatement' :
           desc.includes('hazmat') ? 'hazmat' : 'abatement';
  }

  // Check for restoration
  if (RESTORATION_KEYWORDS.some(k => desc.includes(k))) {
    return 'restoration';
  }

  // Check for retail/fitout
  if (RETAIL_KEYWORDS.some(k => desc.includes(k))) {
    return 'retail_fitout';
  }

  // Check for demolition (most common)
  if (DEMOLITION_KEYWORDS.some(k => desc.includes(k))) {
    return desc.includes('full') || desc.includes('complete')
      ? 'full_demo'
      : 'interior_demo';
  }

  return null;
}
