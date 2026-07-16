type RiskMeterProps = {
  score: number;
};

function getRiskColor(score: number): string {
  if (score >= 90) return '#ffffff';
  if (score >= 75) return '#d4d4d4';
  if (score >= 50) return '#a3a3a3';
  if (score >= 25) return '#737373';
  return '#525252';
}

function getRiskLabel(score: number): string {
  if (score >= 90) return 'Critical';
  if (score >= 75) return 'High';
  if (score >= 50) return 'Medium';
  if (score >= 25) return 'Low';
  return 'Clean';
}

export function RiskMeter({ score }: RiskMeterProps) {
  const color = getRiskColor(score);
  const label = getRiskLabel(score);

  return (
    <article className="card meter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Risk score</h3>
        <span style={{ color, fontWeight: 700, fontSize: '1.1rem' }}>
          {score}% — {label}
        </span>
      </div>
      <div className="meter-track">
        <span style={{
          width: `${Math.min(score, 100)}%`,
          background: `linear-gradient(90deg, ${color}, ${color}dd)`,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </article>
  );
}
