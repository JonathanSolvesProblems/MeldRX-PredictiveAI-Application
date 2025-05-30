export async function fetchAIResponse(
  prompt: string,
  item: any,
  token: string,
  patientId: string | null,
  modelName: string,
  signal?: AbortSignal,
  retries = 2,
  timeout = 15000
): Promise<{ result?: any; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch("/api/analyzeDataViaMeldRxInfrastructure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, item, token, modelName }), 
      signal: signal || controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text();
      return { error: `Server error: ${res.status} - ${errorText}` };
    }

    const data = await res.json();

    // if (!patientId) {
    //    patientId = item?.subject?.reference?.split("/")[1] ?? null;
    // }
 
    // console.log("Patient ID:", patientId);
    // if (patientId && data?.result) {
    //   updateLastAnalyzed(patientId, token);
    // }

    return { result: data.result || data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      if (retries > 0) {
        console.warn("⚠️ Timeout occurred, retrying...", retries);
        return await fetchAIResponse(prompt, item, token, patientId, modelName, undefined, retries - 1, timeout);
      }
      return { error: "Request timed out." };
    }
    return { error: `Unexpected error: ${err.message || err.toString()}` };
  }
}

export async function updateLastAnalyzed(patientId: string, token: string, analysisData?: string) {
  const today = new Date().toISOString().split("T")[0];
  try {
    const res = await fetch(`/api/updateLastAnalyzed?patientId=${patientId}&date=${today}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
       body: JSON.stringify({
        analysisData: analysisData ?? null, // Send null if not provided
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    console.log(`✅ Last analyzed updated for ${patientId}`);
  } catch (err) {
    console.error("❌ Failed to update last analyzed:", err);
  }
}