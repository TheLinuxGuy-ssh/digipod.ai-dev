"use client";
import { SWRConfig, Cache } from "swr";
import React from "react";

function localStorageProvider(): Cache {
  if (typeof window === "undefined") {
    return new Map();
  }
  const map = new Map<string, unknown>(
    JSON.parse(localStorage.getItem("app-cache") || "[]")
  );
  window.addEventListener("beforeunload", () => {
    localStorage.setItem("app-cache", JSON.stringify(Array.from(map.entries())));
  });
  return map as Cache;
}

export default function SWRProvider({ children }: { children: React.ReactNode }) {
  if (typeof window === "undefined") {
    return <>{children}</>;
  }
  return (
    <SWRConfig value={{ provider: localStorageProvider }}>
      {children}
    </SWRConfig>
  );
} 