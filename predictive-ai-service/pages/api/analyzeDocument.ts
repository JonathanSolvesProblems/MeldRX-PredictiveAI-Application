import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const { document } = req.body;

    if (!document || !document.content || !document.content[0]?.attachment) {
      return res.status(400).json({ message: "Invalid document structure" });
    }

    // if (
    //   !Array.isArray(documents) ||
    //   documents.some((doc) => !doc.content_type || !doc.base64_content)
    // ) {
    //   return res.status(400).json({ message: "Invalid or incomplete documents provided" });
    // }
    

    // Send the document info to the Python backend
    const backendUrl = process.env.PYTHON_BACKEND_URL;

    if (!backendUrl) {
      return res.status(400).json({ message: "Missing python backend URL" });
    }

    // const response = await axios.post(backendUrl, { documents }, {
    //   headers: { "Content-Type": "application/json" },
    //  // timeout: 30000, // Increase timeout if needed
    // });

    const response = await axios.post(backendUrl, {
      document, // send the entire FHIR-style doc object
    });

    return res.status(200).json(response.data);
    
  } catch (error: any) {
    console.error("Error sending to backend:", error.message);
    return res.status(500).json({ message: "Failed to analyze document", error: error.message });
  }
}
