"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { enableTwoFactor, setupTwoFactor, disableTwoFactor } from "@/services/settingsService";

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onChangeSetting,
  onSave,
  twoFactorEnabled = false,
  onTwoFactorChanged,
}) {
  const { t } = useLanguage();
  const { darkMode } = useTheme();
  const [isBusy, setIsBusy] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [setupCode, setSetupCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleInit2FA = async () => {
    setError("");
    setIsBusy(true);
    try {
      const data = await setupTwoFactor();
      setSetupData(data);
    } catch (e) {
      setError(e.message || "Failed to initialize 2FA.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleEnable2FA = async () => {
    setError("");
    setIsBusy(true);
    try {
      await enableTwoFactor(setupCode.trim());
      setSetupCode("");
      setSetupData(null);
      onTwoFactorChanged?.(true);
    } catch (e) {
      setError(e.message || "Invalid code.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDisable2FA = async () => {
    setError("");
    setIsBusy(true);
    try {
      await disableTwoFactor(disableCode.trim());
      setDisableCode("");
      onTwoFactorChanged?.(false);
    } catch (e) {
      setError(e.message || "Invalid code.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-6 ui-card ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-[color:var(--border-soft)]"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold ui-heading ${darkMode ? "text-white" : "text-[#003e80]"}`}>{t("settings.title")}</h2>
          <button onClick={onClose} className="ui-control ui-focus-ring rounded-lg px-2 py-1 text-sm">{t("settings.close")}</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block mb-1">{t("settings.chatDensity")}</span>
            <select
              value={settings.chat_density}
              onChange={(e) => onChangeSetting("chat_density", e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 ${darkMode ? "bg-slate-800 border-slate-600" : "bg-white border-[color:var(--border-soft)]"}`}
            >
              <option value="comfortable">{t("settings.comfortable")}</option>
              <option value="compact">{t("settings.compact")}</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="block mb-1">{t("settings.fontSize")}</span>
            <select
              value={settings.font_size}
              onChange={(e) => onChangeSetting("font_size", e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 ${darkMode ? "bg-slate-800 border-slate-600" : "bg-white border-[color:var(--border-soft)]"}`}
            >
              <option value="small">{t("settings.small")}</option>
              <option value="medium">{t("settings.medium")}</option>
              <option value="large">{t("settings.large")}</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            ["auto_speak", "settings.autoSpeak"],
            ["enter_to_send", "settings.enterToSend"],
            ["show_suggested_prompts", "settings.showPrompts"],
            ["reduce_animations", "settings.reduceAnimations"],
          ].map(([key, labelKey]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!settings[key]}
                onChange={(e) => onChangeSetting(key, e.target.checked)}
              />
              <span>{t(labelKey)}</span>
            </label>
          ))}
        </div>

        <div className={`mt-5 rounded-xl border p-4 ${darkMode ? "border-slate-700 bg-slate-800/60" : "border-[color:var(--border-soft)] bg-[color:var(--surface-soft)]"}`}>
          <h3 className="font-semibold mb-2">{t("settings.twofaTitle")}</h3>
          <p className={`text-xs mb-3 ${darkMode ? "text-slate-300" : "text-[color:var(--text-muted)]"}`}>{t("settings.twofaSubtitle")}</p>
          {!twoFactorEnabled ? (
            <>
              {!setupData ? (
                <button onClick={handleInit2FA} disabled={isBusy} className="ui-blue-btn ui-control ui-focus-ring rounded-lg px-3 py-2 text-sm">
                  {t("settings.twofaSetup")}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs break-all">{setupData.secret}</div>
                  <a className="text-xs underline text-blue-500" href={setupData.otpauth_url} target="_blank" rel="noopener noreferrer">
                    {t("settings.twofaOpenAuthenticator")}
                  </a>
                  <input
                    value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value)}
                    placeholder={t("settings.twofaCode")}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${darkMode ? "bg-slate-800 border-slate-600" : "bg-white border-[color:var(--border-soft)]"}`}
                  />
                  <button onClick={handleEnable2FA} disabled={isBusy || setupCode.length < 6} className="ui-primary-btn ui-control ui-focus-ring rounded-lg px-3 py-2 text-sm">
                    {t("settings.twofaEnable")}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <input
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder={t("settings.twofaCode")}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${darkMode ? "bg-slate-800 border-slate-600" : "bg-white border-[color:var(--border-soft)]"}`}
              />
              <button onClick={handleDisable2FA} disabled={isBusy || disableCode.length < 6} className="rounded-lg px-3 py-2 text-sm text-white bg-red-600 hover:bg-red-700 ui-control ui-focus-ring">
                {t("settings.twofaDisable")}
              </button>
            </div>
          )}
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-3 py-2 text-sm ui-control ui-focus-ring">{t("settings.cancel")}</button>
          <button onClick={onSave} className="ui-primary-btn rounded-lg px-3 py-2 text-sm ui-control ui-focus-ring">{t("settings.save")}</button>
        </div>
      </div>
    </div>
  );
}
