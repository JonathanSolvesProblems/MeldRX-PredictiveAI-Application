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
  Cell,
} from "recharts";

export function RenderStructuredResult({ result }: { result: any }) {
  const [fetchedSources, setFetchedSources] = useState<Record<string, any>>({});
  const [openSources, setOpenSources] = useState<Record<string, boolean>>({});
  const token = useSelector((state: RootState) => state.auth.token);
  const patientId = useSelector((state: RootState) => state.auth.patientId);

  if (!patientId) {
    throw new Error("Patient ID is required to fetch resources.");
  }

  const toggleSource = async (source: string) => {
    const isOpen = openSources[source];

    if (isOpen) {
      // Just toggle off
      setOpenSources((prev) => ({ ...prev, [source]: false }));
    } else {
      if (!fetchedSources[source]) {
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
            setOpenSources((prev) => ({ ...prev, [source]: true }));
          },
        });
      } else {
        setOpenSources((prev) => ({ ...prev, [source]: true }));
      }
    }
  };

  const riskData = (result.riskScores || []).map((r: any) => ({
    name: r.label,
    score: r.score === "Low" ? 1 : r.score === "Moderate" ? 2 : 3,
    rawScore: r.score,
  }));

  const accuracyPercent = result.accuracy
    ? Math.round(result.accuracy * 100)
    : null;

  return (
    <div className="space-y-6">
      {result.summaryText && (
        <div className="card shadow-md bg-base-100">
          <div className="card-body">
            <h3 className="text-lg font-bold">Summary</h3>
            <p className="text-sm text-gray-700">{result.summaryText}</p>
          </div>
        </div>
      )}

      {accuracyPercent !== null && (
        <div className="card shadow bg-base-200 p-4">
          <h4 className="font-semibold mb-2">Accuracy</h4>
          <ResponsiveContainer width="100%" height={40}>
            <BarChart data={[{ name: "Accuracy", value: accuracyPercent }]}>
              <XAxis dataKey="name" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip formatter={(val: number) => `${val}%`} />
              <Bar dataKey="value" fill="#22c55e">
                <Cell
                  fill={
                    accuracyPercent >= 80
                      ? "#22c55e"
                      : accuracyPercent >= 50
                      ? "#facc15"
                      : "#ef4444"
                  }
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm mt-2">{accuracyPercent}% confidence</p>
        </div>
      )}

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
                  onClick={() => toggleSource(source)}
                >
                  {openSources[source] ? "Hide" : "View"} {source}
                </button>
                {openSources[source] && fetchedSources[source] && (
                  <pre className="bg-base-200 p-2 mt-1 text-xs whitespace-pre-wrap rounded max-h-60 overflow-auto">
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
