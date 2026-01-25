import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProjectTypeOption, ProjectType } from "@/types";

// Default project types (used if database table doesn't exist yet)
const DEFAULT_PROJECT_TYPES: ProjectTypeOption[] = [
  { code: 'interior_demo', name: 'Interior Demolition', description: 'Removal of non-structural interior elements', typicalPricePerSqFt: 8.50 },
  { code: 'full_demo', name: 'Full Demolition', description: 'Complete building demolition', typicalPricePerSqFt: 12.00 },
  { code: 'abatement', name: 'Hazardous Material Abatement', description: 'Asbestos, lead, mold removal', typicalPricePerSqFt: 15.00 },
  { code: 'retail_fitout', name: 'Retail Fit-out', description: 'Commercial space renovation', typicalPricePerSqFt: 10.00 },
  { code: 'hazmat', name: 'Hazmat Cleanup', description: 'Hazardous material handling and disposal', typicalPricePerSqFt: 18.00 },
  { code: 'restoration', name: 'Restoration', description: 'Building restoration and repair work', typicalPricePerSqFt: 14.00 },
];

export async function GET() {
  const supabase = await createClient();

  // Try to fetch from database
  const { data: typesData, error } = await supabase
    .from("project_types")
    .select("*")
    .order("sort_order");

  // If table doesn't exist or error, return defaults
  if (error || !typesData || typesData.length === 0) {
    return NextResponse.json({ projectTypes: DEFAULT_PROJECT_TYPES });
  }

  // Transform database rows
  const projectTypes: ProjectTypeOption[] = typesData.map((row) => ({
    code: row.code as ProjectType,
    name: row.name,
    description: row.description || "",
    typicalPricePerSqFt: row.typical_price_per_sqft
      ? Number(row.typical_price_per_sqft)
      : 10.00,
  }));

  return NextResponse.json({ projectTypes });
}
