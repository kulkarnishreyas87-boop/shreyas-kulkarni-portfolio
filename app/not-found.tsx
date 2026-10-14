import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section container" style={{ minHeight: "50vh" }}>
      <p className="eyebrow">404</p>
      <h1 style={{ fontSize: 44, marginBottom: 14 }}>Nothing here</h1>
      <p className="lede" style={{ marginBottom: 24 }}>That page does not exist, or the project is not published.</p>
      <Link href="/projects" className="btn btn-primary">See all projects</Link>
    </section>
  );
}
