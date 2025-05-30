import React, { useState } from "react";
import { fetchFHIRResource } from "@/utils/fhirAPICalls";
import { useSelector } from "react-redux";
import { RootState } from "@/app/redux/store";
import { PDFDownloadLink } from "@react-pdf/renderer";
import AnalysisPDF from "./AnalysisPDF";

export const RenderTemplatedQnA = ({ content }: { content: string }) => {
  const token = useSelector((state: RootState) => state.auth.token);
  const patientId = useSelector((state: RootState) => state.auth.patientId);
  const [fetched, setFetched] = useState<Record<string, any>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const extractResources = (text: string) =>
    [...text.matchAll(/([A-Za-z]+\/[a-z0-9\-]+)/g)].map((m) => m[1]);

  const handleToggleFetch = async (ref: string) => {
    setExpanded((prev) => ({ ...prev, [ref]: !prev[ref] }));

    if (!expanded[ref]) {
      const [resourceType, id] = ref.split("/");
      if (!resourceType || !id || !patientId) return;

      await fetchFHIRResource({
        resourceType,
        patientId,
        token,
        dispatch: () => {},
        setResourceAction: () => {},
        setLoading: () => {},
        setError: () => {},
        onFetched: (resources) => {
          setFetched((prev) => ({
            ...prev,
            [ref]: resources[0] || "Not found",
          }));
        },
      });
    }
  };

  const parseQA = (text: string) => {
    return text.split("\n").reduce((acc, line) => {
      if (line.startsWith("###")) {
        acc.push({ question: line.replace(/^###\s*/, ""), answer: "" });
      } else if (acc.length > 0) {
        acc[acc.length - 1].answer +=
          (acc[acc.length - 1].answer ? "\n" : "") + line;
      }
      return acc;
    }, [] as { question: string; answer: string }[]);
  };

  const qaList = parseQA(content);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <PDFDownloadLink
          document={<AnalysisPDF content={content} />}
          fileName="analysis-summary.pdf"
          className="btn btn-outline btn-sm"
        >
          Download PDF
        </PDFDownloadLink>
      </div>

      {qaList.map(({ question, answer }, idx) => {
        const resources = extractResources(answer);
        const cleanAnswer = answer
          .replace(/\[([A-Za-z]+\/[a-z0-9\-]+)\]/g, "")
          .trim();

        return (
          <div key={idx} className="card bg-base-100 shadow p-4 space-y-2">
            <h3 className="text-lg font-semibold">
              {idx + 1}) {question}
            </h3>
            <p className="whitespace-pre-wrap">{cleanAnswer}</p>

            {resources.map((ref) => (
              <div key={ref} className="mt-2">
                <button
                  onClick={() => handleToggleFetch(ref)}
                  className="btn btn-xs btn-outline"
                >
                  {expanded[ref] ? "Hide" : "View"} {ref}
                </button>
                {expanded[ref] && fetched[ref] && (
                  <pre className="bg-base-200 mt-2 p-2 rounded text-xs whitespace-pre-wrap">
                    {JSON.stringify(fetched[ref], null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
