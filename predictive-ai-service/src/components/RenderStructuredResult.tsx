"use client";

import { RootState } from "@/app/redux/store";
import { fetchFHIRResource } from "@/utils/fhirAPICalls";
import { PDFDownloadLink } from "@react-pdf/renderer";
import React, { JSX, useEffect, useRef, useState } from "react";
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
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import AnalysisPDF from "./AnalysisPDF";
import { formatResultForPDF } from "@/utils/helper";
import { updateLastAnalyzed } from "@/utils/serverAPICalls";

const getAccuracyColor = (value: number) => {
  if (value >= 80) return "#22c55e"; // green
  if (value >= 50) return "#facc15"; // yellow
  return "#ef4444"; // red
};

const getRiskColor = (score: number) => {
  if (score === 1) return "#22c55e";
  if (score === 2) return "#facc15";
  return "#ef4444";
};

const complianceColors: Record<string, string> = {
  Complete: "#22c55e",
  Pending: "#facc15",
  Overdue: "#ef4444",
};

const buildComplianceData = (complianceObj: any) => {
  if (!complianceObj) return [];
  const summary: Record<string, number> = {
    Complete: 0,
    Pending: 0,
    Overdue: 0,
  };

  ["medicationsPickedUp", "labsCompleted", "imagingCompleted"].forEach(
    (key) => {
      (complianceObj[key] ?? []).forEach((item: any) => {
        summary[item.status] = (summary[item.status] || 0) + 1;
      });
    }
  );

  return Object.entries(summary).map(([name, value]) => ({ name, value }));
};

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
      return;
    }

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
  };

  const accuracyPercent = result.accuracy
    ? Math.round(result.accuracy * 100)
    : null;

  const riskData = (result.riskScores || []).map((r: any) => ({
    name: r.label,
    score: r.score === "Low" ? 1 : r.score === "Moderate" ? 2 : 3,
  }));

  useEffect(() => {
    if (patientId && token && result) {
      updateLastAnalyzed(patientId, token, JSON.stringify(result));
    }
  }, [patientId, token, result]);

  const defaultOrder = [
    "summaryText",
    "accuracy",
    "riskScores",
    "recommendedTreatments",
    "preventiveMeasures",
    "patientCompliance",
    "graphOptions",
    "sources",
  ];

  const sectionsOrder: string[] = result?.customLayout?.sectionsOrder?.length
    ? result.customLayout.sectionsOrder
    : defaultOrder;

  const hidden = new Set(result?.customLayout?.hiddenSections ?? []);

  const sectionMap: Record<string, JSX.Element | null> = {
    summaryText: result.summaryText ? (
      <div className="card shadow-md bg-base-100">
        <div className="card-body">
          <h3 className="text-lg font-bold text-white">Summary</h3>
          <p className="text-sm text-white">{result.summaryText}</p>
        </div>
      </div>
    ) : null,

    accuracy:
      accuracyPercent !== null ? (
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
      ) : null,

    riskScores:
      riskData.length > 0 ? (
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
                {riskData.map((entry: any, idx: number) => (
                  <Cell key={idx} fill={getRiskColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null,

    recommendedTreatments: result.recommendedTreatments?.length ? (
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
    ) : null,

    preventiveMeasures: result.preventiveMeasures?.length ? (
      <div>
        <h4 className="font-semibold mb-2 text-white">Preventive Measures</h4>
        <ul className="list-disc ml-5 space-y-1 text-white">
          {result.preventiveMeasures.map((p: string, idx: number) => (
            <li key={idx}>{p}</li>
          ))}
        </ul>
      </div>
    ) : null,

    patientCompliance: buildComplianceData(result.patientCompliance).length ? (
      <div>
        <h4 className="font-semibold mb-2 text-white">Compliance</h4>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={buildComplianceData(result.patientCompliance)}
              dataKey="value"
              nameKey="name"
              outerRadius={70}
              label
            >
              {Object.keys(complianceColors).map((status, idx) => (
                <Cell key={idx} fill={complianceColors[status]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    ) : null,

    graphOptions: result.graphOptions ? (
      <>
        {Object.entries(result.graphOptions).map(([label, opt]: any, idx) => {
          if (opt.displayAs !== "line" || !opt.trend) return null;
          return (
            <div key={idx} className="space-y-2">
              <h4 className="font-semibold mb-2 text-white">{label}</h4>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={opt.dataPoints}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: "white" }} />
                  <YAxis tick={{ fill: "white" }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </>
    ) : null,

    sources: result.sources?.length ? (
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
    ) : null,
  };

  return (
    <div className="space-y-6">
      {/* PDF download button */}
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
        {sectionsOrder
          .filter((key) => !hidden.has(key))
          .map((key) => sectionMap[key])
          .filter(Boolean)}
      </div>
    </div>
  );
}
