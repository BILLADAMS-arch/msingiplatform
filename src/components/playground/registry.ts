import { FractionExplorer } from "./fraction-explorer";
import { AlgebraBalance } from "./algebra-balance";
import { SolarSystem } from "./solar-system";
import { HtmlPlayground } from "./html-playground";

// Maps a playgroundActivities.slug to the real component that renders it.
// A catalog row only becomes clickable once its slug appears here — see
// src/app/playground/page.tsx and src/app/playground/[slug]/page.tsx.
export const PLAYGROUND_REGISTRY: Record<string, (props: { onFirstUse: () => void }) => React.JSX.Element> = {
  "fraction-explorer": FractionExplorer,
  "algebra-balance": AlgebraBalance,
  "solar-system": SolarSystem,
  "html-playground": HtmlPlayground,
};
