import type { CoachDiagramDocumentV1 } from '@/lib/validation/coachDiagramSchemaV1';

type CoachDiagramSportType = CoachDiagramDocumentV1['sportType'];
type CourtSportType = Exclude<CoachDiagramSportType, 'custom'>;

export const COURT_BACKGROUND_BY_SPORT: Record<CourtSportType, string> = {
  basketball: '/court/basket-court.png',
  football: '/court/football-court.png',
  handball: '/court/handball-court.png',
  hockey: '/court/hockey-court.png',
  innebandy: '/court/innebandy-court.png',
};

export function getCourtBackgroundUrl(sportType?: CoachDiagramSportType | null): string | null {
  if (!sportType || sportType === 'custom') return null;
  return COURT_BACKGROUND_BY_SPORT[sportType] ?? null;
}
