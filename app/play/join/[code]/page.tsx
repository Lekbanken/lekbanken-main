"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JoinCodeRedirect({ params }: { params: { code: string } }) {
  const router = useRouter();
  useEffect(() => {
    if (params.code) {
      router.replace(`/play/session/${params.code}`);
    }
  }, [params.code, router]);
  return null;
}
