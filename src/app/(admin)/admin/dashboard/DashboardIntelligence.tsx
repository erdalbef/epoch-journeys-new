"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MonthlyTrend = {
  month: string;
  bookings: number;
  travelers: number;
  sales: number;
  collected: number;
};

type PipelineItem = {
  name: string;
  value: number;
};

type MeasuredChartProps = {
  children: (width: number) => ReactNode;
};

function euro(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function MeasuredChart({
  children,
}: MeasuredChartProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const [width, setWidth] =
    useState(0);

  useEffect(() => {
    const element =
      containerRef.current;

    if (!element) {
      return;
    }

    const observer =
      new ResizeObserver((entries) => {
        const entry = entries[0];

        if (!entry) {
          return;
        }

        const nextWidth = Math.floor(
          entry.contentRect.width,
        );

        if (nextWidth > 0) {
          setWidth(nextWidth);
        }
      });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-[288px] min-h-[288px] min-w-0 w-full overflow-hidden"
    >
      {width > 0 ? (
        children(width)
      ) : (
        <div className="h-full w-full rounded-xl bg-slate-50" />
      )}
    </div>
  );
}

export default function DashboardIntelligence({
  monthlyTrend,
  quotePipeline,
  grossSales,
  collected,
  outstanding,
}: {
  monthlyTrend: MonthlyTrend[];
  quotePipeline: PipelineItem[];
  grossSales: number;
  collected: number;
  outstanding: number;
}) {
  const collectionRate =
    grossSales > 0
      ? Math.round(
          (collected / grossSales) * 100,
        )
      : 0;

  return (
    <section>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B0000]">
          Business intelligence
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-950">
          Sales, cash flow & pipeline
        </h2>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-3">
        {/* SALES TREND */}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-950">
                Six-month sales trend
              </h3>

              <p className="text-sm text-slate-500">
                Gross booking value compared
                with money collected.
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-500">
                Collection rate
              </p>

              <p className="text-lg font-bold text-[#001F3F]">
                {collectionRate}%
              </p>
            </div>
          </div>

          <MeasuredChart>
            {(width) => (
              <AreaChart
                width={width}
                height={288}
                data={monthlyTrend}
                margin={{
                  top: 10,
                  right: 15,
                  bottom: 0,
                  left: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={62}
                />

                <Tooltip
                  formatter={(value) =>
                    euro(Number(value))
                  }
                />

                <Legend />

                <Area
                  type="monotone"
                  dataKey="sales"
                  name="Booked"
                  stroke="#001F3F"
                  fill="#001F3F"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />

                <Area
                  type="monotone"
                  dataKey="collected"
                  name="Collected"
                  stroke="#8B0000"
                  fill="#8B0000"
                  fillOpacity={0.08}
                  strokeWidth={2}
                />
              </AreaChart>
            )}
          </MeasuredChart>

          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">
                Booked
              </p>

              <p className="font-bold text-slate-900">
                {euro(grossSales)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Collected
              </p>

              <p className="font-bold text-emerald-700">
                {euro(collected)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Outstanding
              </p>

              <p className="font-bold text-amber-700">
                {euro(outstanding)}
              </p>
            </div>
          </div>
        </div>

        {/* QUOTE PIPELINE */}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="font-bold text-slate-950">
              Quote pipeline
            </h3>

            <p className="text-sm text-slate-500">
              See where active sales
              opportunities are sitting.
            </p>
          </div>

          <MeasuredChart>
            {(width) => (
              <BarChart
                width={width}
                height={288}
                data={quotePipeline}
                layout="vertical"
                margin={{
                  top: 10,
                  right: 15,
                  bottom: 0,
                  left: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={72}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip />

                <Bar
                  dataKey="value"
                  name="Quotes"
                  fill="#001F3F"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            )}
          </MeasuredChart>
        </div>
      </div>

      {/* CURRENT MONTH */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {monthlyTrend
          .slice(-1)
          .map((current) => (
            <div
              key={current.month}
              className="contents"
            >
              <Insight
                label="Bookings this month"
                value={String(
                  current.bookings,
                )}
                detail="New reservations created"
              />

              <Insight
                label="Travelers this month"
                value={String(
                  current.travelers,
                )}
                detail="Guests across new bookings"
              />

              <Insight
                label="Sales this month"
                value={euro(
                  current.sales,
                )}
                detail={`${euro(
                  current.collected,
                )} collected`}
              />
            </div>
          ))}
      </div>
    </section>
  );
}

function Insight({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {detail}
      </p>
    </div>
  );
}