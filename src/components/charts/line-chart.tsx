"use client";

import { ResponsiveContainer, LineChart as RLineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Point {
  name: string;
  value: number;
  value2?: number;
}

export function LineChart({ data, height = 200 }: { data: Point[]; height?: number }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <RLineChart data={data}>
          <defs>
            <linearGradient id="lc1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(125,125,125,0.15)" vertical={false} />
          <XAxis dataKey="name" stroke="rgba(125,125,125,0.7)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(125,125,125,0.7)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(15,23,42,0.9)",
              border: "1px solid rgba(56,189,248,0.3)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "#22d3ee" }}
          />
          <Line type="monotone" dataKey="value" stroke="url(#lc1)" strokeWidth={2.5} dot={false} />
          {data[0]?.value2 !== undefined && (
            <Line type="monotone" dataKey="value2" stroke="#a78bfa" strokeWidth={2} dot={false} strokeDasharray="4 4" />
          )}
        </RLineChart>
      </ResponsiveContainer>
    </div>
  );
}
