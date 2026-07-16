type RiskMeterProps = {
  score: number;
};

export function RiskMeter({ score }: RiskMeterProps) {
  return (
    <article className="card meter">
      <div>
        <h3>Risk score</h3>
        <p>{score}/100 session integrity signal</p>
      </div>
      <div className="meter-track">
        <span style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
    </article>
  );
}
