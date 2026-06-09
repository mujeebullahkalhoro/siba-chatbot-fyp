"use client";

import React, { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import { useChat } from "@/context/ChatContext";

const GUIDE_SECTIONS = [
  {
    id: "timetable",
    titleKey: "help.cat.timetable.title",
    descKey: "help.cat.timetable.desc",
    exampleKeys: ["help.ex.timetable.1", "help.ex.timetable.2", "help.ex.timetable.3", "help.ex.timetable.4"],
  },
  {
    id: "admissions",
    titleKey: "help.cat.admissions.title",
    descKey: "help.cat.admissions.desc",
    exampleKeys: ["help.ex.admissions.1", "help.ex.admissions.2", "help.ex.admissions.3", "help.ex.admissions.4"],
  },
  {
    id: "scholarships",
    titleKey: "help.cat.scholarships.title",
    descKey: "help.cat.scholarships.desc",
    exampleKeys: ["help.ex.scholarships.1", "help.ex.scholarships.2", "help.ex.scholarships.3", "help.ex.scholarships.4"],
  },
  {
    id: "faculty",
    titleKey: "help.cat.faculty.title",
    descKey: "help.cat.faculty.desc",
    exampleKeys: ["help.ex.faculty.1", "help.ex.faculty.2", "help.ex.faculty.3", "help.ex.faculty.4"],
  },
  {
    id: "policies",
    titleKey: "help.cat.policies.title",
    descKey: "help.cat.policies.desc",
    exampleKeys: ["help.ex.policies.1", "help.ex.policies.2", "help.ex.policies.3", "help.ex.policies.4"],
  },
  {
    id: "programs",
    titleKey: "help.cat.programs.title",
    descKey: "help.cat.programs.desc",
    exampleKeys: ["help.ex.programs.1", "help.ex.programs.2", "help.ex.programs.3", "help.ex.programs.4"],
  },
  {
    id: "events",
    titleKey: "help.cat.events.title",
    descKey: "help.cat.events.desc",
    exampleKeys: ["help.ex.events.1", "help.ex.events.2", "help.ex.events.3"],
  },
];

export default function HelpPage() {
  const { darkMode } = useTheme();
  const { isRTL, t } = useLanguage();
  const router = useRouter();
  const { setCurrentMessage, textareaRef } = useChat();

  const handleQuestionClick = (query) => {
    setCurrentMessage(query);
    router.push("/dashboard");
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const sections = useMemo(
    () =>
      GUIDE_SECTIONS.map((s) => ({
        ...s,
        title: t(s.titleKey),
        description: t(s.descKey),
        examples: s.exampleKeys.map((k) => t(k)),
      })),
    [t]
  );

  return (
    <div
      className={`min-h-full p-4 sm:p-6 ${darkMode ? "bg-slate-900 text-white" : "bg-[#f5f8fc] text-gray-900"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-6xl">
        <div
          className={`rounded-3xl border px-5 sm:px-7 py-6 mb-5 ${
            darkMode ? "border-slate-700 bg-slate-900/70" : "border-[color:var(--border-soft)] bg-white"
          }`}
        >
          <div className="inline-flex items-center gap-2 text-xs mb-3 rounded-full px-3 py-1 border border-[#9ec3eb] bg-[#eaf3ff] text-[#003e80]">
            <span>{t("help.badge")}</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold ui-heading ${darkMode ? "text-white" : "text-[#003e80]"}`}>
            {t("help.title")}
          </h1>
          <p className={`mt-2 text-sm sm:text-base ${darkMode ? "text-slate-300" : "text-[color:var(--text-muted)]"}`}>
            {t("help.intro")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sections.map((category) => (
            <section
              key={category.id}
              className={`rounded-2xl border p-5 ${
                darkMode ? "border-slate-700 bg-slate-900/70" : "border-[color:var(--border-soft)] bg-white"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold">{category.title}</h2>
              </div>
              <p className={`text-sm mb-3 ${darkMode ? "text-slate-300" : "text-[color:var(--text-muted)]"}`}>
                {category.description}
              </p>
              <ul className="space-y-2">
                {category.examples.map((query) => (
                  <li
                    key={query}
                    onClick={() => handleQuestionClick(query)}
                    className={`cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md rounded-xl border px-3 py-2 text-sm ${
                      darkMode
                        ? "border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-700 hover:border-slate-500"
                        : "border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] text-gray-800 hover:bg-white hover:border-[#c4d4e8]"
                    }`}
                  >
                    {query}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
