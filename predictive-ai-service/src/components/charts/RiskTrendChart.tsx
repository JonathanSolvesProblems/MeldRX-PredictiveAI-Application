// components/RiskTrendChart.tsx
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { HistoryPoint } from "../hooks/useAnalyses";
import { riskLabel } from "@/utils/types";
import dayjs from "dayjs";

export default function RiskTrendChart({ data }: { data: HistoryPoint[] }) {
  const cardiac = data.filter((d) => d.label === "Cardiovascular Risk");

  if (cardiac.length < 2) return null; // not enough to show a trend

  return (
    <div className="card shadow-md bg-base-100 p-4">
      <h3 className="font-semibold mb-2">Cardiovascular-risk trend</h3>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={cardiac}>
          <XAxis
            dataKey="date"
            tickFormatter={(d) => dayjs(d).format("MMM D")}
            padding={{ left: 10, right: 10 }}
          />
          <YAxis
            ticks={[1, 2, 3]}
            domain={[1, 3]}
            tickFormatter={(v) => riskLabel[v - 1]}
          />
          <Tooltip
            labelFormatter={(d) => dayjs(d).format("MMM D, YYYY")}
            formatter={(v: number) => riskLabel[v - 1]}
          />
          <Line
            type="monotone"
            dataKey="score"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
