import { Link } from "@tanstack/react-router";
import { useElapsed } from "@/hooks/use-elapsed";
import { RequisitosNoConfirmadosError } from "@/lib/matching";

/** Loading / error state of POST /match, shared by steps 2 and 3. */
export function MatchingStatus({ error }: { error: unknown }) {
  const seconds = useElapsed(!error);
  if (error instanceof RequisitosNoConfirmadosError) {
    return (
      <div role="alert" className="mx-auto mt-16 max-w-xl border border-gold bg-warn-soft p-5 text-center text-sm text-warn-ink">
        <p><b>Requirements must be confirmed before searching.</b></p>
        <Link to="/" className="mt-2 inline-block text-blue hover:underline">← Back to 1 · Need</Link>
      </div>
    );
  }
  if (error) return <p role="alert" className="mt-16 text-center text-gap">Could not calculate the fit.</p>;
  return (
    <div className="mt-16 text-center" role="status" aria-live="polite">
      <p className="text-lg text-muted-foreground">Searching for talent… <span className="tnum">{seconds}</span> s</p>
      {seconds >= 10 && <p className="mt-1 text-xs text-muted-foreground">The service can take up to ~75 s if it was idle.</p>}
    </div>
  );
}
