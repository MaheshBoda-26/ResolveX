import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface EvalSuite {
  id: string;
  name: string;
  category: string;
  totalCases: number;
  passedCases: number;
  passRate: number;
  lastRun: string;
  status: "PASSED" | "WARNING" | "RUNNING";
}

const MOCK_EVAL_SUITES: EvalSuite[] = [
  {
    id: "eval-accuracy",
    name: "Accuracy Benchmark",
    category: "Accuracy",
    totalCases: 150,
    passedCases: 149,
    passRate: 99.3,
    lastRun: "2 hours ago",
    status: "PASSED",
  },
  {
    id: "eval-safety",
    name: "Safety & Guardrails",
    category: "Safety",
    totalCases: 85,
    passedCases: 85,
    passRate: 100.0,
    lastRun: "2 hours ago",
    status: "PASSED",
  },
  {
    id: "eval-policy",
    name: "Policy Grounding",
    category: "Policy",
    totalCases: 120,
    passedCases: 118,
    passRate: 98.3,
    lastRun: "2 hours ago",
    status: "PASSED",
  },
  {
    id: "eval-hallucination",
    name: "Hallucination Detection",
    category: "Quality",
    totalCases: 200,
    passedCases: 199,
    passRate: 99.5,
    lastRun: "2 hours ago",
    status: "PASSED",
  },
];

export function EvaluationsPage() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [lastEvalTime, setLastEvalTime] = useState("2 hours ago");

  const { data: evalSuites = MOCK_EVAL_SUITES, isLoading } = useQuery({
    queryKey: ["evaluations"],
    queryFn: () => Promise.resolve(MOCK_EVAL_SUITES),
  });

  const handleRunEvaluation = async () => {
    setIsRunning(true);
    // Simulate running evaluation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // Mock update to show completion
    queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    setIsRunning(false);
    setLastEvalTime("Just now");
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 bg-background flex flex-col gap-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-background flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-outline-variant/40">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
            Agent Evaluation Suite
          </h1>
          <p className="text-xs md:text-sm text-on-surface-variant mt-1">
            Comprehensive safety, accuracy, hallucination, and policy adherence
            metrics.
          </p>
        </div>

        <button
          onClick={handleRunEvaluation}
          disabled={isRunning}
          className="px-4 py-2 bg-primary-container text-on-primary-container font-bold rounded-lg text-xs hover:opacity-90 transition-opacity flex items-center gap-2 shadow-xs disabled:opacity-60"
        >
          <span
            className={`material-symbols-outlined text-[18px] ${isRunning ? "animate-spin" : ""}`}
          >
            {isRunning ? "sync" : "play_arrow"}
          </span>
          <span>
            {isRunning ? "Running Eval Benchmark..." : "Run New Evaluation"}
          </span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Accuracy */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-center text-on-surface-variant mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Accuracy Score
            </span>
            <span className="material-symbols-outlined text-secondary text-[22px]">
              target
            </span>
          </div>
          <div className="text-3xl font-bold text-on-surface">99.2%</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[14px]">
              arrow_upward
            </span>
            <span>+0.4% from last run</span>
          </div>
        </div>

        {/* KPI 2: Safety */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-center text-on-surface-variant mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Safety Adherence
            </span>
            <span className="material-symbols-outlined text-emerald-600 text-[22px]">
              verified_user
            </span>
          </div>
          <div className="text-3xl font-bold text-on-surface">100.0%</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 font-medium">
            <span>0 policy safety violations</span>
          </div>
        </div>

        {/* KPI 3: Policy Grounding */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-center text-on-surface-variant mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Policy Grounding
            </span>
            <span className="material-symbols-outlined text-primary text-[22px]">
              gavel
            </span>
          </div>
          <div className="text-3xl font-bold text-on-surface">98.6%</div>
          <div className="text-xs text-primary font-medium mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">
              arrow_upward
            </span>
            <span>+1.2% this week</span>
          </div>
        </div>

        {/* KPI 4: Hallucination Rate */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-center text-on-surface-variant mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Hallucination Rate
            </span>
            <span className="material-symbols-outlined text-tertiary text-[22px]">
              psychology_alt
            </span>
          </div>
          <div className="text-3xl font-bold text-on-surface">0.04%</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[14px]">
              arrow_downward
            </span>
            <span>-0.02% lower (Better)</span>
          </div>
        </div>
      </div>

      {/* Evaluation Benchmark Suites Table */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 md:p-5 flex justify-between items-center border-b border-outline-variant/40">
          <div>
            <h3 className="text-base font-bold text-on-surface">
              Evaluation Benchmark Suites
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Automated regression test suites validating agent responses
              against company policies.
            </p>
          </div>
          <span className="text-xs text-on-surface-variant font-mono">
            Last Run: {lastEvalTime}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant font-semibold uppercase tracking-wider text-[11px] border-b border-outline-variant/40">
              <tr>
                <th className="py-3 px-4">Suite ID</th>
                <th className="py-3 px-4">Benchmark Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Pass Rate</th>
                <th className="py-3 px-4">Test Cases</th>
                <th className="py-3 px-4">Last Run</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {evalSuites?.map((suite) => (
                <tr
                  key={suite.id}
                  className="hover:bg-surface-container-low/40 transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-primary">
                    {suite.id}
                  </td>
                  <td className="py-3 px-4 font-bold text-on-surface">
                    {suite.name}
                  </td>
                  <td className="py-3 px-4 text-on-surface-variant">
                    {suite.category}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${suite.passRate === 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ width: `${suite.passRate}%` }}
                        />
                      </div>
                      <span className="font-bold text-on-surface">
                        {suite.passRate}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-on-surface-variant">
                    {suite.passedCases} / {suite.totalCases} passed
                  </td>
                  <td className="py-3 px-4 text-on-surface-variant">
                    {suite.lastRun}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                        suite.status === "PASSED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {suite.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
