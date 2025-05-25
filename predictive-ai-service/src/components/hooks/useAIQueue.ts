"use client";

import { RootState } from "@/app/redux/store";
import { fetchAIResponse } from "@/utils/serverAPICalls";
import { useSelector } from "react-redux";

type FetchFn = (item: any) => Promise<{ content: string; contentType: string }>;

export const useAIQueue = () => {
  const token = useSelector((state: RootState) => state.auth.token);
  const patientId = useSelector((state: RootState) => state.auth.patientId);

  const retryFetch = async (
    item: any,
    prompt: string,
    modelName: string,
    retries = 2,
    timeout = 30000 // increased to 30 seconds
  ): Promise<any> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        console.log("⚙️ Fetching AI response...");
        const response = await fetchAIResponse(prompt, item, token, patientId, modelName, controller.signal);

        console.log("✅ AI response fetched: " + JSON.stringify(response));
        clearTimeout(timeoutId);
        return response;
      } catch (err: any) {
        clearTimeout(timeoutId);

        const isFinalAttempt = attempt === retries;
        const errMsg = typeof err?.message === "string" ? err.message : "";
        const shouldRetry =
          errMsg.includes("504") ||
          errMsg.includes("FUNCTION_INVOCATION_TIMEOUT") ||
          errMsg.includes("ECONNRESET") ||
          errMsg.includes("timeout") ||
          err.name === "AbortError";

        if (!shouldRetry || isFinalAttempt) {
          console.error(`❌ Final attempt failed (attempt ${attempt + 1}):`, errMsg || err);
          throw err;
        } else {
          console.warn(`⏳ Retrying (attempt ${attempt + 1}) after error: ${errMsg}`);
          await new Promise((res) => setTimeout(res, 1000 * (attempt + 1))); // simple backoff
        }
      }
    }
  };


  const analyzeItem = async (
    type: string,
    item: any,
    modelName: string,
    customPrompt?: (item: any) => string,
    fetchFn?: FetchFn
  ) => {
    let prompt = "";

    if (customPrompt) {
      prompt = customPrompt(item);
    } else if (item !== null) {
      prompt = `Analyze the following ${type}:\n${JSON.stringify(item, null, 2)}`;
     } else {
      throw new Error("No prompt or item provided to analyze.");
    }
    
    // If fetchFn is provided (e.g., for documents), call it first
     if (fetchFn && item) {
      const { content, contentType } = await fetchFn(item);
      prompt = `Analyze this ${type} content (Content-Type: ${contentType}):\n${content}`;
    }

    return await retryFetch(item, prompt, modelName);
  };

  return { analyzeItem };
};