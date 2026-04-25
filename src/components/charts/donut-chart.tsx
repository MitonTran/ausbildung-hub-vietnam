"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface Slice {
  name: string;
  value: number;
}

const COLORS = ["#22d3ee", "#3b82f6", "#8b5cf6", "#facc15", "#22c55e"];

export function DonutChart({ data, height = 200 }: { data: Slice[]; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ width: "100%", height }} className="relative">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "rgba(15,23,42,0.9)",
              border: "1px solid rgba(56,189,248,0.3)",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gradient">{total}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">tổng</div>
        </div>
      </div>
    </div>
  );
}
