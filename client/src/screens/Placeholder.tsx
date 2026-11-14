// A screen that a later feature fills in (F-03 and F-04). The route and its access rule already exist.
export function Placeholder({ title }: { title: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <p>This screen is built in a later feature of Sprint 1.</p>
    </section>
  );
}
