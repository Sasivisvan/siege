"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/ui/app-shell";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

interface TopicScore {
  topic: string;
  questionsAttempted: number;
  questionsCorrect: number;
  difficulty: "easy" | "medium" | "hard";
  mastery: number;
}

interface ProfileData {
  topicScores: TopicScore[];
  overallStrengths: string[];
  overallWeaknesses: string[];
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const fetchProfile = async () => {
      try {
        const res = await apiFetch<{ data: { profile: ProfileData } }>("/api/profile");
        setProfile(res.data.profile);
      } catch (err) {
        console.error("Failed to load skill profile:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, isLoading]);

  if (isLoading || loadingData) {
    return <AppShell eyebrow="Profile" title="Loading Profile..." description="" />;
  }

  if (!isAuthenticated) {
    return (
      <AppShell
        eyebrow="Profile"
        title="Access Denied"
        description="Please sign in to view your skill profile."
        primaryCta={{ label: "Sign in", href: "/login" }}
      />
    );
  }

  const scores = profile?.topicScores || [];
  const totalAttempted = scores.reduce((sum, s) => sum + s.questionsAttempted, 0);
  const totalCorrect = scores.reduce((sum, s) => sum + s.questionsCorrect, 0);
  const averageMastery = scores.length > 0 
    ? Math.round(scores.reduce((sum, s) => sum + s.mastery, 0) / scores.length) 
    : 0;

  // Render SVG Radar Chart
  const renderRadarChart = () => {
    if (scores.length < 3) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "var(--muted)", fontStyle: "italic" }}>
          Radar chart requires at least 3 topics with assessments.
        </div>
      );
    }

    const width = 320;
    const height = 320;
    const cx = width / 2;
    const cy = height / 2;
    const maxVal = 100;
    const r = 110; // max radius

    const points = scores.map((s, i) => {
      const angle = (Math.PI * 2 * i) / scores.length - Math.PI / 2;
      const valRadius = (s.mastery / maxVal) * r;
      const x = cx + valRadius * Math.cos(angle);
      const y = cy + valRadius * Math.sin(angle);
      return { x, y, label: s.topic, angle };
    });

    const polygonPoints = points.map(p => `${p.x},${p.y}`).join(" ");

    // Ring levels
    const levels = [0.25, 0.5, 0.75, 1];

    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
        <svg width={width} height={height} style={{ overflow: "visible" }}>
          {/* Level rings */}
          {levels.map((level, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r * level}
              fill="none"
              stroke="var(--panel-border)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Web Spoke Lines */}
          {points.map((p, i) => {
            const endX = cx + r * Math.cos(p.angle);
            const endY = cy + r * Math.sin(p.angle);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={endX}
                y2={endY}
                stroke="var(--panel-border)"
                strokeWidth="1"
              />
            );
          })}

          {/* Mastery Polygon area */}
          <polygon
            points={polygonPoints}
            fill="var(--accent-glow)"
            stroke="var(--accent)"
            strokeWidth="2"
          />

          {/* Data Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="var(--accent-strong)"
              stroke="var(--accent)"
              strokeWidth="1"
            />
          ))}

          {/* Axis Labels */}
          {points.map((p, i) => {
            const labelDist = r + 24;
            const lx = cx + labelDist * Math.cos(p.angle);
            const ly = cy + labelDist * Math.sin(p.angle);
            let textAnchor: "start" | "end" | "middle" = "middle";
            if (Math.cos(p.angle) > 0.1) textAnchor = "start";
            else if (Math.cos(p.angle) < -0.1) textAnchor = "end";

            return (
              <text
                key={i}
                x={lx}
                y={ly}
                fill="var(--text)"
                fontSize="0.75rem"
                fontWeight="600"
                fontFamily="var(--font-mono)"
                textAnchor={textAnchor}
                alignmentBaseline="middle"
              >
                {p.label} ({scores[i].mastery}%)
              </text>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <AppShell
      eyebrow="Candidate Analytics"
      title={user?.name || "Candidate"}
      description={`System-wide masteries, performance statistics, and diagnostic weakness metrics.`}
    >
      <div className="workspace-grid" style={{ marginTop: "24px" }}>
        {/* Main analytics panels */}
        <div className="stack">
          {/* Diagnostic overview metrics */}
          <div className="grid three-up">
            <div className="card stack">
              <span className="eyebrow" style={{ fontSize: "0.7rem" }}>Assessments Completed</span>
              <div className="stat-val">{scores.length > 0 ? "Verified" : "None"}</div>
              <p style={{ fontSize: "0.85rem" }}>Based on all submissions</p>
            </div>
            <div className="card stack">
              <span className="eyebrow" style={{ fontSize: "0.7rem" }}>Total Correct Answers</span>
              <div className="stat-val">{totalCorrect} / {totalAttempted}</div>
              <p style={{ fontSize: "0.85rem" }}>Accuracy: {totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0}%</p>
            </div>
            <div className="card stack">
              <span className="eyebrow" style={{ fontSize: "0.7rem" }}>Average Mastery</span>
              <div className="stat-val" style={{ color: "var(--accent)" }}>{averageMastery}%</div>
              <p style={{ fontSize: "0.85rem" }}>Aggregate system mastery</p>
            </div>
          </div>

          {/* strengths & weaknesses blocks */}
          <div className="card stack">
            <h3>Diagnostic Performance</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "8px" }}>
              <div className="stack" style={{ gap: "8px" }}>
                <strong style={{ color: "var(--success)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>✓</span> Core Strengths (≥70% Mastery)
                </strong>
                {profile?.overallStrengths.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No high-mastery topics recorded yet.</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                    {profile?.overallStrengths.map(topic => (
                      <span key={topic} className="badge success">{topic}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="stack" style={{ gap: "8px" }}>
                <strong style={{ color: "var(--warning)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>⚠</span> Recommended Focus Area (&lt;50% Mastery)
                </strong>
                {profile?.overallWeaknesses.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>You are demonstrating stable competence across all tested fields!</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                    {profile?.overallWeaknesses.map(topic => (
                      <span key={topic} className="badge warning">{topic}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Topic breakdown */}
          <div className="card stack">
            <h3>Topic Performance Breakdown</h3>
            {scores.length === 0 ? (
              <p style={{ color: "var(--muted)", textAlign: "center", padding: "24px 0" }}>No diagnostic data available. Please complete an exam session to generate skill analytics.</p>
            ) : (
              <div className="stack" style={{ gap: "16px", marginTop: "8px" }}>
                {scores.map(s => (
                  <div key={s.topic} style={{ display: "grid", gridTemplateColumns: "120px 1fr 80px", alignItems: "center", gap: "16px" }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <strong style={{ fontSize: "0.95rem" }}>{s.topic}</strong>
                    </div>
                    <div className="meter">
                      <div className="meter-track" style={{ height: "10px" }}>
                        <span style={{ width: `${s.mastery}%`, background: s.mastery >= 70 ? "var(--success)" : s.mastery >= 50 ? "var(--accent)" : "var(--warning)" }}></span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="font-mono" style={{ fontSize: "0.9rem", fontWeight: 700 }}>{s.mastery}%</span>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{s.questionsCorrect}/{s.questionsAttempted} Qs</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side SVG chart panel */}
        <div className="card stack" style={{ justifyContent: "center", alignItems: "center" }}>
          <h3 style={{ alignSelf: "flex-start", marginBottom: "24px" }}>Mastery Footprint</h3>
          {renderRadarChart()}
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", textAlign: "center", maxWidth: "240px", marginTop: "16px" }}>
            Visual chart mapping subject masteries. Expanding footprint signifies higher competence.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
