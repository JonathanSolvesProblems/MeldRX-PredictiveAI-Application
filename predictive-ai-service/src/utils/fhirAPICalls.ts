import axios from "axios";

export const fetchFHIRResource = async <T>({
  resourceType,
  token,
  patientId,
  dispatch,
  setResourceAction,
  setLoading,
  setError,
  maxItems = Infinity,
  onFetched,
}: {
  resourceType: string;
  token: string;
  patientId: string;
  dispatch: any;
  setResourceAction: (data: T[]) => any;
  setLoading?: (loading: boolean) => void;
  setError?: (error: string | null) => void;
  maxItems?: number;
  onFetched?: (data: T[]) => void;
}) => {
  if (!token || !patientId) return;

  setLoading?.(true);

  try {
    let allResources: T[] = [];
    let nextUrl = `https://app.meldrx.com/api/fhir/${process.env.NEXT_PUBLIC_APP_ID}/${resourceType}?patient=${patientId}`;

    while (nextUrl && allResources.length < maxItems) {
      const response = await axios.get(nextUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const responses = await Promise.all(
        response.data.entry?.map((entry: any) =>
          axios.get(entry.fullUrl, {
            headers: { Authorization: `Bearer ${token}` },
          })
        ) || []
      );

      allResources = [...allResources, ...responses.map((res) => res.data)];

      if (allResources.length >= maxItems) break;

      nextUrl =
        response.data.link?.find((link: any) => link.relation === "next")?.url || null;
    }

    dispatch(setResourceAction(allResources));
    onFetched?.(allResources);

    console.log(`Fetched ${allResources.length} ${resourceType} resources.`);
    // console.log(`Details of ${resourceType}: ${JSON.stringify(allResources, null, 2)}`);

    setLoading?.(false);
  } catch (error) {
    console.error(`Error fetching ${resourceType}:`, error);
    setError?.(`Failed to fetch ${resourceType}.`);
    setLoading?.(false);
  }
};

// In your utility file (e.g., `utils/fetchDocumentContent.ts`)
export const fetchDocumentContent = async (doc: any, token: string) => {
  if (!doc.content || !doc.content[0]?.attachment?.url) {
    throw new Error("No content URL found in DocumentReference");
  }

  const contentUrl = doc.content[0]?.attachment?.url;

  // Fetch content from the URL
  const response = await fetch(contentUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch document content");
  }

  const contentType = response.headers.get("Content-Type") || "application/octet-stream";
  const content = await response.text(); // Adjust based on content type

  return { content, contentType };
};
