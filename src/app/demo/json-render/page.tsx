"use client";

import { JsonRenderer } from "@/lib/json-render/renderer";
import { exampleDashboard } from "@/lib/json-render/examples";

export default function JsonRenderDemoPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">JSON-Render Demo</h1>
        <p className="text-muted-foreground">
          This page demonstrates the json-render framework with all available components.
        </p>
      </div>

      <JsonRenderer dashboard={exampleDashboard} />
    </div>
  );
}
