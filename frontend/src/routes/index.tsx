import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/orbit/AppShell";
import { InterpretationView } from "@/components/orbit/InterpretationView";
import { PlanIntake, ScanningDoc } from "@/components/orbit/PlanIntake";
import { interpretProject, PdfSinTextoError, saveRequirements, type InterpretInput } from "@/lib/api";
import { setProject, useProject } from "@/lib/project-store";
import type { Requirements } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Necesidad · ORBIT AI" },
      { name: "description", content: "Convierte el plan del proyecto en requisitos por rol con ORBIT AI." },
      { property: "og:title", content: "Necesidad · ORBIT AI" },
      { property: "og:description", content: "Convierte el plan del proyecto en requisitos por rol con ORBIT AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StepNeed,
});

function StepNeed() {
  const { interpretation } = useProject();
  const [phase, setPhase] = useState<"intake" | "scanning" | "scanned" | "error">("intake");
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function run(input: InterpretInput) {
    setSaid("file" in input ? `📄 ${input.file.name}` : input.text);
    setPhase("scanning");
    try {
      const res = await interpretProject(input);
      setProject({ interpretation: res, requirements: res.requirements });
      setPhase("intake");
    } catch (e) {
      setPhase(e instanceof PdfSinTextoError ? "scanned" : "error");
    }
  }
  async function confirm(req: Requirements) {
    if (!interpretation) return;
    setBusy(true);
    const row = "requirements" in interpretation.row_template ? { ...interpretation.row_template, requirements: req } : interpretation.row_template;
    const id = await saveRequirements(row);
    setProject({ requirements: req, projectId: id });
    navigate({ to: "/talento" });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-muted-foreground">Paso 1 · Necesidad</p>
        <div className="mt-4">
          {said && phase !== "intake" || (said && interpretation) ? (
            <div className="mb-6 flex justify-end"><p className="line-clamp-2 max-w-xl rounded-2xl rounded-tr-sm bg-surface-2 px-4 py-3 text-sm text-muted-foreground">{said}</p></div>
          ) : null}
          {phase === "scanning" ? <ScanningDoc />
            : interpretation && phase === "intake" ? (
              <>
                <button className="mb-4 text-xs text-muted-foreground hover:text-ai" onClick={() => { setSaid(null); setProject({ interpretation: null, demo: false }); }}>← Cargar otro plan</button>
                <InterpretationView key={interpretation.source_text} result={interpretation} onConfirm={confirm} busy={busy} />
              </>
            ) : (
              <>
                {phase === "error" && <p role="alert" className="mb-4 text-center text-sm text-gap">No hemos podido leer el plan. Inténtalo de nuevo.</p>}
                <PlanIntake scannedError={phase === "scanned"} onFile={(file) => run({ file })} onText={(text) => run({ text })} />
              </>
            )}
        </div>
      </div>
    </AppShell>
  );
}
