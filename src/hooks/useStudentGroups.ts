// Groupes d'entraîneur rejoints par l'élève (thème « Entraîneur ») : un élève peut être dans plusieurs
// groupes (10 au plus) et en choisit un pour jouer (groupe actif). Ouverture d'un lien #groupe=CODE,
// mise à jour silencieuse des autres groupes, partage des résultats avec l'entraîneur, groupe par groupe.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { classify } from '../app/catalog';
import { GROUP_LINK } from '../app/links';
import { coachPuzzles } from '../core/coachSet';
import { activeGroup, MAX_JOINED } from '../core/studentGroups';
import { declineShare, fetchGroupSet, forgetJoinedGroup, joinedGroups, joinTracking, keepJoinedGroup, leaveTracking, memberships, selectJoinedGroup } from '../services/coachSets';

/** `onLinkOpened` : appelé si l'appli s'ouvre sur un lien de groupe (pour afficher le thème « Entraîneur »). */
export function useStudentGroups(onLinkOpened: () => void) {
  const [joined, setJoined] = useState(() => joinedGroups());
  const [members, setMembers] = useState(() => memberships());
  const [coachNotice, setCoachNotice] = useState<string | null>(null);
  const refreshGroups = useCallback(() => {
    setJoined(joinedGroups());
    setMembers(memberships());
  }, []);
  const coachSet = useMemo(() => activeGroup(joined), [joined]);
  const declined = !!coachSet && joined.declined.includes(coachSet.code);
  const coachPool = useMemo(() => (coachSet ? coachPuzzles(coachSet.code, coachSet.items).map(classify) : []), [coachSet]);
  const joinGroup = useCallback(
    async (code: string): Promise<string | null> => {
      try {
        const set = await fetchGroupSet(code);
        if (!set) return 'Code inconnu : vérifie-le auprès de ton entraîneur.';
        if (!keepJoinedGroup(set, true)) return `Tu es déjà dans ${MAX_JOINED} groupes : quittes-en un avant d’en ajouter un autre.`;
        setCoachNotice(null);
        refreshGroups();
        return null;
      } catch {
        return 'Groupe indisponible pour le moment (connexion). Réessaie plus tard.';
      }
    },
    [refreshGroups],
  );
  useEffect(() => {
    // Lien #groupe=CODE : ajouter ce groupe (sans quitter les autres) et ouvrir le thème.
    if (GROUP_LINK) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      onLinkOpened();
      void joinGroup(GROUP_LINK).then((err) => setCoachNotice(err));
    }
    // Mise à jour silencieuse des autres groupes déjà rejoints (hors ligne : copies locales).
    for (const g of joinedGroups().groups) {
      if (g.code === GROUP_LINK) continue;
      fetchGroupSet(g.code)
        .then((set) => {
          if (!set || !joinedGroups().groups.some((x) => x.code === set.code)) return; // quitté entre-temps
          keepJoinedGroup(set, false);
          refreshGroups();
        })
        .catch(() => {
          /* hors ligne : copie locale */
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une fois à l'ouverture
  }, []);

  /** Choisit le groupe joué. */
  const select = useCallback(
    (code: string) => {
      selectJoinedGroup(code);
      refreshGroups();
    },
    [refreshGroups],
  );
  /** Quitte le groupe joué (son suivi est effacé ; les autres groupes ne changent pas). */
  const leave = useCallback(() => {
    if (!coachSet) return;
    void leaveTracking(coachSet.code); // ce groupe seulement
    forgetJoinedGroup(coachSet.code);
    refreshGroups();
  }, [coachSet, refreshGroups]);
  /** Partage ses résultats avec l'entraîneur du groupe joué, sous un pseudo. */
  const share = useCallback(
    async (pseudo: string): Promise<string | null> => {
      if (!coachSet) return 'Rejoins d’abord un groupe.';
      const err = await joinTracking(coachSet.code, pseudo); // les suivis dans les autres groupes ne changent pas
      if (!err) refreshGroups();
      return err;
    },
    [coachSet, refreshGroups],
  );
  const decline = useCallback(() => {
    if (coachSet) declineShare(coachSet.code);
    refreshGroups();
  }, [coachSet, refreshGroups]);
  const stopShare = useCallback(() => {
    if (!coachSet) return;
    void leaveTracking(coachSet.code);
    declineShare(coachSet.code);
    refreshGroups();
  }, [coachSet, refreshGroups]);
  const tracking = coachSet && members[coachSet.code] ? { pseudo: members[coachSet.code].pseudo } : null;

  return { joined, members, coachNotice, refreshGroups, coachSet, declined, coachPool, joinGroup, select, leave, share, decline, stopShare, tracking };
}
