// hooks/useAnalyses.ts
import { useEffect, useState } from "react";
import { StructuredAnalysis, riskValue } from "@/utils/types";
import { fetchFHIRResource } from "@/utils/fhirAPICalls";

export interface HistoryPoint {
  date: string;
  label: string;
  score: number; // 1-3
}

export default function useAnalyses(token?: string, patientId?: string) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [latest,  setLatest]  = useState<StructuredAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!token || !patientId) return;

    setLoading(true);
    setError(null);

    fetchFHIRResource({
      resourceType: "Observation",
      token,
      patientId,
      dispatch: () => {},
      setResourceAction: () => {},
      onFetched: (data: any[]) => {
        console.log("🩺 Analysis observations returned:", data.length);

        const points: HistoryPoint[] = [];
        let newest: StructuredAnalysis | null = null;

        data
          .filter(
            (o) =>
              o.code?.coding?.some(
                (c: any) => c.code === "clinical-analysis"
              ) && o.valueString
          )
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
              newest = parsed; // last item will be newest
            } catch (err) {
              console.warn("Bad valueString in obs", obs.id, err);
            }
          });

        setHistory(points);
        setLatest(newest);
        setLoading(false);
      },
      setError: (e) => {
        setError(e);
        setLoading(false);
      },
    });
  }, [token, patientId]);

  return { history, latest, loading, error };
}
