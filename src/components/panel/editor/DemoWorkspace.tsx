"use client";

import { useState } from "react";
import { demoDossier } from "@/lib/dossier/demo-repo";
import { DossierWorkspace } from "./DossierWorkspace";

export function DemoWorkspace() {
  const [initial] = useState(demoDossier);
  return <DossierWorkspace initial={initial} demo />;
}
