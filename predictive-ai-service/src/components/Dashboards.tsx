import { useSelector } from "react-redux";
import useAnalyses from "./hooks/useAnalyses";
import { RiskChip } from "./charts/RiskChip";
import RiskTrendChart from "./charts/RiskTrendChart";
import { RootState } from "@/app/redux/store";
import { TrendingUp, ShieldCheck } from "lucide-react";

export default function Dashboards() {
  const token = useSelector((state: RootState) => state.auth.token);
  const patientId = useSelector((state: RootState) => state.auth.patientId);

  if (!patientId) {
    throw new Error("Patient ID is required for analysis");
  }

  const { history, latest } = useAnalyses(token, patientId);

  const cardiacHistory = history
    .filter((h) => h.label === "Cardiovascular Risk")
    .sort((a, b) => (a.date > b.date ? -1 : 1));

  const current = cardiacHistory[0]?.score;
  const previous = cardiacHistory[1]?.score;

  return (
    <section className="space-y-6">
      {/* Current CV Risk Status */}
      {current && (
        <div className="card bg-gradient-to-r from-blue-100 to-blue-50 text-blue-900 shadow-lg w-fit px-6 py-3 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-sm">Current CV Risk:</span>
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

      {/* Risk Trend Chart */}
      <div className="bg-base-100 rounded-xl shadow-md p-4">
        <h3 className="text-lg font-semibold mb-2 text-gray-700">
          Cardiovascular Risk Over Time
        </h3>
        <RiskTrendChart data={history} />
      </div>

      {/* Recommendations */}
      {latest && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card bg-base-100 shadow-lg border border-base-200 hover:shadow-xl transition-all">
            <div className="card-body">
              <h3 className="card-title flex items-center gap-2 text-green-600">
                <ShieldCheck className="w-5 h-5" /> Recommended Treatments
              </h3>
              <ul className="list-disc ml-4 text-sm mt-2">
                {latest.recommendedTreatments.map((t) => (
                  <li key={t.treatment} className="mb-1">
                    <span className="font-medium text-gray-800">
                      {t.condition}:
                    </span>{" "}
                    {t.treatment}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card bg-base-100 shadow-lg border border-base-200 hover:shadow-xl transition-all">
            <div className="card-body">
              <h3 className="card-title flex items-center gap-2 text-yellow-600">
                <ShieldCheck className="w-5 h-5" /> Preventive Measures
              </h3>
              <ul className="list-disc ml-4 text-sm mt-2">
                {latest.preventiveMeasures.map((m) => (
                  <li key={m} className="mb-1">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
