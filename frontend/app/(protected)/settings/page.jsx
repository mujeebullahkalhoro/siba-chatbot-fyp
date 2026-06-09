"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  getProfile,
  getUserSettings,
  saveUserSettings,
  toggleTwoFactor,
  updateProfile,
} from "@/services/settingsService";

const CATEGORY_KEYS = [
  { key: "profile", labelKey: "settingsPage.cat.profile" },
  { key: "security", labelKey: "settingsPage.cat.security" },
  { key: "voice", labelKey: "settingsPage.cat.voice" },
];

const DEFAULT_SETTINGS = {
  auto_speak: false,
};

function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ui-focus-ring ${
        checked ? "bg-[#0056b3]" : "bg-slate-300"
      } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { darkMode } = useTheme();
  const { isRTL, t, lang } = useLanguage();
  const { refreshUser } = useAuth();
  const [activeCategory, setActiveCategory] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [profile, setProfile] = useState({ name: "", email: "", picture: "" });
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const categories = useMemo(
    () => CATEGORY_KEYS.map((c) => ({ ...c, label: t(c.labelKey) })),
    [t]
  );

  const initials = useMemo(() => (profile?.name?.[0] || profile?.email?.[0] || "U").toUpperCase(), [profile]);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, settingsRes] = await Promise.all([getProfile(), getUserSettings()]);
        setProfile({
          name: profileRes.name || "",
          email: profileRes.email || "",
          picture: profileRes.picture || "",
        });
        setSettings((prev) => ({ ...prev, ...(settingsRes.settings || {}) }));
        setTwoFactorEnabled(Boolean(settingsRes.two_factor_enabled));
      } catch (e) {
        setError(e?.message || t("settingsPage.error.load"));
      }
    };
    load();
    // t tracks current language via lang; reload when language changes so labels stay in sync
  }, [lang]);

  useEffect(() => {
    if (!notice && !error) return;
    const timer = setTimeout(() => {
      setNotice("");
      setError("");
    }, 2200);
    return () => clearTimeout(timer);
  }, [notice, error]);

  const handleProfileSave = async () => {
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      await updateProfile({ name: profile.name.trim(), picture: profile.picture || null });
      await refreshUser?.();
      localStorage.setItem("siba_settings_updated_at", String(Date.now()));
      setNotice(t("settingsPage.notice.profile"));
    } catch (e) {
      setError(e?.message || t("settingsPage.error.profile"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingsSave = async () => {
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      await saveUserSettings(settings);
      localStorage.setItem("siba_settings_updated_at", String(Date.now()));
      setNotice(t("settingsPage.notice.settings"));
    } catch (e) {
      setError(e?.message || t("settingsPage.error.settings"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTwoFactorToggle = async (enabled) => {
    setError("");
    setNotice("");
    try {
      await toggleTwoFactor(enabled);
      setTwoFactorEnabled(enabled);
      localStorage.setItem("siba_settings_updated_at", String(Date.now()));
      setNotice(enabled ? t("settingsPage.notice.twofaOn") : t("settingsPage.notice.twofaOff"));
    } catch (e) {
      setError(e?.message || t("settingsPage.error.twofa"));
    }
  };

  const onImageSelected = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((prev) => ({ ...prev, picture: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  const alignClass = isRTL ? "text-right" : "text-left";

  return (
    <div
      className={`min-h-full p-4 sm:p-6 ${isRTL ? "font-urdu" : ""} ${darkMode ? "bg-slate-900 text-white" : "bg-[#f5f8fc] text-gray-900"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-6xl mb-4">
        <h1 className={`text-2xl font-bold ui-heading ${darkMode ? "text-white" : "text-[#003e80]"}`}>{t("settings.title")}</h1>
        <p className={`mt-1 text-sm ${darkMode ? "text-slate-300" : "text-[color:var(--text-muted)]"}`}>
          {t("settingsPage.subtitle")}
        </p>
      </div>

      {(notice || error) && (
        <div className="mx-auto max-w-6xl mb-3">
          <div
            className={`rounded-xl border px-4 py-2 text-sm shadow-sm ${
              error
                ? darkMode
                  ? "border-red-800 bg-red-950/60 text-red-200"
                  : "border-red-200 bg-red-50 text-red-700"
                : darkMode
                  ? "border-emerald-800 bg-emerald-950/60 text-emerald-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || notice}
          </div>
        </div>
      )}

      <div className={`mx-auto max-w-6xl rounded-2xl border shadow-lg overflow-hidden ${darkMode ? "border-slate-700 bg-slate-900" : "border-[color:var(--border-soft)] bg-white"}`}>
        <div className="flex flex-col md:flex-row min-h-[76vh]">
          <aside className={`md:w-64 p-4 border-b md:border-b-0 md:border-r ${darkMode ? "border-slate-700 bg-slate-950/70" : "border-[color:var(--border-soft)] bg-[color:var(--surface-soft)]"}`}>
            <h2 className={`text-base font-semibold mb-3 ${darkMode ? "text-slate-200" : "text-[#003e80]"}`}>{t("settingsPage.categories")}</h2>
            <div className="space-y-2">
              {categories.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveCategory(item.key)}
                  className={`w-full ${alignClass} rounded-xl px-3 py-2.5 text-sm transition ui-control ui-focus-ring ${
                    activeCategory === item.key
                      ? darkMode
                        ? "bg-slate-800 text-white border border-slate-600 shadow"
                        : "bg-[#eaf3ff] text-[#003e80] border border-[#c9defa] shadow-sm"
                      : darkMode
                        ? "text-slate-300 hover:bg-slate-800 border border-transparent"
                        : "text-gray-700 hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          <section className="flex-1 p-5 sm:p-7">
            {activeCategory === "profile" && (
              <div className={`space-y-5 max-w-2xl rounded-2xl border p-5 ${darkMode ? "border-slate-700 bg-slate-900/60" : "border-[color:var(--border-soft)] bg-white"}`}>
                <h2 className="text-lg font-semibold">{t("settingsPage.profileInfo")}</h2>
                <div className="flex items-center gap-4">
                  {profile.picture ? (
                    <img src={profile.picture} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white shadow" />
                  ) : (
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center font-semibold text-lg ${darkMode ? "bg-slate-700" : "bg-gray-200"}`}>
                      {initials}
                    </div>
                  )}
                  <label className="text-sm">
                    <span className={`${isRTL ? "ml-2" : "mr-2"} font-medium`}>{t("settingsPage.uploadImage")}</span>
                    <input className="block mt-2 text-xs" type="file" accept="image/*" onChange={(e) => onImageSelected(e.target.files?.[0])} />
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="block mb-1">{t("settingsPage.name")}</span>
                  <input
                    value={profile.name}
                    onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2.5 ui-focus-ring ${darkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-[color:var(--border-soft)] text-black"}`}
                  />
                </label>
                <label className="block text-sm">
                  <span className="block mb-1">{t("settingsPage.email")}</span>
                  <input value={profile.email} readOnly className={`w-full rounded-xl border px-3 py-2.5 opacity-80 ${darkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-gray-50 border-[color:var(--border-soft)] text-black"}`} />
                </label>
                <div className={`sticky bottom-0 pt-2 ${darkMode ? "bg-slate-900/80" : "bg-white/80"} backdrop-blur-sm`}>
                  <button onClick={handleProfileSave} disabled={isSaving} className="ui-primary-btn rounded-lg px-4 py-2 text-sm ui-control ui-focus-ring">
                    {isSaving ? t("settingsPage.saving") : t("settingsPage.saveProfile")}
                  </button>
                </div>
              </div>
            )}

            {activeCategory === "security" && (
              <div className={`space-y-5 max-w-2xl rounded-2xl border p-5 ${darkMode ? "border-slate-700 bg-slate-900/60" : "border-[color:var(--border-soft)] bg-white"}`}>
                <h2 className="text-lg font-semibold">{t("settingsPage.security")}</h2>
                <p className={`text-sm ${darkMode ? "text-slate-300" : "text-[color:var(--text-muted)]"}`}>{t("settingsPage.security2faDesc")}</p>
                <div className={`rounded-xl border p-4 ${darkMode ? "border-slate-700 bg-slate-900/40" : "border-[color:var(--border-soft)] bg-[color:var(--surface-soft)]"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{t("settingsPage.twofaLabel")}</p>
                      <p className={`text-xs mt-1 ${darkMode ? "text-slate-300" : "text-[color:var(--text-muted)]"}`}>
                        {twoFactorEnabled ? t("settingsPage.twofaOn") : t("settingsPage.twofaOff")}
                      </p>
                    </div>
                    <ToggleSwitch checked={twoFactorEnabled} onChange={handleTwoFactorToggle} />
                  </div>
                </div>
              </div>
            )}

            {activeCategory === "voice" && (
              <div className={`space-y-5 max-w-2xl rounded-2xl border p-5 ${darkMode ? "border-slate-700 bg-slate-900/60" : "border-[color:var(--border-soft)] bg-white"}`}>
                <h2 className="text-lg font-semibold">{t("settingsPage.voice")}</h2>
                <div className={`rounded-xl border p-4 ${darkMode ? "border-slate-700 bg-slate-900/40" : "border-[color:var(--border-soft)] bg-[color:var(--surface-soft)]"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{t("settingsPage.autoSpeak")}</p>
                      <p className={`text-xs mt-1 ${darkMode ? "text-slate-300" : "text-[color:var(--text-muted)]"}`}>{t("settingsPage.autoSpeakHint")}</p>
                    </div>
                    <ToggleSwitch
                      checked={!!settings.auto_speak}
                      onChange={(nextValue) => setSettings((prev) => ({ ...prev, auto_speak: nextValue }))}
                    />
                  </div>
                </div>
                <div className={`sticky bottom-0 pt-2 ${darkMode ? "bg-slate-900/80" : "bg-white/80"} backdrop-blur-sm`}>
                  <button onClick={handleSettingsSave} disabled={isSaving} className="ui-primary-btn rounded-lg px-5 py-2.5 text-sm ui-control ui-focus-ring">
                    {isSaving ? t("settingsPage.saving") : t("settingsPage.saveVoice")}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
