import type { ReactNode } from 'react';
import { CLASSIC_COLLECTION } from '../cats/collections';
import { CatArt } from '../cats/CatArt';
import { ScreenHeader } from '../components/ui';

const cat = CLASSIC_COLLECTION.cats[0];
const cat2 = CLASSIC_COLLECTION.cats[4];

/** Tiny illustrative 4×4 grid. `cats` / `bad` / `crossed` are cell indexes. */
function Mini({ regions, cats = [], bad = [], crossed = [], blocked = [] }: { regions: string; cats?: number[]; bad?: number[]; crossed?: number[]; blocked?: number[] }) {
  const fills: Record<string, string> = { a: '#F9D9C2', b: '#CFEBD9', c: '#DDD6F3', d: '#D0E4F5' };
  return (
    <div className="grid size-[104px] shrink-0 grid-cols-4 overflow-hidden rounded-xl ring-2 ring-ink">
      {[...regions].map((r, i) => (
        <div key={i} className="relative border-[0.5px] border-ink/10" style={{ background: fills[r] }}>
          {blocked.includes(i) && <div className="absolute inset-0 bg-ink/10" />}
          {cats.includes(i) && <div className="absolute inset-[8%]">{cat && <CatArt cat={i === cats[0] ? cat : (cat2 ?? cat)} />}</div>}
          {bad.includes(i) && <div className="absolute inset-0 grid place-items-center bg-bad/60 text-[15px] font-black text-white">!</div>}
          {crossed.includes(i) && (
            <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto size-1/2 opacity-60">
              <path d="M6 6l12 12M18 6L6 18" stroke="#292929" strokeWidth="3.4" strokeLinecap="round" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

function Rule({ n, title, children, demo }: { n: number; title: string; children: ReactNode; demo: ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-soft">
      {demo}
      <div className="min-w-0">
        <div className="font-rounded text-[13px] font-extrabold text-orange-deep">Règle {n}</div>
        <div className="font-rounded text-[17px] leading-tight font-extrabold">{title}</div>
        <p className="mt-1 text-[13.5px] leading-snug text-ink-soft">{children}</p>
      </div>
    </div>
  );
}

const R = 'aabbaabbccddccdd';
/** L-shaped region so that the two cats do not touch. */
const R1 = 'abbbabccaaccdddc';

export function RulesScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Comment jouer" onBack={onBack} />
      <div className="scroll-area min-h-0 flex-1 space-y-3 px-4 pb-8">
        <p className="px-1 text-[15px] leading-relaxed text-ink-soft">
          Place <b className="text-ink">N chats</b> sur une grille N×N découpée en N régions colorées. Ce n’est pas un Sudoku : il
          n’y a pas de chiffres, seulement des chats qui ont besoin d’espace.
        </p>
        <Rule n={1} title="Une région = un chat" demo={<Mini regions={R1} cats={[0]} bad={[9]} />}>
          Chaque région colorée accueille exactement un chat.
        </Rule>
        <Rule n={2} title="Une ligne = un chat" demo={<Mini regions={R} cats={[1]} bad={[3]} />}>
          Jamais deux chats sur la même ligne.
        </Rule>
        <Rule n={3} title="Une colonne = un chat" demo={<Mini regions={R} cats={[1]} bad={[13]} />}>
          Jamais deux chats dans la même colonne.
        </Rule>
        <Rule n={4} title="Les chats ne se touchent pas" demo={<Mini regions={R} cats={[5]} blocked={[0, 1, 2, 4, 6, 8, 9, 10]} bad={[10]} />}>
          Même en diagonale, et même entre deux régions différentes. Les 8 cases autour d’un chat sont interdites.
        </Rule>
        <div className="rounded-2xl bg-orange-soft/70 p-4">
          <div className="font-rounded mb-1 text-[17px] font-extrabold">Les outils</div>
          <ul className="space-y-1.5 text-[14px] leading-snug text-ink-soft">
            <li>🐾 <b className="text-ink">Chat</b> : place un chat sur la case sélectionnée.</li>
            <li>✕ <b className="text-ink">Croix</b> : marque une case que tu penses impossible. Gratuit, sans risque.</li>
            <li>❤️ Un chat qui enfreint une règle coûte <b className="text-ink">une vie</b>. Trois erreurs et la partie s’arrête.</li>
            <li>💡 <b className="text-ink">Indice</b> : une piste, puis une explication, puis la case.</li>
          </ul>
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-soft">
          <Mini regions={R} cats={[1, 7, 8, 14]} crossed={[0, 3, 12, 15]} />
          <p className="text-[13.5px] leading-snug text-ink-soft">
            Astuce : cherche la région qui a le moins de cases libres, et élimine avec des croix tout ce qu’un chat rendrait impossible.
          </p>
        </div>
      </div>
    </div>
  );
}
