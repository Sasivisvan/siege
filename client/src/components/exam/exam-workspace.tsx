import { RiskMeter } from "@/components/proctoring/risk-meter";

export function ExamWorkspace() {
  return (
    <section className="workspace">
      <div className="workspace-grid">
        <article className="card stack">
          <h2>Question 1</h2>
          <p>Write a function that returns the longest common prefix of an array of strings.</p>
          <textarea rows={14} defaultValue={`function longestCommonPrefix(values) {\n  return values[0] ?? "";\n}`} />
        </article>
        <div className="stack">
          <RiskMeter score={21} />
          <article className="card">
            <h3>Telemetry</h3>
            <p>Fullscreen: active</p>
            <p>Webcam: connected</p>
            <p>Tab focus: stable</p>
          </article>
        </div>
      </div>
    </section>
  );
}
