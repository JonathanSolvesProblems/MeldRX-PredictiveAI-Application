import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { patientId, date } = req.query;
  const { analysisData } = req.body;
  const token = req.headers.authorization?.replace("Bearer ", "") ?? req.body.token;

  if (typeof patientId !== "string" || typeof date !== "string" || !token) {
    return res.status(400).json({ message: "Invalid request parameters" });
  }

  const baseUrl = `https://app.meldrx.com/api/fhir/${process.env.NEXT_PUBLIC_APP_ID}`;

  const observationBase = {
    resourceType: "Observation",
    status: "final",
    code: {
      coding: [
        {
          system: "http://example.org/fhir/CodeSystem/ai-analysis",
          code: "ai-last-analysis",
          display: "Last AI Analysis Date",
        },
      ],
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    effectiveDateTime: date,
    valueDateTime: date,
  };

  try {
    // Search for an existing Observation with the given code and patient
    const searchResponse = await fetch(
      `${baseUrl}/Observation?subject=Patient/${patientId}&code=http://example.org/fhir/CodeSystem/ai-analysis|ai-last-analysis`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/fhir+json",
        },
      }
    );

    if (!searchResponse.ok) {
      const text = await searchResponse.text();
      console.error("FHIR search failed:", searchResponse.status, text);
      return res.status(500).json({ message: "Failed to search for existing observation" });
    }

    const searchResult = await searchResponse.json();
    const existingObservation = searchResult.entry?.[0]?.resource;

    const analysisString =
      typeof analysisData === "string" ? analysisData : JSON.stringify(analysisData);

    if (existingObservation?.id) {
      // Update existing Observation
      const updatedObservation = {
        resourceType: "Observation",
        id: existingObservation.id,
        status: "final",
        code: observationBase.code,
        subject: observationBase.subject,
        effectiveDateTime: date,
        valueDateTime: date,
        component: [
          {
            code: {
              coding: [
                {
                  system: "http://example.org/fhir/CodeSystem/ai-analysis",
                  code: "analysis-json",
                  display: "AI Analysis Data",
                },
              ],
            },
            valueString: analysisString,
          },
        ],
      };

      const updateResponse = await fetch(`${baseUrl}/Observation/${existingObservation.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/fhir+json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedObservation),
      });

      if (!updateResponse.ok) {
        const text = await updateResponse.text();
        console.error("FHIR update failed:", updateResponse.status, text);
        return res.status(500).json({ message: "Failed to update observation in FHIR" });
      }

      return res.status(200).json({ message: "Observation updated in FHIR" });
    } else {
      // Create new Observation
      const createObservation = {
        ...observationBase,
        component: [
          {
            code: {
              coding: [
                {
                  system: "http://example.org/fhir/CodeSystem/ai-analysis",
                  code: "analysis-json",
                  display: "AI Analysis Data",
                },
              ],
            },
            valueString: analysisString,
          },
        ],
      };

      const createResponse = await fetch(`${baseUrl}/Observation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/fhir+json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(createObservation),
      });

      if (!createResponse.ok) {
        const text = await createResponse.text();
        console.error("FHIR create failed:", createResponse.status, text, createObservation);
        return res.status(500).json({
          message: "Failed to create new observation in FHIR",
          fhirError: text,
        });
      }

      return res.status(200).json({ message: "New observation created in FHIR" });
    }
  } catch (err: any) {
    console.error("Unexpected error handling FHIR observation:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}
