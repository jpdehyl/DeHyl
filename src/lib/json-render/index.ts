// ===========================================
// DeHyl Financials JSON-Render Integration
// ===========================================

export { DashboardSchema, catalogDescription } from "./catalog";
export { JsonRenderer, renderComponent, type Dashboard } from "./renderer";
export { useStreamingJson, useDashboardActions } from "./hooks";
export { exampleDashboard, createKpiDashboard, dashboardGenerationPrompt } from "./examples";
