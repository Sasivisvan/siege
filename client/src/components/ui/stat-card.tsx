type StatCardProps = {
  label: string;
  value: string;
};

export function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="card">
      <p>{label}</p>
      <h2>{value}</h2>
    </article>
  );
}
