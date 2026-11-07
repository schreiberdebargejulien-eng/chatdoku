import { useState } from 'react';
import type { ReactNode } from 'react';
import { COLLECTIONS } from '../cats/collections';
import { CatArt } from '../cats/CatArt';
import { ConfirmModal } from '../components/overlays';
import { ScreenHeader, Toggle } from '../components/ui';
import { useGameStore } from '../store/gameStore';

function Row({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-semibold">{title}</div>
        {detail && <div className="mt-0.5 text-[13px] leading-snug text-muted">{detail}</div>}
      </div>
      {children}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-1.5 px-4 text-[13px] font-bold tracking-wide text-muted uppercase">{title}</h2>
      <div className="divide-y divide-sand overflow-hidden rounded-2xl bg-white shadow-soft">{children}</div>
    </section>
  );
}

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const settings = useGameStore((s) => s.settings);
  const update = useGameStore((s) => s.updateSettings);
  const resetStats = useGameStore((s) => s.resetStats);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Paramètres" onBack={onBack} />
      <div className="scroll-area min-h-0 flex-1 px-4 pt-2 pb-8">
        <Group title="Jeu">
          <Row title="Vérification stricte" detail="Un chat qui ne mène à aucune solution coûte une vie, comme une règle enfreinte.">
            <Toggle label="Vérification stricte" checked={settings.strictMode} onChange={(v) => update({ strictMode: v })} />
          </Row>
          <Row title="Afficher les cases interdites" detail="Les cases bloquées par un chat (ligne, colonne, région, voisines) sont grisées.">
            <Toggle label="Afficher les cases interdites" checked={settings.showBlocked} onChange={(v) => update({ showBlocked: v })} />
          </Row>
          <Row title="Croix automatiques" detail="Pose une croix sur chaque case rendue impossible par un nouveau chat.">
            <Toggle label="Croix automatiques" checked={settings.autoCross} onChange={(v) => update({ autoCross: v })} />
          </Row>
        </Group>

        <Group title="Saisie">
          <div className="p-3">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['select', 'Sélection', 'Touche une case, puis Chat ou Croix (ou retouche la case).'],
                  ['quick', 'Rapide', 'Une touche applique l’outil actif. Glisse pour poser des croix.'],
                ] as const
              ).map(([mode, label, text]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => update({ inputMode: mode })}
                  className={`rounded-xl p-3 text-left transition ${settings.inputMode === mode ? 'bg-ink text-cream' : 'bg-sand/70'}`}
                >
                  <div className="font-rounded text-[15px] font-extrabold">{label}</div>
                  <div className={`mt-1 text-[12px] leading-snug ${settings.inputMode === mode ? 'text-cream/75' : 'text-muted'}`}>{text}</div>
                </button>
              ))}
            </div>
          </div>
        </Group>

        <Group title="Ambiance">
          <Row title="Sons">
            <Toggle label="Sons" checked={settings.sound} onChange={(v) => update({ sound: v })} />
          </Row>
          <div className="px-4 py-3.5">
            <div className="mb-2 text-[16px] font-semibold">Collection de chats</div>
            <div className="flex gap-2">
              {COLLECTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => update({ collection: c.id })}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 ${settings.collection === c.id ? 'bg-orange-soft ring-2 ring-orange' : 'bg-sand/70'}`}
                >
                  <span className="flex -space-x-2">
                    {c.cats.slice(0, 3).map((cat) => (
                      <span key={cat.id} className="size-7">
                        <CatArt cat={cat} />
                      </span>
                    ))}
                  </span>
                  <span className="text-[14px] font-bold">{c.name}</span>
                </button>
              ))}
              <span className="flex items-center rounded-xl border border-dashed border-sand-deep px-3 text-[12px] text-muted">Bientôt…</span>
            </div>
          </div>
        </Group>

        <Group title="Données">
          <button type="button" onClick={() => setConfirmReset(true)} className="w-full px-4 py-3.5 text-left text-[16px] font-semibold text-bad-deep active:bg-bad-soft">
            Réinitialiser les statistiques
          </button>
        </Group>
        <p className="text-center text-[12px] text-muted">Chatdoku · v{__APP_VERSION__} · fonctionne hors ligne</p>
      </div>
      <ConfirmModal
        open={confirmReset}
        title="Tout effacer ?"
        message="Statistiques et succès seront remis à zéro. Ta partie en cours est conservée."
        confirmLabel="Effacer"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetStats();
          setConfirmReset(false);
        }}
      />
    </div>
  );
}
