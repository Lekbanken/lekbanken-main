'use client'

import { use } from 'react'
import { PlayPlanPage } from "@/features/play/PlayPlanPage";

export default function PlayPlanRoute({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = use(params);
  return <PlayPlanPage planId={planId} />;
}
