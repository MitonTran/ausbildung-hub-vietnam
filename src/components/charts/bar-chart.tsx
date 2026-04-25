"use client";

import { ResponsiveContainer, BarChart as RBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Point {
  name: string;
  value: number;
}

export function BarChart({ data, height = 200 }: { data: Point[]; height?: number }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <RBarChart data={data}>
          <defs>
            <linearGradient id="bc1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#3b82f6" />
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
          <Bar dataKey="value" fill="url(#bc1)" radius={[8, 8, 0, 0]} />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
