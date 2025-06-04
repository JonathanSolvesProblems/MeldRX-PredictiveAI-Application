"use client";

import React, { useState } from "react";
import { RootState } from "@/app/redux/store";
import { useSelector, useDispatch } from "react-redux";
import { addAnalysis } from "@/app/redux/analysisSlice";
import { PDFDownloadLink } from "@react-pdf/renderer";
import AnalysisPDF from "./AnalysisPDF";
import { useAIQueue } from "./hooks/useAIQueue";
import { useAllPatientData } from "./hooks/useAllPatientData";

type DocumentReference = {
  id: string;
  type?: { text?: string };
  date?: string;
  content?: Array<{
    attachment?: { data?: string; contentType?: string; url?: string };
  }>;
};

export const DocumentWheel: React.FC = () => {
  useAllPatientData();
  const documents = useSelector(
    (state: RootState) => state.documents.documents
  );
  const token = useSelector((state: RootState) => state.auth.token);
  const dispatch = useDispatch();

  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<
    Record<string, string>
  >({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [docContentCache, setDocContentCache] = useState<
    Record<string, { content: string; contentType: string }>
  >({});
  const [docContent, setDocContent] = useState<string | null>(null);
  const [docContentType, setDocContentType] = useState<string | null>(null);
  const [showContentModal, setShowContentModal] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const templatedQuestions = useSelector(
    (state: RootState) => state.questions.questions
  );
  const [activeDoc, setActiveDoc] = useState<DocumentReference | null>(null);

  const { analyzeItem } = useAIQueue();

  const fetchAndShowDocument = async (doc: DocumentReference) => {
    setDocLoading(true);
    try {
      const res = await fetch("/api/getDocumentContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: doc, token }),
      });

      if (!res.ok) throw new Error(await res.text());

      const { content, contentType } = await res.json();
      setDocContent(content);
      setDocContentType(contentType);
      setDocContentCache((prev) => ({
        ...prev,
        [doc.id]: { content, contentType },
      }));
      setActiveDoc(doc);
      setShowContentModal(true);
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        [doc.id]: `Error fetching document: ${err.message}`,
      }));
    } finally {
      setDocLoading(false);
    }
  };

  const handleAnalyze = async (doc: DocumentReference) => {
    setLoadingDocId(doc.id);
    setErrors((prev) => ({ ...prev, [doc.id]: null }));

    try {
      const res = await analyzeItem(
        "DocumentReference",
        doc,
        "Llama-3.2-11B-Vision-Instruct",
        (doc) => {
          const cached = docContentCache[doc.id];
          const docContent = cached ? cached.content : JSON.stringify(doc);

          return `You are a clinical documentation analyst AI. Your goal is to extract **accurate, clinically relevant observations** from the document content provided below. This content may include structured clinical text, scanned physician notes, or medical diagnostic images (e.g., X-rays, CT scans).

If the document includes or refers to an image (e.g., a base64-encoded image, DICOM link, or image URL), treat it as a diagnostic image. In such cases, **analyze the visual content carefully** and describe only what is visible in the image — such as fractures, dislocations, soft tissue abnormalities, or implants. Do not infer or assume anything that cannot be directly observed.

When analyzing textual content, summarize key clinical information such as diagnoses, procedures, findings, and history — but do **not** invent or generalize beyond what the document states.

Document content:
--------------------
${docContent}

${
  templatedQuestions.length > 0
    ? `
Now, answer the following questions **strictly based on the document above**. If a question cannot be answered with high confidence from the document content, respond with: "No relevant information found."

Questions:
${templatedQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}
`
    : ""
}
`;
        },
        async (doc) => {
          const cached = docContentCache[doc.id];
          if (cached) return cached;

          const fetchRes = await fetch("/api/getDocumentContent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ document: doc, token }),
          });

          if (!fetchRes.ok) throw new Error(await fetchRes.text());

          const { content, contentType } = await fetchRes.json();
          setDocContentCache((prev) => ({
            ...prev,
            [doc.id]: { content, contentType },
          }));
          return { content, contentType };
        }
      );

      const extracted =
        typeof res === "string"
          ? res
          : res?.content ||
            res?.result?.content ||
            JSON.stringify(res, null, 2);

      dispatch(addAnalysis({ documentId: doc.id, result: extracted }));
      setAnalysisResults((prev) => ({ ...prev, [doc.id]: extracted }));
    } catch (err: any) {
      console.error("Failed to analyze document:", err);
      setErrors((prev) => ({
        ...prev,
        [doc.id]: `Analysis failed: ${err.message}`,
      }));
    } finally {
      setLoadingDocId(null);
    }
  };

  const handleCreateTemplateQuestion = async (doc: DocumentReference) => {
    try {
      const result = await analyzeItem(
        "DocumentReference",
        doc,
        "Llama-3.2-11B-Vision-Instruct",
        (doc) => {
          // Use cached content if available, else stringify doc as fallback
          const cached = docContentCache[doc.id];
          const docContent = cached ? cached.content : JSON.stringify(doc);

          return `You are a clinical question generation assistant. Based on the following medical document, generate **one clinically relevant question** that can be used to assess understanding or extract further insight from the document. 

The question should be specific, unambiguous, and answerable solely using the document's content.

Document:
--------------------
${docContent}

Return only the question.`;
        },
        // No fetching here — just use cached content or throw error if missing
        (doc) => {
          const cached = docContentCache[doc.id];
          if (cached) return Promise.resolve(cached);
          return Promise.reject(new Error("Document content not cached"));
        }
      );

      const question =
        typeof result === "string"
          ? result.trim()
          : result?.content?.trim() || result?.result?.content?.trim() || null;

      if (question) {
        dispatch({
          type: "questions/addQuestion", // Make sure this action exists in your slice
          payload: question,
        });
      } else {
        console.warn("No question was generated.");
      }
    } catch (err) {
      console.error("Failed to generate template question:", err);
    }
  };

  if (!documents || documents.length === 0) {
    return <div className="text-center text-gray-500">No documents found.</div>;
  }

  return (
    <div className="overflow-x-auto py-6 px-4 space-y-6">
      <div className="flex flex-wrap gap-4 justify-start">
        {documents.map((doc) => {
          const attachment = doc.content?.[0]?.attachment;
          const analysis = analysisResults[doc.id];
          const error = errors[doc.id];

          return (
            <div
              key={doc.id}
              className="card w-96 bg-base-100 shadow-md border border-base-300"
            >
              <div className="card-body space-y-3">
                <h2 className="card-title text-lg">
                  {doc.type?.text ||
                    doc.description ||
                    attachment?.contentType ||
                    "Unknown Type"}
                </h2>
                <p className="text-sm text-gray-500">
                  Date:{" "}
                  {doc.date ? new Date(doc.date).toLocaleDateString() : "N/A"}
                </p>

                {loadingDocId === doc.id ? (
                  <div className="flex justify-center py-4">
                    <span className="loading loading-spinner text-primary"></span>
                  </div>
                ) : (
                  <div className="card-actions justify-end gap-2">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => fetchAndShowDocument(doc)}
                    >
                      View Content
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleAnalyze(doc)}
                    >
                      Analyze
                    </button>
                  </div>
                )}

                {analysis && (
                  <div className="bg-base-200 rounded-md p-3 max-h-40 overflow-y-auto text-sm whitespace-pre-wrap">
                    {templatedQuestions.length > 0 ? (
                      templatedQuestions.map((q, idx) => {
                        const lines = analysis.split("\n").filter(Boolean);
                        return (
                          <div key={idx} className="mb-1">
                            <strong className="text-gray-700">Q: {q}</strong>
                            <p className="ml-2">
                              A: {lines[idx] || "No answer found."}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <pre>{analysis}</pre>
                    )}
                    <div className="flex justify-end mt-2">
                      <PDFDownloadLink
                        document={<AnalysisPDF content={analysis} />}
                        fileName={`analysis-${doc.id}.pdf`}
                        className="btn btn-sm btn-outline"
                      >
                        Download PDF
                      </PDFDownloadLink>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="alert alert-error text-sm">{error}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showContentModal && docContent && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-3">Document Content</h3>
            <div className="max-h-[65vh] overflow-y-auto mb-4">
              {docContent.startsWith("data:image/") ? (
                <img
                  src={docContent}
                  alt="Document Image"
                  className="rounded w-full"
                />
              ) : docContentType?.includes("xml") ? (
                (() => {
                  try {
                    const base64Match = docContent.match(
                      /^data:.*;base64,(.*)$/
                    );
                    const decoded = base64Match
                      ? atob(base64Match[1])
                      : docContent;
                    const parser = new DOMParser();
                    const xml = parser.parseFromString(
                      decoded,
                      "application/xml"
                    );
                    const paragraph = xml.querySelector("paragraph");
                    return paragraph ? (
                      <p>{paragraph.textContent}</p>
                    ) : (
                      <pre>{decoded}</pre>
                    );
                  } catch {
                    return <pre>{docContent}</pre>;
                  }
                })()
              ) : (
                <pre className="bg-base-200 p-3 rounded text-sm whitespace-pre-wrap">
                  {docContent}
                </pre>
              )}
            </div>
            <div className="modal-action flex justify-between items-center">
              <button
                className="btn btn-secondary"
                onClick={() =>
                  handleCreateTemplateQuestion(activeDoc as DocumentReference)
                }
              >
                Generate Template Question
              </button>

              <button
                className="btn"
                onClick={() => setShowContentModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};
