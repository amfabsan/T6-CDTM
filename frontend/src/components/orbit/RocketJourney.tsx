import { Rocket } from 'lucide-react';

export function RocketJourney({ arriving = false }: { arriving?: boolean }) {
  return <div className={arriving ? 'rocket-arrival' : 'rocket-journey'} aria-hidden="true"><div className="rocket-path" /><Rocket className="rocket-icon" /><span className="rocket-target" /></div>;
}