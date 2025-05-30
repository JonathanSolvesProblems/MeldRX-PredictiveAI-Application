import { RootState } from "@/app/redux/store";
import { fetchFHIRResource } from "@/utils/fhirAPICalls";
import { PDFDownloadLink } from "@react-pdf/renderer";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import AnalysisPDF from "./AnalysisPDF";
import { formatResultForPDF } from "@/utils/helper";
import { updateLastAnalyzed } from "@/utils/serverAPICalls";

export function RenderStructuredResult({ result }: { result: any }) {
  const [fetchedSources, setFetchedSources] = useState<Record<string, any>>({});
  const [openSources, setOpenSources] = useState<Record<string, boolean>>({});
  const token = useSelector((state: RootState) => state.auth.token);
  const patientId = useSelector((state: RootState) => state.auth.patientId);
  const contentRef = useRef<HTMLDivElement>(null);

  if (!patientId) throw new Error("Patient ID is required to fetch resources.");

  const toggleSource = async (source: string) => {
    const isOpen = openSources[source];
    if (isOpen) {
      setOpenSources((prev) => ({ ...prev, [source]: false }));
    } else {
      if (!fetchedSources[source]) {
        const [resourceType, id] = source.split("/");
        if (!resourceType || !id) return;
        await fetchFHIRResource({
          resourceType,
          patientId,
          token,
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

  const accuracyPercent = result.accuracy
    ? Math.round(result.accuracy * 100)
    : null;

  const getAccuracyColor = (value: number) => {
    if (value >= 80) return "#22c55e"; // green
    if (value >= 50) return "#facc15"; // yellow
    return "#ef4444"; // red
  };

  const riskData = (result.riskScores || []).map((r: any) => ({
    name: r.label,
    score: r.score === "Low" ? 1 : r.score === "Moderate" ? 2 : 3,
    rawScore: r.score,
  }));

  const getRiskColor = (score: number) => {
    if (score === 1) return "#22c55e";
    if (score === 2) return "#facc15";
    return "#ef4444";
  };

  useEffect(() => {
    if (patientId && token && result) {
      const analysisString = JSON.stringify(result);
      updateLastAnalyzed(patientId, token, analysisString);
    }
  }, [patientId, token, result]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <PDFDownloadLink
          document={<AnalysisPDF content={formatResultForPDF(result)} />}
          fileName="analysis-summary.pdf"
          className="btn btn-outline btn-sm"
        >
          Download PDF
        </PDFDownloadLink>
      </div>

      <div ref={contentRef} className="space-y-6">
        {result.summaryText && (
          <div className="card shadow-md bg-base-100">
            <div className="card-body">
              <h3 className="text-lg font-bold text-white">Summary</h3>
              <p className="text-sm text-white">{result.summaryText}</p>
            </div>
          </div>
        )}

        {accuracyPercent !== null && (
          <div className="card shadow bg-base-100 p-4">
            <h4 className="font-semibold text-white mb-2">Accuracy</h4>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={[
                      { name: "Confidence", value: accuracyPercent },
                      { name: "Remaining", value: 100 - accuracyPercent },
                    ]}
                    innerRadius={30}
                    outerRadius={40}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <Cell fill={getAccuracyColor(accuracyPercent)} />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <span className="text-white text-lg font-bold ml-4">
                {accuracyPercent}%
              </span>
            </div>
            {result.accuracyExplanation && (
              <p className="text-white text-sm mt-2">
                {result.accuracyExplanation}
              </p>
            )}
          </div>
        )}

        {riskData.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 text-white">Risk Scores</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={riskData}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "white" }}
                  axisLine={{ stroke: "#ccc" }}
                />
                <YAxis
                  ticks={[1, 2, 3]}
                  domain={[0, 3]}
                  tick={{ fill: "white" }}
                  axisLine={{ stroke: "#ccc" }}
                />
                <Tooltip
                  formatter={(value: number) =>
                    ["Low", "Moderate", "High"][value - 1]
                  }
                />
                <Bar dataKey="score">
                  {riskData.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getRiskColor(entry.score)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {result.recommendedTreatments?.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 text-white">
              Recommended Treatments
            </h4>
            <ul className="list-disc ml-5 space-y-1 text-white">
              {result.recommendedTreatments.map((t: any, idx: number) => (
                <li key={idx}>
                  {t.treatment}{" "}
                  <span className="text-gray-400">({t.condition})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.preventiveMeasures?.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 text-white">
              Preventive Measures
            </h4>
            <ul className="list-disc ml-5 space-y-1 text-white">
              {result.preventiveMeasures.map((p: string, idx: number) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {result.sources?.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 text-white">Sources</h4>
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
                    <pre className="bg-base-200 p-2 mt-1 text-xs whitespace-pre-wrap rounded max-h-60 overflow-auto text-white">
                      {JSON.stringify(fetchedSources[source], null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
