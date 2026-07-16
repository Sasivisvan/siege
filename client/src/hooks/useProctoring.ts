"use client";

import { useEffect, useState } from "react";

export function useProctoring() {
  const [webcamReady, setWebcamReady] = useState(false);
  const [riskScore, setRiskScore] = useState(0);

  useEffect(() => {
    setWebcamReady(true);
    setRiskScore(21);
  }, []);

  return { webcamReady, riskScore };
}
