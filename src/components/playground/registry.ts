import { FractionExplorer } from "./fraction-explorer";
import { AlgebraBalance } from "./algebra-balance";
import { SolarSystem } from "./solar-system";
import { HtmlPlayground } from "./html-playground";
import { NumberLine } from "./number-line";
import { GeometryLab } from "./geometry-lab";
import { StatesOfMatter } from "./states-of-matter";
import { VocabularyChallenge } from "./vocabulary-challenge";

// Maps a playgroundActivities.slug to the real component that renders it.
// A catalog row only becomes clickable once its slug appears here — see
// src/app/playground/page.tsx and src/app/playground/[slug]/page.tsx.
export const PLAYGROUND_REGISTRY: Record<string, (props: { onFirstUse: () => void }) => React.JSX.Element> = {
  "fraction-explorer": FractionExplorer,
  "algebra-balance": AlgebraBalance,
  "solar-system": SolarSystem,
  "html-playground": HtmlPlayground,
  "number-line": NumberLine,
  "geometry-lab": GeometryLab,
  "states-of-matter": StatesOfMatter,
  "vocabulary-challenge": VocabularyChallenge,
};
