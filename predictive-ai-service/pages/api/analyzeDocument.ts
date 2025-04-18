import type { NextApiRequest, NextApiResponse } from "next";
import { AzureKeyCredential } from "@azure/core-auth";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";

const endpoint = "https://models.github.ai/inference";
const modelName = "meta/Llama-3.2-11B-Vision-Instruct";

const token = process.env.GITHUB_TOKEN;

const client = ModelClient(endpoint, new AzureKeyCredential(token!));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const { document } = req.body;

    if (!document || typeof document !== "object" || document.resourceType !== "DocumentReference") {
      return res.status(400).json({ message: "Invalid DocumentReference payload" });
    }
    
    try {
      const documentContent = document.content?.[0]?.attachment;
      const { contentType, data, url } = documentContent || {};

      if (!contentType) {
        return res.status(400).json({ message: "Missing attachment contentType" });
      }

      // Get content (from base64 or fetch from URL)
      let content: string | null = null;

      if (data) {
        content = Buffer.from(data, "base64").toString("utf-8");
      } else if (url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch document from URL: ${response.statusText}`);
        if (contentType.startsWith("text/")) {
          content = await response.text();
        } else {
          const buffer = await response.arrayBuffer();
          content = `data:${contentType};base64,${Buffer.from(buffer).toString("base64")}`;
        }
      } else {
        return res.status(400).json({ message: "No content data or url found" });
      }

      // Decide how to structure the model input
      const isImage = contentType.startsWith("image/");
      const messages = isImage
        ? [
            { role: "system", content: "You are a helpful assistant that describes medical documents and images." },
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this medical image or document." },
                { type: "image_url", image_url: { url: content, details: "low" } },
              ],
            },
          ]
        : [
            { role: "system", content: "You are a helpful assistant that summarizes and analyzes clinical notes." },
            { role: "user", content },
          ];

      console.log("[Document Type]", contentType);
      console.log("[Model Messages]", messages);

      // Send the model
      const response = await client.path("/chat/completions").post({
        body: {
          model: modelName,
          messages,
          max_tokens: 1500,
          temperature: 0.5,
          top_p: 1.0,
          // Optional: stream: true,
        },
      });
  
      if (isUnexpected(response)) {
        throw response.body.error;
      }

      const result = response.body.choices?.[0]?.message?.content;
      return res.status(200).json({ analysis: result });

    } catch (error: any) {
      console.error("Document analysis error:", error);
      return res.status(500).json({
        message: "Failed to analyze the document",
        error: error.message,
      });
    }
}
