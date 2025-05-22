"use client";

import React, { useState } from "react";
import { RootState } from "@/app/redux/store";
import { useSelector, useDispatch } from "react-redux";
import { addAnalysis } from "@/app/redux/analysisSlice";
import { PDFDownloadLink } from "@react-pdf/renderer";
import AnalysisPDF from "./AnalysisPDF";
import { useAIQueue } from "./hooks/useAIQueue";

type DocumentReference = {
  id: string;
  type?: { text?: string };
  date?: string;
  content?: Array<{
    attachment?: { data?: string; contentType?: string; url?: string };
  }>;
};

export const DocumentWheel: React.FC = () => {
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
  const [templatedQuestions, setTemplatedQuestions] = useState<string[]>([]);
  const [docContentCache, setDocContentCache] = useState<
    Record<string, { content: string; contentType: string }>
  >({});
  const [docContent, setDocContent] = useState<string | null>(null);
  const [docContentType, setDocContentType] = useState<string | null>(null);
  const [showContentModal, setShowContentModal] = useState(false);
  const [docLoading, setDocLoading] = useState(false);

  const { analyzeItem } = useAIQueue();

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed))
        throw new Error("Invalid format: JSON must be an array of strings");
      setTemplatedQuestions(parsed);
      alert("Templated questions loaded!");
    } catch (e) {
      alert("Failed to load questions: " + (e as Error).message);
    }
  };

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
        (doc) => {
          const cached = docContentCache[doc.id];
          return `You are a clinical documentation analyst AI. Carefully review the provided medical document content below. Focus only on the clinical or diagnostic information, not on metadata or formatting.

          Document content:
          --------------------
          ${cached ? cached.content : JSON.stringify(doc)}

          ${
            templatedQuestions.length > 0
              ? `
          
          Answer the following questions based strictly on the document content above. If any question cannot be answered from the document, say "No relevant information found."
          
          Questions:
          ${templatedQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}
          `
              : ""
          }`;
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

  if (!documents || documents.length === 0) {
    return <div className="text-center text-gray-500">No documents found.</div>;
  }

  return (
    <div className="overflow-x-auto py-4 space-y-4">
      <div className="flex gap-4 items-center">
        <label className="btn btn-outline btn-sm">
          📥 Import Questions
          <input
            type="file"
            accept=".json"
            hidden
            onChange={handleFileUpload}
          />
        </label>
        {templatedQuestions.length > 0 && (
          <span className="text-success text-sm">
            ✓ {templatedQuestions.length} questions loaded
          </span>
        )}
      </div>

      <div className="flex space-x-4">
        {documents.map((doc) => {
          const attachment = doc.content?.[0]?.attachment;
          const analysis = analysisResults[doc.id];
          const error = errors[doc.id];

          return (
            <div
              key={doc.id}
              className="card w-80 bg-base-100 shadow-xl shrink-0"
            >
              <div className="card-body space-y-2">
                <h2 className="card-title">
                  {console.log("doc is ", JSON.stringify(doc))}
                  {console.log("attachment is ", JSON.stringify(attachment))}
                  {doc.type?.text || attachment?.contentType || "Unknown Type"}
                </h2>
                <p className="text-sm text-gray-500">
                  Date:{" "}
                  {doc.date ? new Date(doc.date).toLocaleDateString() : "N/A"}
                </p>

                {loadingDocId === doc.id ? (
                  <div className="flex justify-center my-2">
                    <span className="loading loading-spinner loading-sm text-primary"></span>
                  </div>
                ) : (
                  <div className="card-actions justify-end">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => fetchAndShowDocument(doc)}
                    >
                      View Content
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAnalyze(doc)}
                    >
                      Analyze
                    </button>
                  </div>
                )}

                {analysis && (
                  <>
                    <div className="bg-base-200 p-2 rounded text-sm text-left whitespace-pre-wrap max-h-40 overflow-y-auto space-y-2">
                      {templatedQuestions.length > 0 ? (
                        templatedQuestions.map((question, idx) => {
                          const answerLines = analysis
                            .split("\n")
                            .filter(Boolean); // simple split by line
                          const answer =
                            answerLines[idx] || "(No answer found)";
                          return (
                            <div key={idx}>
                              <strong className="text-gray-700">
                                Q: {question}
                              </strong>
                              <p className="ml-2">A: {answer}</p>
                            </div>
                          );
                        })
                      ) : (
                        <pre>{analysis}</pre>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <PDFDownloadLink
                        document={<AnalysisPDF content={analysis} />}
                        fileName={`analysis-${doc.id}.pdf`}
                        className="btn btn-sm btn-outline"
                      >
                        Download PDF
                      </PDFDownloadLink>
                    </div>
                  </>
                )}

                {error && (
                  <div className="alert alert-error text-sm whitespace-pre-wrap">
                    {error}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Content modal */}
      {showContentModal && docContent && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-2">Document Content</h3>
            <div className="max-h-[70vh] overflow-y-auto">
              {docContent.startsWith("data:image/") ? (
                <img
                  src={docContent}
                  alt="Document Image"
                  className="w-full rounded"
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
                  } catch (e) {
                    return <pre>{docContent}</pre>;
                  }
                })()
              ) : (
                <pre className="text-sm whitespace-pre-wrap bg-base-200 p-2 rounded">
                  {docContent}
                </pre>
              )}
            </div>
            <div className="modal-action">
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
