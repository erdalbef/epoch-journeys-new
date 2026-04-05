"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
} from "recharts";

type BarData = {
  month: string;
  amount: number;
};

type PieData = {
  name: string;
  value: number;
};

export default function CommissionsCharts({
  bookingChartData,
  payoutChartData,
  payoutPieData,
}: {
  bookingChartData: BarData[];
  payoutChartData: BarData[];
  payoutPieData: PieData[];
}) {
  const pieDataWithColors = payoutPieData.map((item) => ({
    ...item,
    fill: item.name === "Paid" ? "#16a34a" : "#d97706",
  }));

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Monthly Commissions
            </h2>
            <p className="text-sm text-slate-500">
              Commission totals from bookings by month.
            </p>
          </div>

          <div className="h-80">
            {bookingChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No chart data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Monthly Payouts
            </h2>
            <p className="text-sm text-slate-500">
              Total partner payouts created by month.
            </p>
          </div>

          <div className="h-80">
            {payoutChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No chart data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payoutChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Paid vs Pending Payouts
          </h2>
          <p className="text-sm text-slate-500">
            Compare completed payouts with pending payout amounts.
          </p>
        </div>

        <div className="h-80">
          {pieDataWithColors.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No payout breakdown available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieDataWithColors}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label
                />
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}