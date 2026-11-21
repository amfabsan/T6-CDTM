import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/orbit/AppShell";
import { InterpretationView } from "@/components/orbit/InterpretationView";
import { PlanIntake, ReadingRequest } from "@/components/orbit/PlanIntake";
import { buildRequirementsRow, confirmRequirements, interpretProject, saveRequirements } from "@/lib/api";
import { setProject, useProject } from "@/lib/project-store";
import { OrbitButton } from "@/components/orbit/primitives";
import type { Requirements } from "@/lib/types";
import { RocketJourney } from "@/components/orbit/RocketJourney";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Necesidad · ORBIT AI" },
      { name: "description", content: "Describe el equipo que necesitas y ORBIT AI lo convierte en requisitos por rol." },
      { property: "og:title", content: "Necesidad · ORBIT AI" },
      { property: "og:description", content: "Describe el equipo que necesitas y ORBIT AI lo convierte en requisitos por rol." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StepNeed,
});

/** What the request did not say and ORBIT needs: roles, mandatory skills, country. */
function missingInfo(req: Requirements): string[] {
  const out: string[] = [];
  if (req.roles.length === 0) out.push("roles y plazas");
  if (!req.roles.some((r) => r.mandatory_skills.length > 0)) out.push("skills obligatorias");
  if (!req.project.country) out.push("país");
  return out;
}
const joinEs = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);
const errText = (e: unknown) => (e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e));

function StepNeed() {
  const { interpretation } = useProject();
  const [phase, setPhase] = useState<"intake" | "reading" | "error">("intake");
  const [said, setSaid] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  async function run(text: string) {
    setSaid(text);
    setDraft(text);
    setProject({ teamArrival: true, teamId: null });
    setPhase("reading");
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const res = await interpretProject(text, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setProject({ interpretation: res, requirements: res.requirements });
      setPhase("intake");
    } catch (e) {
      if (ctrl.signal.aborted) return;
      console.warn("interpret-project", e);
      setPhase("error");
    }
  }
  function cancel() {
    abort.current?.abort();
    setPhase("intake");
  }
  function newRequest(keepText: boolean) {
    setSaid(null);
    setDraft(keepText ? draft : "");
    setConfirmError(null);
    setProject({ interpretation: null, demo: false });
    setPhase("intake");
  }
  async function confirm(req: Requirements, reviewedBy: string) {
    if (!interpretation) return;
    setBusy(true);
    setConfirmError(null);
    try {
      const row = buildRequirementsRow(interpretation.row_template, req);
      const id = await saveRequirements(row);
      await confirmRequirements(id, reviewedBy);
      setProject({ requirements: req, projectId: id, teamId: null, teamArrival: true });
      navigate({ to: "/equipos" });
    } catch (e) {
      setConfirmError(errText(e));
      setBusy(false);
    }
  }

  const missing = interpretation ? missingInfo(interpretation.requirements) : [];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mt-4">
          {said && (phase !== "intake" || interpretation) ? (
            <div className="mb-6 flex flex-col items-end gap-2">
              <p className="card line-clamp-3 max-w-xl whitespace-pre-wrap px-4 py-3 text-sm">{said}</p>
              {interpretation && phase === "intake" && missing.length > 0 && (
                <p role="status" className="max-w-xl border border-gold bg-warn-soft px-4 py-3 text-sm text-warn-ink">
                  Me falta: <b>{joinEs(missing)}</b>. Añádelo al texto y vuelve a enviar, o rellénalo en el formulario.{" "}
                  <button type="button" className="text-blue underline" onClick={() => newRequest(true)}>Editar la petición</button>
                </p>
              )}
            </div>
          ) : null}
          {phase === "reading" ? <><RocketJourney /><ReadingRequest onCancel={cancel} /></>
            : interpretation && phase === "intake" ? (
              <>
                <OrbitButton variant="ghost" className="mb-4 text-sm text-blue" onClick={() => newRequest(false)}>← Nueva petición</OrbitButton>
                <InterpretationView key={interpretation.source_text} result={interpretation} onConfirm={confirm} busy={busy} error={confirmError} />
              </>
            ) : (
              <>
                {phase === "error" && <p role="alert" className="mb-4 text-center text-sm text-gap">No hemos podido leer la petición. Inténtalo de nuevo.</p>}
                <PlanIntake key={draft} initialText={draft} onText={run} />
              </>
            )}
        </div>
      </div>
    </AppShell>
  );
}
