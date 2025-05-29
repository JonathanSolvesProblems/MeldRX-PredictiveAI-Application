import React, { useState } from "react";
import { fetchFHIRResource } from "@/utils/fhirAPICalls";
import { useSelector } from "react-redux";
import { RootState } from "@/app/redux/store";

export const RenderTemplatedQnA = ({ content }: { content: string }) => {
  const token = useSelector((state: RootState) => state.auth.token);
  const patientId = useSelector((state: RootState) => state.auth.patientId);
  const [fetched, setFetched] = useState<Record<string, any>>({});

  const extractResources = (text: string) =>
    [...text.matchAll(/([A-Za-z]+\/[a-z0-9\-]+)/g)].map((m) => m[1]);

  const handleFetch = async (ref: string) => {
    const [resourceType, id] = ref.split("/");
    if (!resourceType || !id) return;

    if (!patientId) {
      console.error("Patient ID is required to fetch resources.");
      return;
    }

    if (typeof content !== "string") {
      console.error(
        "RenderTemplatedQnA expected 'content' to be a string but received:",
        content
      );
      return <div className="text-error">Invalid content format</div>;
    }

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
  };

  const lines = content.split("\n");
  return (
    <div className="space-y-4">
      {lines.map((line, idx) => {
        const resources = extractResources(line);
        const enhancedLine = line.replace(
          /([A-Za-z]+\/[a-z0-9\-]+)/g,
          (match) =>
            `<button class="underline text-blue-500" onclick="document.getElementById('${match.replace(
              "/",
              "_"
            )}_btn').click()">${match}</button>`
        );

        return (
          <div key={idx} className="bg-base-100 p-3 rounded shadow">
            <div
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: enhancedLine }}
            />

            {resources.map((ref) => (
              <div key={ref}>
                <button
                  id={`${ref.replace("/", "_")}_btn`}
                  className="btn btn-xs btn-outline mt-2"
                  onClick={() => handleFetch(ref)}
                >
                  View {ref}
                </button>
                {fetched[ref] && (
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
