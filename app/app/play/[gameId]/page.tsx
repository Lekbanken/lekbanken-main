import { PlayPage } from "@/features/play/PlayPage";

export default function PlayGamePage({ params }: { params: { gameId: string } }) {
  return <PlayPage gameId={params.gameId} />;
}
