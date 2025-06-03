import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });
  if (req.query.id !== "0001") return res.status(404).json({ message: "Service not found" });

  try {
    const { prefetch } = req.body;
    const patient = prefetch?.patient;
    const observations = prefetch?.observations;

    const patientName = `${patient?.name?.[0]?.given?.[0] || ""} ${patient?.name?.[0]?.family || ""}`.trim();

    let lastAnalyzed = "";
    let riskCards: any[] = [];

    if (observations?.entry?.length) {
      const aiAnalysisObservations = observations.entry
        .map((e: any) => e.resource)
        .filter(
          (r: any) =>
            r.resourceType === "Observation" &&
            r.code?.coding?.some((c: any) => c.code === "ai-last-analysis")
        );

      // Sort by valueDateTime (or effectiveDateTime) descending
      aiAnalysisObservations.sort((a: any, b: any) =>
        new Date(b.valueDateTime || b.effectiveDateTime).getTime() -
        new Date(a.valueDateTime || a.effectiveDateTime).getTime()
      );

      const mostRecent = aiAnalysisObservations[0];

      if (mostRecent?.valueDateTime) {
        lastAnalyzed = mostRecent.valueDateTime;
      }

      // Parse riskScores and generate additional cards
      const analysisComponent = mostRecent?.component?.find(
        (comp: any) =>
          comp.code?.coding?.some((c: any) => c.code === "analysis-json") &&
          typeof comp.valueString === "string"
      );

      if (analysisComponent) {
        try {
          const analysisData = JSON.parse(analysisComponent.valueString);
          const riskScores = analysisData?.riskScores || [];

          riskCards = riskScores
            .filter((risk: any) => ["moderate", "high"].includes((risk.score || "").toLowerCase()))
            .map((risk: any) => ({
              summary: `Risk identified: ${risk.label} (${risk.score})`,
              indicator: risk.score.toLowerCase() === "high" ? "critical" : "warning",
              source: { label: "AI Predictive Service" },
              detail: `AI identified a ${risk.score.toLowerCase()} risk for ${risk.label}. Consider reviewing recent clinical data or initiating appropriate interventions.`,
            }));
        } catch (e) {
          console.warn("Invalid JSON in analysis component:", e);
        }
      }
    }

    const summary = lastAnalyzed
      ? `AI insights available for ${patientName} - Last analyzed ${lastAnalyzed}`
      : `AI insights unavailable for ${patientName} - Launch app to get started`;

    const mainCard = {
      summary,
      indicator: lastAnalyzed ? "info" : "warning",
      source: { label: "AI Predictive Service" },
      links: [
        {
          label: "Get AI Insights",
          url: "https://meldrx-predictiveai-application.apps.darenahealth.com/launch",
          type: "smart",
        },
      ],
    };

    return res.json({
      cards: [mainCard, ...riskCards],
    });
  } catch (error: any) {
    console.error("CDS Hook Error:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}
