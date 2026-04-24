"use client";

import { useState } from "react";

const tabs = ["Feed", "Earnings", "Profile"] as const;

type Tab = (typeof tabs)[number];

export function SentiaTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("Feed");

  return (
    <main className="app-shell">
      <section className="tab-panel" aria-labelledby="active-tab-title">
        <p className="eyebrow">Sentia</p>
        <h1 id="active-tab-title">{activeTab}</h1>
      </section>

      <nav className="tab-bar" aria-label="Primary navigation">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className="tab-button"
            data-active={activeTab === tab}
            aria-current={activeTab === tab ? "page" : undefined}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>
    </main>
  );
}
