import { useEffect, useState } from "react";

type Health = { version: string; dev_mode: boolean };

async function fetchHealth(): Promise<Health> {
  const response = await fetch("/api/health");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as Health;
}

export function App() {
  const [backend, setBackend] = useState("connecting");

  useEffect(() => {
    fetchHealth().then(
      (health) => setBackend(`v${health.version}`),
      () => setBackend("unavailable"),
    );
  }, []);

  return (
    <main>
      <h1>Opa Prikkie</h1>
      <p>The browser game is on its way.</p>
      <p>Backend: {backend}</p>
    </main>
  );
}
