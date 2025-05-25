import React, { useEffect, useRef, useState } from "react";
import { Progress } from "./ui/Progress";
import { Card, CardContent } from "./ui/CardContent";
import { Spinner } from "./ui/Spinner";
import { useAIQueue } from "./hooks/useAIQueue";
import { useAllPatientData } from "./hooks/useAllPatientData";
import { useSelector } from "react-redux";
import { RootState } from "@reduxjs/toolkit/query";

const PAGE_SIZE = 5;

export default function Dashboard() {
  const { analyzeItem } = useAIQueue();
  const { allResources, totalCount } = useAllPatientData();
  console.log("patient data fetched with new dashboard component");

  const [status, setStatus] = useState("");
  const [results, setResults] = useState<Record<string, any[]>>({});
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pages, setPages] = useState<Record<string, number>>({});
  const [isRunning, setIsRunning] = useState(true);
  const cancelRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const patientId = useSelector((state: any) => state.auth.patientId);

  const analyzeData = async () => {
    cancelRef.current = false;
    setIsRunning(true);
    setStatus("Initializing...");

    try {
      const prompt = () => `
    Analyze this patient's medical history using all available FHIR data. Their patient ID is ${patientId}
    List any important diagnoses, treatments, and lab results.
    Include which files or resources you used to reach these conclusions, with references the user can follow.
    Note that you should already have access to the patient's data, as the model context protocol is configured, so you do not need to ask for any additional information.
    `;

      console.log(prompt);

      setStatus("Analyzing entire patient context...");
      const res = await analyzeItem("Patient Info", null, prompt);

      setResults({ MCP: [{ result: res.result || res }] });
      setPages({ MCP: 1 });
      setExpanded({ MCP: true });
      setProgressMap({ MCP: 100 });
    } catch (err: any) {
      const errorMessage = `Unexpected error: ${err.message || err}`;
      setError(errorMessage);
      setResults({ MCP: [{ error: errorMessage }] });
    }

    setStatus("Analysis completed.");
    setIsRunning(false);
  };

  useEffect(() => {
    analyzeData();
  }, []);

  const toggleExpand = (type: string) =>
    setExpanded((prev) => ({ ...prev, [type]: !prev[type] }));

  const nextPage = (type: string) =>
    setPages((prev) => ({ ...prev, [type]: (prev[type] || 1) + 1 }));

  const prevPage = (type: string) =>
    setPages((prev) => ({
      ...prev,
      [type]: Math.max(1, (prev[type] || 1) - 1),
    }));

  const cancelAnalysis = () => {
    cancelRef.current = true;
    setStatus("Analysis cancelled.");
    setIsRunning(false);
  };

  return (
    <div className="p-4 max-h-screen overflow-y-auto">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">{status}</p>
        {isRunning && (
          <button className="btn btn-error text-white" onClick={cancelAnalysis}>
            Cancel
          </button>
        )}
      </div>

      {Object.entries(results).map(([type, entries]) => {
        const page = pages[type] || 1;
        const start = (page - 1) * PAGE_SIZE;
        const currentPageEntries = entries.slice(start, start + PAGE_SIZE);

        return (
          <div key={type} className="mb-4 border rounded p-3 shadow">
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleExpand(type)}
            >
              <h2 className="text-lg font-semibold">{type}</h2>
              <Progress value={progressMap[type] || 0} className="w-1/2 h-2" />
            </div>

            {expanded[type] && (
              <>
                {entries.some((e) => e.error) && (
                  <div className="mb-2 text-red-600 text-sm font-medium">
                    ⚠️ {entries.filter((e) => e.error).length} error
                    {entries.filter((e) => e.error).length > 1
                      ? "s"
                      : ""} in {type}
                  </div>
                )}

                {currentPageEntries.map((entry, i) => (
                  <Card key={i} className="my-2">
                    <CardContent>
                      <pre className="whitespace-pre-wrap text-sm">
                        {entry.result
                          ? JSON.stringify(entry.result, null, 2)
                          : `❌ ${entry.error}`}
                      </pre>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex gap-2 mt-2 justify-end">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => prevPage(type)}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => nextPage(type)}
                    disabled={page * PAGE_SIZE >= entries.length}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}

      {isRunning && <Spinner />}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
