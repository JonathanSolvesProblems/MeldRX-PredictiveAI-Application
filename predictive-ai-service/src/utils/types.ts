export type ResourceType =
  | "Condition"
  | "Observation"
  | "DocumentReference"
  | "AllergyIntolerance"
  | "CarePlan"
  | "CareTeam"
  | "Device"
  | "DiagnosticReport"
  | "Encounter"
  | "Goal"
  | "Immunization"
  | "MedicationStatement"
  | "Procedure"
  | "Provenance"

export type ResourceConfig = {
  maxItems?: number
  onFetched?: (items: any[]) => void
}

export type UseAllPatientDataOptions = {
  resourceConfigs?: Partial<Record<ResourceType, ResourceConfig>>
}

export interface StructuredAnalysis {
  riskScores: { label: string; score: "Low" | "Moderate" | "High" }[];
  recommendedTreatments: { treatment: string; condition: string }[];
  preventiveMeasures: string[];
  sources: string[];
  summaryText: string;
  accuracy: number;
  accuracyExplanation: string;
}

export const riskValue = {
  Low: 1,
  Moderate: 2,
  High: 3,
} as const;

export const riskLabel = ["Low", "Moderate", "High"];