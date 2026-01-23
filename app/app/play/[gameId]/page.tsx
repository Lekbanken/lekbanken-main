import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ gameId: string }>;
};

export default async function StartGameSessionPage({ params }: Props) {
  const { gameId } = await params;
  redirect(`/app/games/${gameId}`);
}
