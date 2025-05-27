import React, { useRef, useState } from "react";
import { Progress } from "./ui/Progress";
import { Card, CardContent } from "./ui/CardContent";
import { Spinner } from "./ui/Spinner";
import { useAIQueue } from "./hooks/useAIQueue";
import { useAllPatientData } from "./hooks/useAllPatientData";
import { useSelector } from "react-redux";
import { RootState } from "@/app/redux/store";

const PAGE_SIZE = 5;

export default function Dashboard() {
  const { analyzeItem } = useAIQueue();
  const { allResources, totalCount } = useAllPatientData(); // TODO: May want to refactor, since this is fetching doc data too.
  console.log("patient data fetched with new dashboard component");
  const patientId = useSelector((state: RootState) => state.auth.patientId);

  const [status, setStatus] = useState("");
  const [results, setResults] = useState<Record<string, any[]>>({});
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pages, setPages] = useState<Record<string, number>>({});
  const [isRunning, setIsRunning] = useState(false);
  const cancelRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const templatedQuestions = useSelector(
    (state: RootState) => state.questions.questions
  );

  const analyzeData = async () => {
    cancelRef.current = false;
    setIsRunning(true);
    setStatus("Initializing...");

    try {
      const generatePrompt = (): string => {
        const questionBlock = templatedQuestions?.length
          ? `\n\nAdditional user-provided questions to guide your analysis:\n- ${templatedQuestions.join(
              "\n- "
            )}`
          : "";

        return `
            Analyze the patient's complete medical history using all available FHIR data.${
              patientId ? ` Their patient ID is ${patientId}.` : ""
            }

            Your response should:
            - Identify important diagnoses, treatments, and lab results.
            - Answer any templated or user-defined questions provided.
            - Cite each FHIR resource type (e.g., Condition, Observation, MedicationRequest) you used to support your conclusions.
            - Where possible, include direct references like resource IDs or filenames (e.g., DocumentReference/abc123).

            Be concise, medically accurate, and clearly structure the findings.

            ${questionBlock}
            `.trim();
      };

      // const prompt = () => `
      //   Use a tool to retrieve the following FHIR resource DocumentReference with id 0bb73ae5-6670-46df-80e1-e4613f30b032.
      // `;

      console.log("generated Promot is ", generatePrompt);

      setStatus("Analyzing entire patient context...");
      const res = await analyzeItem(
        "Patient Info",
        null,
        "gpt-4o",
        generatePrompt
      );

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
    <div className="p-6 max-h-screen overflow-y-auto">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>

      <div className="bg-base-200 p-4 rounded-lg mb-6">
        <p className="text-md mb-2">
          Click the{" "}
          <span className="font-semibold">"Analyze Patient Data"</span> button
          below to begin reviewing the patient's full medical history.
        </p>
        <p className="text-md">
          <span className="font-semibold">Optional:</span> You can also import
          templated questions from an Excel file first to tailor the analysis to
          your specific needs.
        </p>
      </div>

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

      {!isRunning && (
        <div className="mt-6 flex justify-center">
          <button className="btn btn-primary text-white" onClick={analyzeData}>
            Analyze Patient Data
          </button>
        </div>
      )}
    </div>
  );
}
