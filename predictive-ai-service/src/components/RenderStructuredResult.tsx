import { RootState } from "@/app/redux/store";
import { fetchFHIRResource } from "@/utils/fhirAPICalls";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function RenderStructuredResult(result: any) {
  const [fetchedSources, setFetchedSources] = useState<Record<string, any>>({});
  const token = useSelector((state: RootState) => state.auth.token);
  const patientId = useSelector((state: RootState) => state.auth.patientId);

  if (!patientId) {
    throw new Error("Patient ID is required to fetch resources.");
  }

  const handleFetchSource = async (source: string) => {
    const [resourceType, id] = source.split("/");
    if (!resourceType || !id) return;

    await fetchFHIRResource({
      resourceType,
      patientId: patientId,
      token: token,
      dispatch: () => {},
      setResourceAction: () => {},
      setLoading: () => {},
      setError: () => {},
      onFetched: (resources) => {
        setFetchedSources((prev) => ({
          ...prev,
          [source]: resources[0] || "Not found",
        }));
      },
    });
  };

  const riskData = (result.riskScores || []).map((r: any) => ({
    name: r.label,
    score: r.score === "Low" ? 1 : r.score === "Moderate" ? 2 : 3,
    rawScore: r.score,
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Summary</h3>

      {riskData.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Risk Scores</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={riskData}>
              <XAxis dataKey="name" />
              <YAxis ticks={[1, 2, 3]} domain={[0, 3]} />
              <Tooltip
                formatter={(value: number) =>
                  ["Low", "Moderate", "High"][value - 1]
                }
              />
              <Bar dataKey="score" fill="#4F46E5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {result.recommendedTreatments?.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Recommended Treatments</h4>
          <ul className="list-disc ml-5 space-y-1">
            {result.recommendedTreatments.map((t: any, idx: number) => (
              <li key={idx}>
                {t.treatment}{" "}
                <span className="text-gray-500">({t.condition})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.preventiveMeasures?.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Preventive Measures</h4>
          <ul className="list-disc ml-5 space-y-1">
            {result.preventiveMeasures.map((p: string, idx: number) => (
              <li key={idx}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {result.sources?.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Sources</h4>
          <ul className="space-y-2">
            {result.sources.map((source: string, idx: number) => (
              <li key={idx} className="flex flex-col">
                <button
                  className="btn btn-sm btn-outline w-fit"
                  onClick={() => handleFetchSource(source)}
                >
                  View {source}
                </button>
                {fetchedSources[source] && (
                  <pre className="bg-base-200 p-2 mt-1 text-xs whitespace-pre-wrap rounded">
                    {JSON.stringify(fetchedSources[source], null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
