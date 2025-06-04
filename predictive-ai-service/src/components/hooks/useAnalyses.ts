// hooks/useAnalyses.ts
import { useEffect, useState } from "react";
import { StructuredAnalysis, riskValue } from "@/utils/types";
import { fetchFHIRResource } from "@/utils/fhirAPICalls";

export interface HistoryPoint {
  date: string;
  label: string;
  score: number; // 1-3
}

export default function useAnalyses(token: string, patientId: string) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [latest, setLatest]   = useState<StructuredAnalysis | null>(null);

  useEffect(() => {
    if (!token || !patientId) return;

    fetchFHIRResource({
      resourceType: "Observation",
      token,
      patientId,
      // 👇 you probably have a Redux action—use a no-op if not needed
      dispatch: () => {},
      setResourceAction: () => {},
      // pull everything; filter later
      onFetched: (data: any[]) => {
        const points: HistoryPoint[] = [];

        data
          // keep only your custom analysis observations
          .filter(
            (o) =>
              o.code?.coding?.some(
                (c: any) => c.code === "clinical-analysis"
              ) && o.valueString
          )
          // newest last, so iterate naturally and capture the last one
          .forEach((obs) => {
            try {
              const parsed: StructuredAnalysis = JSON.parse(obs.valueString);
              parsed.riskScores.forEach((rs) =>
                points.push({
                  date:
                    obs.effectiveDateTime ??
                    obs.issued ??
                    obs.meta?.lastUpdated,
                  label: rs.label,
                  score: riskValue[rs.score],
                })
              );
              setLatest(parsed); // will end up with newest
            } catch {
              /* ignore */
            }
          });

        setHistory(points);
      },
    });
  }, [token, patientId]);

  return { history, latest };
}
