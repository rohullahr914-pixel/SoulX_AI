"use client";

import { useEffect } from "react";
import { refreshCurrentUser } from "@/lib/auth";
import { clearProfilePreferences, refreshProfilePreferences } from "@/lib/profile";
import { refreshCustomPersonas } from "@/lib/custom-personas";

export function AccountBootstrap() {
  useEffect(() => {
    let active = true;
    void refreshCurrentUser().then((user) => {
      if (!active) return;
      if (user) { void refreshProfilePreferences(user.id); void refreshCustomPersonas(); }
      else clearProfilePreferences();
    });
    return () => { active = false; };
  }, []);
  return null;
}
