import type { Bid } from "@/types";

export const mockBids: Bid[] = [
  {
    id: "bid1",
    name: "Vancouver Office Tower Demo",
    clientCode: "CD",
    clientName: "Certified Demolition",
    description: "Interior demolition of 15-floor office building",
    submittedDate: new Date("2026-01-10"),
    dueDate: new Date("2026-01-20"),
    status: "submitted",
    estimatedValue: 125000,
    actualValue: null,
    driveFolderId: null,
    convertedProjectId: null,
    notes: "Large project, multiple phases",
    projectType: "interior_demo",
    squareFootage: 15000,
    location: "Vancouver, BC",
    quoteMetadata: null,
    createdAt: new Date("2026-01-08"),
    updatedAt: new Date("2026-01-10"),
  },
  {
    id: "bid2",
    name: "Richmond Hospital Wing",
    clientCode: "ADR",
    clientName: "ADR Construction",
    description: "Hazmat abatement and selective demolition",
    submittedDate: new Date("2026-01-05"),
    dueDate: new Date("2026-01-15"),
    status: "won",
    estimatedValue: 85000,
    actualValue: 82500,
    driveFolderId: null,
    convertedProjectId: "p2",
    notes: "Won! Start date Feb 1",
    projectType: "abatement",
    squareFootage: 5500,
    location: "Richmond, BC",
    quoteMetadata: null,
    createdAt: new Date("2026-01-02"),
    updatedAt: new Date("2026-01-15"),
  },
  {
    id: "bid3",
    name: "Burnaby Mall Food Court",
    clientCode: "R&S",
    clientName: "Russell & Sons",
    description: "Food court renovation demolition",
    submittedDate: new Date("2025-12-20"),
    dueDate: new Date("2026-01-05"),
    status: "lost",
    estimatedValue: 45000,
    actualValue: null,
    driveFolderId: null,
    convertedProjectId: null,
    notes: "Lost to competitor - lower price",
    projectType: "retail_fitout",
    squareFootage: 4500,
    location: "Burnaby, BC",
    quoteMetadata: null,
    createdAt: new Date("2025-12-15"),
    updatedAt: new Date("2026-01-06"),
  },
  {
    id: "bid4",
    name: "Surrey Industrial Complex",
    clientCode: "CD",
    clientName: "Certified Demolition",
    description: "Complete building demolition",
    submittedDate: null,
    dueDate: new Date("2026-01-25"),
    status: "draft",
    estimatedValue: 200000,
    actualValue: null,
    driveFolderId: null,
    convertedProjectId: null,
    notes: "Working on estimate",
    projectType: "full_demo",
    squareFootage: 18000,
    location: "Surrey, BC",
    quoteMetadata: null,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-18"),
  },
  {
    id: "bid5",
    name: "Langley Warehouse",
    clientCode: "ADR",
    clientName: "ADR Construction",
    description: "Interior strip-out",
    submittedDate: new Date("2025-12-10"),
    dueDate: new Date("2025-12-20"),
    status: "no-bid",
    estimatedValue: null,
    actualValue: null,
    driveFolderId: null,
    convertedProjectId: null,
    notes: "Schedule conflict - declined",
    projectType: "interior_demo",
    squareFootage: 8000,
    location: "Langley, BC",
    quoteMetadata: null,
    createdAt: new Date("2025-12-08"),
    updatedAt: new Date("2025-12-10"),
  },
];

export const getBidStats = (bids: Bid[]) => {
  const submitted = bids.filter((b) => b.status === "submitted").length;
  const won = bids.filter((b) => b.status === "won").length;
  const lost = bids.filter((b) => b.status === "lost").length;
  const draft = bids.filter((b) => b.status === "draft").length;
  const noBid = bids.filter((b) => b.status === "no-bid").length;

  const totalBids = submitted + won + lost;
  const conversionRate = totalBids > 0 ? (won / totalBids) * 100 : 0;

  const totalEstimatedValue = bids
    .filter((b) => b.status === "won" && b.estimatedValue)
    .reduce((sum, b) => sum + (b.estimatedValue || 0), 0);

  const totalActualValue = bids
    .filter((b) => b.status === "won" && b.actualValue)
    .reduce((sum, b) => sum + (b.actualValue || 0), 0);

  return {
    submitted,
    won,
    lost,
    draft,
    noBid,
    total: bids.length,
    conversionRate,
    totalEstimatedValue,
    totalActualValue,
  };
};
