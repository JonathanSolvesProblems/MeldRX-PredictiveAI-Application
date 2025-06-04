import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).send("Missing token");

  const url =
    `https://app.meldrx.com/api/fhir/23cd739c-3141-4d1a-81a3-697b766ccb56/Patient/${id}`;

  try {
    const { data } = await axios.get(url, {
      headers: { Authorization: auth },
    });
    res.status(200).json(data);
  } catch (e: any) {
    res
      .status(e.response?.status || 500)
      .send(e.response?.statusText || "FHIR error");
  }
}
