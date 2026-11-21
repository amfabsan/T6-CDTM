import { Link } from "@tanstack/react-router";
import { useElapsed } from "@/hooks/use-elapsed";
import { RequisitosNoConfirmadosError } from "@/lib/matching";

/** Loading / error state of POST /match, shared by steps 2 and 3. */
export function MatchingStatus({ error }: { error: unknown }) {
  const seconds = useElapsed(!error);
  if (error instanceof RequisitosNoConfirmadosError) {
    return (
      <div role="alert" className="mx-auto mt-16 max-w-xl border border-gold bg-warn-soft p-5 text-center text-sm text-warn-ink">
        <p><b>Los requisitos deben estar confirmados antes de buscar.</b></p>
        <Link to="/" className="mt-2 inline-block text-blue hover:underline">← Volver a 1 · Necesidad</Link>
      </div>
    );
  }
  if (error) return <p role="alert" className="mt-16 text-center text-gap">No se ha podido calcular el encaje.</p>;
  return (
    <div className="mt-16 text-center" role="status" aria-live="polite">
      <p className="text-lg text-muted-foreground">Buscando talento… <span className="tnum">{seconds}</span> s</p>
      {seconds >= 10 && <p className="mt-1 text-xs text-muted-foreground">El servicio puede tardar hasta ~75 s si estaba en reposo.</p>}
    </div>
  );
}
