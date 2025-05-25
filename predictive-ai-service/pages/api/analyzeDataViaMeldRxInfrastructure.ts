import { NextApiRequest, NextApiResponse } from "next";

const MAX_PROMPT_CHARS = 3000;
const MAX_TEXT_CHARS = 3000;
const MAX_STRING_FIELD_LENGTH = 300; // aggressive trimming

// Trim long string fields in deeply nested objects
function trimLargeFields(obj: any, maxLength = MAX_STRING_FIELD_LENGTH): any {
  if (typeof obj !== "object" || obj === null) return obj;
  const trimmed: any = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    const val = obj[key];
    if (typeof val === "string") {
      trimmed[key] = val.length > maxLength ? val.slice(0, maxLength) + "...[truncated]" : val;
    } else if (typeof val === "object") {
      trimmed[key] = trimLargeFields(val, maxLength);
    } else {
      trimmed[key] = val;
    }
  }
  return trimmed;
}

// Roughly estimate token count (1 token ≈ 4 chars)
function estimateTokenCount(input: string | object): number {
  const text = typeof input === "string" ? input : JSON.stringify(input);
  return Math.ceil(text.length / 4);
}

// Sanitize fetched text content
function safeText(text: string, maxLength: number): string {
  return text
    .slice(0, maxLength)
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // remove control characters
    .replace(/[\r\n\t]+/g, " ")                   // normalize whitespace
    .replace(/"/g, "'");                          // escape quotes
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { item, prompt, token, modelName } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Missing required field: prompt" });
  }

  if (!modelName) {
    return res.status(400).json({ error: "Missing required field: modelName" });
  }


  try {
    let preparedInput = item;
    let base64Content: string | null = null;
    let contentType: string | null = null;

    if (item?.resourceType === "DocumentReference" && item?.content?.[0]?.attachment?.url) {
      const attachment = item.content[0].attachment;
      const attachmentUrl = attachment.url;
      contentType = attachment.contentType || "application/octet-stream";

      const fetchedContent = await fetch(attachmentUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!fetchedContent.ok) {
        throw new Error(`Failed to fetch attachment: ${fetchedContent.statusText}`);
      }

      if ((contentType && contentType.startsWith("image/")) || contentType === "application/pdf") {
        const arrayBuffer = await fetchedContent.arrayBuffer();
        base64Content = Buffer.from(arrayBuffer).toString("base64");
      } else {
        const textContent = await fetchedContent.text();
        preparedInput = {
          ...item,
          fetchedContent: safeText(textContent, MAX_TEXT_CHARS),
        };
      }
    }

    // Validate and set fhirResource
    let fhirResourcePayload: any = null;

    if (item) {
        const trimmedInput = trimLargeFields(preparedInput);

         if (base64Content) {
            fhirResourcePayload = {
            resourceType: item.resourceType,
            id: item.id,
            type: item.type,
          };
        } else {
          if (typeof trimmedInput !== "object" || Array.isArray(trimmedInput)) {
            throw new Error("Invalid FHIR resource: expected an object");
        }
        fhirResourcePayload = trimmedInput;
      }    
    }

    const aiRequest = {
      model: modelName,
      // systemMessage: `You are a clinical document analyst. Focus only on the medical and diagnostic content in the document or resource.
      //   Do not discuss metadata (e.g., XML headers, encodings) or make generalizations.
      //   If answering specific questions, only respond using information found directly in the content. 
      //   If a question has no answer in the content, respond with "No relevant information found."`,
      systemMessage: "You are a healthcare AI assistant.",
      chatMessage: prompt.slice(0, MAX_PROMPT_CHARS),
      base64BinaryData: base64Content || "",
      base64BinaryDataName: base64Content
        ? "attachment" + (contentType ? `.${contentType.split("/")[1]}` : "")
        : "",
      fhirResource: fhirResourcePayload,
    };

    // Debug estimate
    const estimatedTokens = estimateTokenCount(aiRequest);
    console.log("📦 Prepared AI Request:", JSON.stringify(aiRequest, null, 2));
    console.log(`🧮 Estimated token count: ~${estimatedTokens} tokens`);

    const azureToken = process.env.AZURE_TOKEN;
    if (!azureToken) {
      return res.status(400).json({ message: "Missing azure access token" });
    }

    const aiResponse = await fetch("https://app.meldrx.com/api/23cd739c-3141-4d1a-81a3-697b766ccb56/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(aiRequest),
    });
   
    const responseText = await aiResponse.text();

    if (!aiResponse.ok) {
      console.error(`❌ AI Error Response: ${responseText}`);
      throw new Error(`AI request failed: ${aiResponse.status} ${aiResponse.statusText} - ${responseText}`);
    }
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (err) {
      // If parsing fails, assume it's plain text and wrap it manually
      console.warn("⚠️ AI response was not valid JSON, using raw text.");
      result = { content: responseText };
    }
    res.status(200).json({ result });    

    // // FOR AZURE
    // const json = await aiResponse.json();

    // if (!aiResponse.ok) {
    //   console.error(`❌ AI Error Response:`, json);
    //   throw new Error(`AI request failed: ${aiResponse.status} ${aiResponse.statusText} - ${JSON.stringify(json)}`);
    // }

    // res.status(200).json({ result: json });
    // // 

  } catch (error: any) {
    console.error(`❌ Handler error:`, error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
}
