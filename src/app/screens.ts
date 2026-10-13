// Écrans de l'appli : la liste des écrans possibles (Screen) et les écrans secondaires chargés à part.

import { lazy } from 'react';
import type { Puzzle } from '../core/types';
import type { CoachTab } from '../screens/CoachScreen';

/** Écran affiché (navigation interne de l'appli). */
export type Screen = { name: 'home' } | { name: 'training'; index: number } | { name: 'rush'; run: number; hw?: string } | { name: 'progress'; stats?: boolean } | { name: 'privacy' } | { name: 'legal' } | { name: 'review'; ids: string[]; index: number; maintenance?: boolean } | { name: 'technique'; id: string; n: number } | { name: 'daily' } | { name: 'leaderboard' } | { name: 'judgeQuiz' } | { name: 'lesson'; id: string } | { name: 'otherSide'; puzzle: Puzzle; index: number } | { name: 'challenge'; index: number } | { name: 'coach'; tab?: CoachTab } | { name: 'series' } | { name: 'seriesPlay'; index: number } | { name: 'exam'; group: string; index: number } | { name: 'examEnd'; group: string } | { name: 'analysis'; fen?: string; moves?: string[]; back?: Screen } | { name: 'help' } | { name: 'race'; code: string; rematch?: boolean; startsAt?: number };

// Écrans secondaires chargés à part : l'accueil et le jeu s'affichent plus vite.
const loadProgress = () => import('../screens/ProgressScreen');
const loadPrivacy = () => import('../screens/PrivacyScreen');
const loadLeaderboard = () => import('../screens/LeaderboardScreen');
export const CoachScreen = lazy(() => import('../screens/CoachScreen').then((m) => ({ default: m.CoachScreen })));
export const SeriesScreen = lazy(() => import('../screens/SeriesScreen').then((m) => ({ default: m.SeriesScreen })));
export const LessonScreen = lazy(() => import('../screens/LessonScreen').then((m) => ({ default: m.LessonScreen })));
export const RaceScreen = lazy(() => import('../screens/RaceScreen').then((m) => ({ default: m.RaceScreen })));
export const HelpScreen = lazy(() => import('../screens/HelpScreen').then((m) => ({ default: m.HelpScreen })));
export const AnalysisScreen = lazy(() => import('../screens/AnalysisScreen').then((m) => ({ default: m.AnalysisScreen })));
export const ExamScreen = lazy(() => import('../screens/ExamScreen').then((m) => ({ default: m.ExamScreen })));
export const JudgeQuizScreen = lazy(() => import('../screens/JudgeQuizScreen').then((m) => ({ default: m.JudgeQuizScreen })));
export const LeaderboardScreen = lazy(() => loadLeaderboard().then((m) => ({ default: m.LeaderboardScreen })));
export const ProgressScreen = lazy(() => loadProgress().then((m) => ({ default: m.ProgressScreen })));
export const PrivacyScreen = lazy(() => loadPrivacy().then((m) => ({ default: m.PrivacyScreen })));
export const LegalScreen = lazy(() => import('../screens/LegalScreen').then((m) => ({ default: m.LegalScreen })));
// … puis préchargés quelques secondes après l'ouverture (et gardés pour l'usage hors ligne).
if (typeof window !== 'undefined')
  window.setTimeout(() => {
    void loadProgress().catch(() => {});
    void loadPrivacy().catch(() => {});
    void loadLeaderboard().catch(() => {});
  }, 3_000);
