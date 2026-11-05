import Link from "next/link";

export default function Home() {
  return (
    <section>
      <h1>gi-optimizer</h1>
      <p>
        A personal, preset-first build optimizer using the Genshin Optimizer
        formulas. Everything runs in your browser; nothing is uploaded.
      </p>
      <ol>
        <li>
          <Link href="/import">Import</Link> a GOOD file from your scanner
          (e.g. Irminsul).
        </li>
        <li>
          Pick a <Link href="/presets">preset</Link> (Akasha, official or your
          own).
        </li>
        <li>
          <Link href="/optimize">Optimize</Link> one character&apos;s rotation
          damage and compare it with your current build.
        </li>
      </ol>
    </section>
  );
}
