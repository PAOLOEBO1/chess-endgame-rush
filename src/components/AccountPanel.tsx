// Compte en ligne : connexion, création, mot de passe oublié, double
// authentification (TOTP), synchronisation, déconnexion, suppression.

import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import type { CloudAccount } from '../hooks/useCloudAccount';
import { turnstileSiteKey } from '../services/cloud';
import { linkedUser } from '../services/sync';
import { Turnstile } from './Turnstile';

const input = 'w-full rounded-lg bg-stone-900 px-3 py-2 text-stone-100 placeholder:text-stone-500';
const primary = 'rounded-lg bg-amber-500 px-4 py-2 font-semibold text-stone-900 hover:bg-amber-400 disabled:opacity-50';
const secondary = 'rounded-lg bg-stone-700 px-3 py-1.5 text-sm text-stone-100 hover:bg-stone-600 disabled:opacity-50';
const link = 'text-sm text-sky-400 hover:underline';

interface Props {
  account: CloudAccount;
  playerId: string | null;
  playerName: string | null;
  /** Nom du profil relié au compte connecté (null : aucun sur cet appareil). */
  linkedName: string | null;
  onSelectPlayer: (id: string | null) => void;
}

export function AccountPanel({ account, playerId, playerName, linkedName, onSelectPlayer }: Props) {
  const [tab, setTab] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [captcha, setCaptcha] = useState<string | undefined>();
  const [captchaReset, setCaptchaReset] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const onToken = useCallback((t: string | undefined) => setCaptcha(t), []);
  const a = account;

  if (!a.enabled) {
    return (
      <Box>
        <p className="text-sm text-stone-400">
          Comptes en ligne non configurés sur ce site : les profils restent enregistrés dans ce navigateur.
        </p>
      </Box>
    );
  }

  const submit = (fn: () => Promise<void>) => async (e: FormEvent) => {
    e.preventDefault();
    await fn();
    setPassword('');
    setCode('');
    setCaptchaReset((n) => n + 1);
  };
  const needCaptcha = !!turnstileSiteKey && !captcha;
  const msg = a.message && (
    <p role="status" className={`text-sm ${a.message.tone === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
      {a.message.text}
    </p>
  );

  // 1. Retour par le lien « mot de passe oublié »
  if (a.session && a.recovery) {
    return (
      <Box>
        <form className="flex flex-col gap-2" onSubmit={submit(() => a.setNewPassword(password))}>
          <label className="text-sm text-stone-300" htmlFor="newpw">
            Nouveau mot de passe (12 caractères min., majuscules, minuscules, chiffres)
          </label>
          <PasswordBox show={showPw} onToggle={() => setShowPw((v) => !v)}>
            <input id="newpw" type={showPw ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="new-password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={12} maxLength={72} />
          </PasswordBox>
          <button type="submit" className={primary} disabled={a.busy}>
            Enregistrer
          </button>
        </form>
        {msg}
      </Box>
    );
  }

  // 2. Mot de passe correct, code 2FA attendu
  if (a.session && a.needMfa) {
    return (
      <Box>
        <form className="flex flex-col gap-2" onSubmit={submit(() => a.verifyMfa(code))}>
          <label className="text-sm text-stone-300" htmlFor="mfa">
            Code à 6 chiffres de votre application d’authentification
          </label>
          <input id="mfa" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} className={input} value={code} onChange={(e) => setCode(e.target.value)} required />
          <div className="flex gap-2">
            <button type="submit" className={primary} disabled={a.busy}>
              Valider
            </button>
            <button type="button" className={secondary} onClick={() => a.signOut(false)}>
              Annuler
            </button>
          </div>
        </form>
        {msg}
      </Box>
    );
  }

  // 3. Connecté
  if (a.session) {
    const linked = playerId ? linkedUser(playerId) === a.session.user.id : false;
    return (
      <Box>
        <p className="text-sm text-stone-200">
          ☁ Connecté : <strong>{a.email}</strong>
          {linked && playerName && <> · profil du compte : <strong>{playerName}</strong></>}
        </p>
        {a.linkChoice && (
          <div className="flex flex-col gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-stone-200">
            <p>
              Le profil <strong>« {a.linkChoice.name} »</strong> de cet appareil a déjà {a.linkChoice.entries} entrée(s), et le compte{' '}
              <strong>« {a.linkChoice.pseudo} »</strong> a aussi son historique. Que faire ?
            </p>
            {/* Même nom que le compte : c'est sans doute le même joueur, la fusion est le bon choix. */}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={a.linkChoice.name === a.linkChoice.pseudo ? secondary : primary} disabled={a.busy} onClick={() => a.resolveLink(false)}>
                Récupérer le profil du compte{a.linkChoice.name === a.linkChoice.pseudo ? '' : ' (recommandé)'}
              </button>
              <button type="button" className={a.linkChoice.name === a.linkChoice.pseudo ? primary : secondary} disabled={a.busy} onClick={() => a.resolveLink(true)}>
                C’est moi : fusionner « {a.linkChoice.name} » dans le compte{a.linkChoice.name === a.linkChoice.pseudo ? ' (recommandé)' : ''}
              </button>
            </div>
            <p className="text-xs text-stone-400">
              « Récupérer » crée sur cet appareil le profil du compte avec tout son historique ; « {a.linkChoice.name} » reste à part, sur
              cet appareil seulement.
            </p>
          </div>
        )}
        {!a.linkChoice && !linked && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 text-sm text-stone-200">
            <span className="min-w-0 flex-1">
              {playerName ? <>Le profil « {playerName} » n’est pas celui du compte : ses parties restent sur cet appareil.</> : <>En invité, les parties ne sont pas enregistrées.</>}
            </span>
            {a.linkedPlayerId && linkedName ? (
              <button type="button" className={primary} onClick={() => onSelectPlayer(a.linkedPlayerId)}>
                Revenir à « {linkedName} » ☁
              </button>
            ) : (
              playerId && (
                <button type="button" className={primary} disabled={a.busy} onClick={() => a.linkCurrent()}>
                  Relier « {playerName} » au compte ☁
                </button>
              )
            )}
          </div>
        )}
        <p className="text-xs text-stone-400">
          {a.pending ? `${a.pending} entrée(s) en attente d’envoi. ` : 'Tout est envoyé. '}
          {a.lastSync && `Dernière synchronisation : ${new Date(a.lastSync).toLocaleTimeString('fr-FR')}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondary} disabled={a.busy} onClick={() => a.syncNow()}>
            ⟳ Synchroniser
          </button>
          <button type="button" className={secondary} disabled={a.busy} onClick={() => a.signOut(false)}>
            Se déconnecter
          </button>
          <button type="button" className={secondary} disabled={a.busy} onClick={() => a.signOut(true)}>
            Déconnecter tous les appareils
          </button>
        </div>

        {a.publicProfile && <LeaderboardOptIn account={a} />}

        <details className="rounded-lg bg-stone-900/60 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-stone-200">
            🔐 Double authentification {a.totpFactors.length ? '(activée)' : '(recommandée)'}
          </summary>
          <div className="mt-2 flex flex-col gap-2 text-sm text-stone-300">
            {a.totpFactors.map((f) => (
              <div key={f.id} className="flex items-center gap-2">
                ✅ Application d’authentification active
                <button type="button" className={secondary} disabled={a.busy} onClick={() => a.disableMfa(f.id)}>
                  Désactiver
                </button>
              </div>
            ))}
            {!a.totpFactors.length && !a.enrolling && (
              <>
                <p>Protège le compte même si le mot de passe est volé : un code de votre téléphone sera demandé à chaque connexion.</p>
                <button type="button" className={primary} disabled={a.busy} onClick={() => a.startMfaEnroll()}>
                  Activer
                </button>
              </>
            )}
            {a.enrolling && (
              <form className="flex flex-col gap-2" onSubmit={submit(() => a.confirmMfaEnroll(code))}>
                <p>1. Scannez ce QR code avec une application (Google Authenticator, Microsoft Authenticator, 2FAS, Aegis…).</p>
                <img src={a.enrolling.qr} alt="QR code de la double authentification" className="h-44 w-44 rounded bg-white p-2" />
                <p className="text-xs text-stone-400">
                  Ou saisissez la clé : <code className="select-all break-all">{a.enrolling.secret}</code>
                </p>
                <label htmlFor="enroll">2. Entrez le code affiché :</label>
                <input id="enroll" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} className={input} value={code} onChange={(e) => setCode(e.target.value)} required />
                <div className="flex gap-2">
                  <button type="submit" className={primary} disabled={a.busy}>
                    Confirmer
                  </button>
                  <button type="button" className={secondary} onClick={() => a.cancelMfaEnroll()}>
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        </details>

        <details className="rounded-lg bg-stone-900/60 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-stone-200">Gérer le compte</summary>
          <div className="mt-2 flex flex-col gap-2 text-sm text-stone-300">
            <button type="button" className={`${secondary} self-start`} disabled={a.busy} onClick={() => a.unlinkProfile()}>
              Délier ce profil du compte
            </button>
            {confirmDelete === null ? (
              <button type="button" className="self-start text-sm text-red-400 hover:underline" onClick={() => setConfirmDelete('')}>
                🗑 Supprimer mon compte en ligne…
              </button>
            ) : (
              <form className="flex flex-col gap-2" onSubmit={submit(() => a.deleteAccount(confirmDelete))}>
                <label htmlFor="del">
                  Suppression <strong>définitive</strong> du compte et de ses données en ligne. Tapez votre email pour confirmer :
                </label>
                <input id="del" type="email" autoComplete="off" className={input} value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} required />
                <div className="flex gap-2">
                  <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500 disabled:opacity-50" disabled={a.busy}>
                    Supprimer définitivement
                  </button>
                  <button type="button" className={secondary} onClick={() => setConfirmDelete(null)}>
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        </details>
        {msg}
      </Box>
    );
  }

  // 4. Déconnecté
  return (
    <Box>
      <div className="rounded-lg bg-sky-500/10 p-3 text-sm text-stone-200">
        <p className="font-semibold">Pourquoi un compte ? (gratuit, facultatif)</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>Retrouver tes parties et ta progression sur tous tes appareils.</li>
          <li>Ne rien perdre si tu changes de téléphone ou effaces ton navigateur.</li>
          <li>Apparaître, si tu le veux, au classement du club et au défi de la semaine.</li>
        </ul>
      </div>
      <div className="flex gap-2">
        {(
          [
            ['login', 'Connexion'],
            ['signup', 'Créer un compte'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${tab === id ? 'bg-amber-500 text-stone-900' : 'bg-stone-800 text-stone-200'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={submit(() =>
          tab === 'login' ? a.signIn(email, password, captcha) : tab === 'signup' ? a.signUp(email, password, captcha) : a.resetPassword(email, captcha),
        )}
      >
        <input type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} />
        {tab !== 'reset' && (
          <PasswordBox show={showPw} onToggle={() => setShowPw((v) => !v)}>
          <input
            type={showPw ? 'text' : 'password'}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
            placeholder={tab === 'signup' ? 'Mot de passe (12 caractères min.)' : 'Mot de passe'}
            className={input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={tab === 'signup' ? 12 : 1}
            maxLength={72}
          />
          </PasswordBox>
        )}
        {turnstileSiteKey && <Turnstile siteKey={turnstileSiteKey} onToken={onToken} resetSignal={captchaReset} />}
        <button type="submit" className={primary} disabled={a.busy || needCaptcha}>
          {tab === 'login' ? 'Se connecter' : tab === 'signup' ? 'Créer le compte' : 'Recevoir le lien'}
        </button>
      </form>
      <button type="button" className={`${link} self-start`} onClick={() => setTab(tab === 'reset' ? 'login' : 'reset')}>
        {tab === 'reset' ? '← Retour à la connexion' : 'Mot de passe oublié ?'}
      </button>
      {tab === 'signup' && (
        <p className="text-xs text-stone-400">
          Première connexion : le profil sélectionné devient celui du compte et son historique y est envoyé. Sur un autre
          appareil, la connexion y retrouve ce profil, avec son nom et tout son historique. Données conservées : email, pseudo,
          puzzles et parties. Aucun autre usage.
        </p>
      )}
      {msg}
    </Box>
  );
}

/** Champ mot de passe avec bouton pour l'afficher (utile sur téléphone). */
function PasswordBox({ show, onToggle, children }: { show: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-2 px-2 text-sm text-stone-400 hover:text-stone-100"
        aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        title={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      >
        {show ? '🙈' : '👁'}
      </button>
    </div>
  );
}

function Box({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-stone-700 p-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Compte en ligne</h3>
      {children}
    </div>
  );
}

/** Participation volontaire au classement public, sous un pseudo. */
/** Participation au classement : pseudo public et attestation d'âge (aussi affiché dans l'écran Classement). */
export function LeaderboardOptIn({ account: a, standalone = false }: { account: CloudAccount; standalone?: boolean }) {
  const current = a.publicProfile!;
  const [pseudo, setPseudo] = useState(current.pseudo);
  const [ageOk, setAgeOk] = useState(current.ageOk);
  return (
    <details className="rounded-lg bg-stone-900/60 p-3" open={standalone || !current.leaderboard}>
      <summary className="cursor-pointer text-sm font-semibold text-stone-200">
        🏆 Classement {current.leaderboard ? `(vous y figurez : ${current.pseudo})` : '(non affiché)'}
      </summary>
      <div className="mt-2 flex flex-col gap-2 text-sm text-stone-300">
        <p>
          Facultatif. Si vous participez, votre <strong>pseudo</strong> et vos résultats (Elo, record Storm, défi de la semaine, puzzles réussis
          de la semaine) sont visibles par <strong>tous les visiteurs du site</strong>. Votre email n’est jamais affiché.
          Vous pouvez vous retirer à tout moment.
        </p>
        <label htmlFor="lb-pseudo">Pseudo public :</label>
        <input
          id="lb-pseudo"
          className={input}
          value={pseudo}
          maxLength={30}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => setPseudo(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {current.leaderboard ? (
            <>
              <button type="button" className={secondary} disabled={a.busy || pseudo.trim() === current.pseudo} onClick={() => a.setLeaderboard(true, pseudo)}>
                Changer de pseudo
              </button>
              <button type="button" className={secondary} disabled={a.busy} onClick={() => a.setLeaderboard(false, current.pseudo)}>
                Me retirer du classement
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} />
                <span>
                  J’ai <strong>15 ans ou plus</strong>, ou un parent a donné son accord. (En France, un mineur de moins de 15 ans a besoin de
                  l’accord d’un parent pour ce type de publication.)
                </span>
              </label>
              <button type="button" className={`${primary} self-start`} disabled={a.busy || !ageOk} onClick={() => a.setLeaderboard(true, pseudo, ageOk)}>
                Apparaître dans le classement
              </button>
              {!ageOk && <p className="text-xs text-stone-400">Coche d’abord la case ci-dessus pour activer le bouton.</p>}
            </div>
          )}
        </div>
        {standalone && a.message && (
          <p role="status" className={`text-sm ${a.message.tone === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
            {a.message.text}
          </p>
        )}
      </div>
    </details>
  );
}
