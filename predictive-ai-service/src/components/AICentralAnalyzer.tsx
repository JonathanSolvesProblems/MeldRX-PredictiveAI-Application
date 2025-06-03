import React, { useEffect, useRef, useState } from "react";
import { Progress } from "./ui/Progress";
import { Spinner } from "./ui/Spinner";
import { useAIQueue } from "./hooks/useAIQueue";
import { useSelector } from "react-redux";
import { RootState } from "@/app/redux/store";
import { RenderStructuredResult } from "./RenderStructuredResult";
import { RenderTemplatedQnA } from "./RenderTemplatedQnA";
import { fetchLastAnalyzed } from "@/utils/fhirAPICalls";

const PAGE_SIZE = 5;

export default function AICentralAnalyzer() {
  const { analyzeItem } = useAIQueue();
  // console.log("patient data fetched with new dashboard component");
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
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    const loadLastAnalysis = async () => {
      if (!patientId || !token) return;

      const { content, structured } = await fetchLastAnalyzed(token, patientId);

      if (!content && !structured) {
        // Start analyzing by default if no previous analysis found
        await analyzeData();
        return;
      }

      const label = "Patient Summary";
      let result;

      if (structured) {
        result = structured;
      } else if (content) {
        try {
          const maybeParsed = JSON.parse(content);
          const isStructured =
            typeof maybeParsed === "object" &&
            ("riskScores" in maybeParsed ||
              "recommendedTreatments" in maybeParsed ||
              "preventiveMeasures" in maybeParsed ||
              "summaryText" in maybeParsed);

          result = isStructured ? maybeParsed : { content };
        } catch {
          result = { content }; // fallback to plain string Q&A
        }
      }

      if (!result) return;

      setResults({ [label]: [{ result }] });
      setPages({ [label]: 1 });
      setExpanded({ [label]: true });
      setProgressMap({ [label]: 100 });
      setStatus("✅ Loaded previous analysis.");
    };

    loadLastAnalysis();
  }, [patientId, token]);

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

Return your results in JSON format:

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
  "summaryText": "A summary of the overall analysis of the patient's health.",
  "accuracy": 0.9,
  accuracyExplanation: "The AI's confidence in the analysis based on available data.",
  "dashboardViews": [
    {
      "name": "Default Dashboard",
      "created": "2025-06-03T14:00:00Z",
      "lastViewed": "2025-06-03T14:30:00Z"
    }
  ],
  "graphOptions": {
    "HbA1c": {
      "displayAs": "line",
      "trend": true,
      "dataPoints": [
        { "date": "2025-01-01", "value": 6.2 },
        { "date": "2025-03-01", "value": 6.5 },
        { "date": "2025-06-01", "value": 6.4 }
      ]
    }
  },
  "customLayout": {
    "sectionsOrder": [
      "summaryText",
      "riskScores",
      "recommendedTreatments",
      "preventiveMeasures",
      "patientCompliance",
      "sources"
    ],
    "hiddenSections": ["accuracy"]
  },
  "patientCompliance": {
    "medicationsPickedUp": [
      { "medication": "Metformin", "status": "Picked up", "date": "2025-05-25" }
    ],
    "labsCompleted": [
      { "test": "HbA1c", "status": "Completed", "date": "2025-06-01" }
    ],
    "imagingCompleted": [
      { "study": "Chest X-ray", "status": "Pending", "requestedDate": "2025-05-20" }
    ]
  }
}

Be concise and medically accurate. Only use fields that are applicable. Do not invent data. If no data is available, use empty arrays.
        `.trim();
        }
      };

      const maxRetries = 3;
      let attempt = 0;
      let success = false;
      let extractedResult: any;
      let finalContent = "";

      setStatus("Analyzing entire patient context...");

      const hasQuestions = templatedQuestions?.length > 0;

      while (attempt < maxRetries && !success) {
        attempt++;
        console.log(`🔄 Attempt ${attempt} of ${maxRetries}`);

        const res = await analyzeItem(
          "Patient Info",
          null,
          "gpt-4o",
          generatePrompt
        );
        console.log("RES IS ", JSON.stringify(res, null, 2));

        extractedResult = res.result || res;

        let content = extractedResult?.content?.trim?.() ?? "";

        // Strip Markdown if present
        if (content.startsWith("```json")) {
          content = content
            .replace(/^```json/, "")
            .replace(/```$/, "")
            .trim();
        } else if (content.startsWith("```")) {
          content = content.replace(/^```/, "").replace(/```$/, "").trim();
        }

        if (!hasQuestions) {
          try {
            extractedResult = JSON.parse(content);
            finalContent = content;
            success = true;
          } catch (e) {
            console.warn(`❌ Failed to parse JSON on attempt ${attempt}:`, e);
            if (attempt < maxRetries) {
              setStatus(
                `Invalid JSON received (attempt ${attempt}). Retrying...`
              );
              await new Promise((res) => setTimeout(res, 1000));
            }
          }
        } else {
          // Accept response if it's non-empty and seems like a reasonable answer
          if (content.length > 50) {
            extractedResult.content = content;
            success = true;
          } else {
            console.warn(
              `❌ Incomplete or invalid Q&A response on attempt ${attempt}`
            );
            if (attempt < maxRetries) {
              setStatus(
                `Incomplete answer received (attempt ${attempt}). Retrying...`
              );
              await new Promise((res) => setTimeout(res, 1000));
            }
          }
        }
      }

      if (!success) {
        setError("❌ The AI returned invalid JSON after 3 attempts.");
        return;
      }

      const label = "Patient Summary";
      console.log("✅ Extracted result:", extractedResult);

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

  useEffect(() => {
    console.log("Results updated:", results);
  }, [results]);

  return (
    <div className="p-6 max-h-screen overflow-y-auto">
      {/* <h1 className="text-3xl font-bold mb-4">Dashboard</h1> */}

      <div className="bg-base-200 p-4 rounded-lg mb-6">
        <p className="text-md mb-2">
          Click the{" "}
          <span className="font-semibold">"Analyze Patient Data"</span> button
          below to re-analyze the patient's data. It will appear when the
          patient's data is not being analyzed.
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
        <div className="mt-8 pb-6 flex justify-center">
          <button
            className="btn btn-primary text-white shadow-lg hover:shadow-xl transition duration-200 rounded-lg px-6 py-2"
            onClick={analyzeData}
          >
            Analyze Patient Data
          </button>
        </div>
      )}

      {!isRunning &&
        Object.entries(results).map(([type, entries]) => (
          <div key={type} className="mb-4 border rounded p-3 shadow">
            <h2 className="text-lg font-semibold mb-2">{type}</h2>

            {entries.map((entry, i) => {
              const res = entry.result;
              console.log("Structured result passed:", res);

              const isStructured =
                res &&
                typeof res === "object" &&
                !Array.isArray(res) &&
                ("riskScores" in res ||
                  "recommendedTreatments" in res ||
                  "preventiveMeasures" in res ||
                  "summaryText" in res);

              console.log("Is structured result:", isStructured);

              const isQnA =
                typeof res === "string" || typeof res?.content === "string";

              return (
                <div
                  key={i}
                  className="my-4 p-4 rounded-lg shadow bg-base-100 border"
                >
                  {isStructured ? (
                    <RenderStructuredResult result={res} />
                  ) : isQnA ? (
                    <RenderTemplatedQnA content={res?.content || res} />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm">
                      {res?.content
                        ? res.content
                        : res
                        ? JSON.stringify(res, null, 2)
                        : `❌ ${entry.error}`}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}
