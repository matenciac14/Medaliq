'use client'

import { useState } from 'react'

interface ProfileTab {
  label: string
  title: string
  desc: string
  gets: string
}

interface ProfileTabsProps {
  tabs: ProfileTab[]
  ctaLabel: string
  ctaHref?: string
}

export default function ProfileTabs({ tabs, ctaLabel, ctaHref = '/onboarding' }: ProfileTabsProps) {
  const [active, setActive] = useState(0)
  const current = tabs[active]

  return (
    <div className="max-w-3xl mx-auto">
      {/* Tab buttons */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
              active === i
                ? 'bg-[#1e3a5f] text-white shadow-md scale-105'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-[#1e3a5f] hover:text-[#1e3a5f]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <div
        key={active}
        className="bg-white rounded-2xl border border-gray-100 shadow-lg p-8 text-left transition-all"
        style={{ animation: 'fadeUp 0.3s ease both' }}
      >
        <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">{current.title}</h3>
        <p className="text-gray-600 text-base leading-relaxed mb-6">{current.desc}</p>
        <div className="bg-gray-50 rounded-xl px-5 py-3 mb-6">
          <p className="text-sm text-gray-500 font-medium">{current.gets}</p>
        </div>
        <a href={ctaHref}>
          <button className="bg-[#f97316] hover:bg-[#ea6c0a] text-white font-bold px-6 py-3 rounded-xl text-sm transition-transform hover:scale-105 active:scale-95">
            {ctaLabel}
          </button>
        </a>
      </div>
    </div>
  )
}
