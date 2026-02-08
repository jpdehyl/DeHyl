import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: templates, error } = await supabase
      .from("safety_templates")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching safety templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
