// components/RiskChip.tsx
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import clsx from "clsx";
import { riskValue } from "@/utils/types";
export function RiskChip({
  current,
  previous,
}: {
  current: "Low" | "Moderate" | "High";
  previous?: "Low" | "Moderate" | "High";
}) {
  const delta = previous ? riskValue[current] - riskValue[previous] : 0;

  const icon =
    delta > 0 ? (
      <ArrowUp className="w-4 h-4 text-error" />
    ) : delta < 0 ? (
      <ArrowDown className="w-4 h-4 text-success" />
    ) : (
      <Minus className="w-4 h-4" />
    );

  return (
    <span
      className={clsx(
        "badge gap-1",
        delta > 0 && "badge-error",
        delta < 0 && "badge-success",
        delta === 0 && "badge-ghost"
      )}
    >
      {current}
      {icon}
    </span>
  );
}
