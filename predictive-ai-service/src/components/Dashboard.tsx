import React, { useRef, useState } from "react";
import { Progress } from "./ui/Progress";
import { Spinner } from "./ui/Spinner";
import { useAIQueue } from "./hooks/useAIQueue";
import { useSelector } from "react-redux";
import { RootState } from "@/app/redux/store";
import { RenderStructuredResult } from "./RenderStructuredResult";
import { RenderTemplatedQnA } from "./RenderTemplatedQnA";

const PAGE_SIZE = 5;

export default function Dashboard() {
  const { analyzeItem } = useAIQueue();
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
      const generatePrompt = (item: any): string => {
        const hasQuestions = templatedQuestions?.length > 0;

        if (hasQuestions) {
          return `
        Analyze the patient's complete medical history using all available FHIR data.${
          patientId ? ` Their patient ID is ${patientId}.` : ""
        }

        Focus exclusively on answering the following user-provided questions. For each question:
        - Restate the question as a heading.
        - Provide a medically accurate and concise answer.
        - If you did not find the answer, say "No relevant data found."
        - Clearly cite the FHIR resources used to support your answer (e.g., Condition/abc123).

        Questions:
        - ${templatedQuestions.join("\n- ")}
        `.trim();
        } else {
          return `
        Analyze the patient's complete medical history using all available FHIR data.${
          patientId ? ` Their patient ID is ${patientId}.` : ""
        }

        Return your results **strictly in JSON format**. Do not add any explanation or commentary.

        {
          "riskScores": [
            { "label": "Cardiovascular Risk", "score": "Moderate" },
            { "label": "Diabetes Risk", "score": "Low" }
          ],
          "recommendedTreatments": [
            { "treatment": "Metformin", "condition": "Type 2 Diabetes" },
            { "treatment": "Lifestyle changes", "condition": "Obesity" }
          ],
          "preventiveMeasures": [
            "Annual flu vaccination",
            "Blood pressure check every 6 months"
          ],
          "sources": [
            "Condition/abc123",
            "Observation/def456",
            "DocumentReference/file789"
          ],
          "summaryText": "A summary of the overall analysis of the patient's health."
        }

        Be concise and medically accurate. Only use fields that are applicable. Do not invent data. If no data is available, use empty arrays.
        `.trim();
        }
      };

      // "accuracy": [0-1], // A value between 0 and 1 representing the model's confidence in its response, where 1 is highly accurate.

      // const prompt = () => `
      //   Use a tool to retrieve the following FHIR resource DocumentReference with id 0bb73ae5-6670-46df-80e1-e4613f30b032.
      // `;

      console.log("generated Promot is ", generatePrompt("debug"));

      setStatus("Analyzing entire patient context...");
      const res = await analyzeItem(
        "Patient Info",
        null,
        "gpt-4o",
        generatePrompt
      );

      console.log("RES IS ", JSON.stringify(res, null, 2));

      const label = "Patient Summary";
      const hasQuestions = templatedQuestions?.length > 0;
      let extractedResult = res.result || res;

      if (!hasQuestions) {
        try {
          // Try to extract JSON if it's embedded in a string
          if (typeof extractedResult === "string") {
            const jsonMatch = extractedResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              extractedResult = JSON.parse(jsonMatch[0]);
            }
          }
        } catch (e) {
          console.warn("Failed to parse JSON output:", e);
          setError("The AI did not return valid JSON.");
          return;
        }
      }

      setResults({ [label]: [{ result: extractedResult }] });

      setPages({ [label]: 1 });
      setExpanded({ [label]: true });
      setProgressMap({ [label]: 100 });
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
          below to begin reviewing the patient's medical history.
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

      {isRunning && <Spinner />}
      {error && <p className="text-red-500">{error}</p>}

      {!isRunning && (
        <div className="mt-6 flex justify-center">
          <button className="btn btn-primary text-white" onClick={analyzeData}>
            Analyze Patient Data
          </button>
        </div>
      )}

      {!isRunning &&
        Object.entries(results).map(([type, entries]) => (
          <div key={type} className="mb-4 border rounded p-3 shadow">
            <h2 className="text-lg font-semibold mb-2">{type}</h2>

            {entries.map((entry, i) => (
              <div
                key={i}
                className="my-4 p-4 rounded-lg shadow bg-base-100 border"
              >
                {entry.result &&
                typeof entry.result === "object" &&
                !templatedQuestions.length &&
                (entry.result.riskScores ||
                  entry.result.recommendedTreatments ||
                  entry.result.preventiveMeasures) ? (
                  <RenderStructuredResult result={entry.result} />
                ) : templatedQuestions.length ? (
                  <RenderTemplatedQnA
                    content={entry.result?.content || entry.result}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm">
                    {entry.result?.content
                      ? entry.result.content
                      : entry.result
                      ? JSON.stringify(entry.result, null, 2)
                      : `❌ ${entry.error}`}
                  </pre>
                )}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
