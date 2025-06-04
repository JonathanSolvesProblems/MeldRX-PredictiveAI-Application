import { useSelector } from "react-redux";
import useAnalyses from "./hooks/useAnalyses";
import { RiskChip } from "./charts/RiskChip";
import RiskTrendChart from "./charts/RiskTrendChart";
import { RootState } from "@/app/redux/store";

export default function Dashboards() {
  const token = useSelector((state: RootState) => state.auth.token);
  const patientId = useSelector((state: RootState) => state.auth.patientId);

  if (!patientId) {
    throw new Error("Patient ID is required for analysis");
  }

  const { history, latest } = useAnalyses(token, patientId);

  // Pull the two most-recent cardiac scores
  const cardiacHistory = history
    .filter((h) => h.label === "Cardiovascular Risk")
    .sort((a, b) => (a.date > b.date ? -1 : 1));

  const current = cardiacHistory[0]?.score;
  const previous = cardiacHistory[1]?.score;

  return (
    <div className="space-y-6">
      {/* Instant status pill */}
      {current && (
        <div className="card px-4 py-2 bg-base-200 w-max">
          <span className="mr-2 font-medium">Current CV risk:</span>
          <RiskChip
            current={
              ["Low", "Moderate", "High"][current - 1] as
                | "Low"
                | "Moderate"
                | "High"
            }
            previous={
              previous
                ? (["Low", "Moderate", "High"][previous - 1] as any)
                : undefined
            }
          />
        </div>
      )}

      {/* Chart */}
      <RiskTrendChart data={history} />

      {/* Treatments & preventive measures */}
      {latest && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h3 className="card-title">Recommended treatments</h3>
              <ul className="list-disc ml-4">
                {latest.recommendedTreatments.map((t) => (
                  <li key={t.treatment}>
                    <span className="font-medium">{t.condition}: </span>
                    {t.treatment}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h3 className="card-title">Preventive measures</h3>
              <ul className="list-disc ml-4">
                {latest.preventiveMeasures.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
