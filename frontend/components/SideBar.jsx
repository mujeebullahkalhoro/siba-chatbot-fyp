"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { Plus, Search, PanelLeftClose, PanelRightClose, X } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

// Strict circular avatar wrapper used for both photo and initials
function AvatarBox({ children }) {
  return (
    <div className="w-9 h-9 aspect-square rounded-full overflow-hidden relative shrink-0">
      {children}
    </div>
  );
}

const SidebarItem = ({ icon: Icon, text, active, isCollapsed }) => (
  <a
    href="#"
    className={`flex items-center p-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100
      ${active ? "bg-gray-100 text-gray-900" : ""}
      ${isCollapsed ? "justify-center w-full h-[46px]" : ""}`}
  >
    <Icon className="w-5 h-5 text-gray-600 shrink-0" />
    {!isCollapsed && <span className="ml-3 whitespace-nowrap">{text}</span>}
  </a>
);

const ChatHistoryItem = ({ text, isCollapsed }) =>
  !isCollapsed && (
    <a
      href="#"
      className="block text-sm p-2 rounded-lg text-gray-700 hover:bg-gray-100 truncate"
    >
      {text}
    </a>
  );

const GMAIL_PALETTE = [
  "#F28B82","#F6AEA9","#FDD663","#F8E36E","#81C995","#57BB8A",
  "#0097A7","#78D9EC","#8AB4F8","#AECBFA","#C58AF9","#E8B2FF",
  "#FFB3C7","#B39DDB","#B0BEC5",
];
function hashString(str){let h=5381;for(let i=0;i<str.length;i++)h=(h<<5)+h+str.charCodeAt(i);return h>>>0;}
function gmailColor(seed){const h=hashString((seed||"user").toLowerCase());return GMAIL_PALETTE[h%GMAIL_PALETTE.length];}

export default function ResponsiveSidebar({ isMobileOpen, onClose }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, signOut } = useAuth() || {};

  // Popover state/refs
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Logout state
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Close on outside click / Escape
  useEffect(() => {
    const onDown = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) setMenuOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Position and clamp popover with a tight 6px gap
  useEffect(() => {
    if (!menuOpen) return;
    const btn = triggerRef.current;
    const menu = menuRef.current;
    if (!btn || !menu) return;

    const r = btn.getBoundingClientRect();
    const mw = menu.offsetWidth || 320;
    const mh = menu.offsetHeight || 180;

    const gap = 6;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top;
    if (r.top >= mh + gap + margin) {
      top = r.top - mh - gap;   // above
    } else {
      top = Math.min(r.bottom + gap, vh - mh - margin); // below
    }

    let left = r.right - mw; // align right
    left = Math.max(margin, Math.min(left, vw - mw - margin));

    setPos({ top, left });
  }, [menuOpen]);

  const hideText = isCollapsed && !isMobileOpen;

  const initial = (user?.name?.trim()?.[0] || user?.email?.trim()?.[0] || "U").toUpperCase();
  const avatarSrc = user?.picture || "";
  const avatarLoader = ({ src, width, quality }) => {
    try {
      const u = new URL(src);
      if (width) u.searchParams.set("w", width);
      if (quality) u.searchParams.set("q", quality);
      return u.toString();
    } catch { return src; }
  };

  const [imgError, setImgError] = useState(false);
  const showInitial = imgError || !avatarSrc;
  const seed = user?.email || user?.name || "user";
  const bgColor = gmailColor(seed);

  const chatHistory = useMemo(() => ([
    { text: "BSCS Course Structure" },
    { text: "Refund Policy" },
    { text: "Grading Criteria" },
    { text: "Academic Policies" },
    { text: "7th Semester Electives" },
    { text: "Upcoming Events" },
    { text: "BS AI Program & Faculty" },
  ]), []);

  // Working logout (cookie-based)
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
      await fetch(`${apiBase}/api/auth/logout`, {
        method: "POST",
        credentials: "include", // send HttpOnly cookie for deletion
      });
    } catch (e) {
      // optional: console.warn(e);
    } finally {
      setMenuOpen(false);
      // Clear client auth state if provided by context
      if (typeof signOut === "function") {
        try { await signOut(); } catch {}
      }
      // Navigate to public page to avoid stale cookie-based UI
      if (typeof window !== "undefined") window.location.href = "/";
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900 bg-opacity-50 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`h-screen shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out z-50
          fixed inset-y-0 left-0 w-64 ${isMobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"}
          md:sticky md:translate-x-0 md:top-0
          ${isCollapsed ? "md:w-14" : "md:w-72"}`}
      >
        {/* Header */}
        <div className={`flex items-center border-b border-gray-200 ${hideText ? "justify-center py-4" : "justify-between p-4"}`}>
          {!hideText && (
            <>
              <div className="flex items-center">
                <Image src="/image.png" alt="SIBA AI Logo" width={46} height={46} className="rounded-full" />
                <span className="ml-2 text-xl font-bold text-gray-900">SibaChatbot</span>
              </div>
              <div className="hidden md:block">
                <button onClick={() => setIsCollapsed(true)} className="text-gray-500 hover:text-gray-800 relative group/tooltip">
                  <PanelLeftClose className="w-5 h-5" />
                  <span className="absolute top-1/2 -translate-y-1/2 right-full mr-2 px-2 py-1 bg-gray-200 text-blue-950 text-xs rounded whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                    Close sidebar
                  </span>
                </button>
              </div>
              {isMobileOpen && (
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 md:hidden" aria-label="Close sidebar">
                  <X className="w-6 h-6" />
                </button>
              )}
            </>
          )}

          {hideText && (
            <div className="group relative w-[46px] h-[46px]">
              <Image src="/image.png" alt="SIBA AI Logo" width={46} height={46} className="rounded-full" />
              <button
                onClick={() => setIsCollapsed(false)}
                className="absolute inset-0 flex items-center justify-center w-full h-full text-gray-600 bg-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:text-gray-900 hover:bg-gray-100 focus:outline-none border border-gray-200 rounded-full"
                aria-label="Open sidebar"
              >
                <PanelRightClose className="w-5 h-5" />
                <span className="absolute top-1/2 -translate-y-1/2 left-full ml-2 px-2 py-1 bg-gray-200 text-blue-950 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Open sidebar
                </span>
              </button>
              {isMobileOpen && (
                <button onClick={onClose} className="absolute top-2 right-2 md:hidden text-gray-500 hover:text-gray-800" aria-label="Close sidebar">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* New Chat */}
        <div className={hideText ? "px-2 py-4" : "p-4"}>
          <button className={`flex items-center justify-center w-full bg-orange-500 text-white font-semibold py-2 rounded-lg hover:bg-orange-600 transition ${hideText ? "p-2 h-[46px]" : "px-4"}`}>
            <Plus className={`w-5 h-5 ${hideText ? "" : "mr-2"}`} />
            {!hideText && <span>New Chat</span>}
          </button>
        </div>

        {/* Chat History */}
        <div className={`flex-1 overflow-y-auto space-y-1 ${hideText ? "px-2 py-4" : "px-4"}`}>
          <SidebarItem icon={Search} text="Search chats" isCollapsed={hideText} />
          {!hideText && (
            <>
              <h3 className="px-2 pt-4 text-xs font-semibold text-gray-500 uppercase">Chats</h3>
              {chatHistory.map((item, i) => (
                <ChatHistoryItem key={i} text={item.text} isCollapsed={hideText} />
              ))}
            </>
          )}
        </div>

        {/* Footer popover */}
        <div className={`border-t border-gray-200 ${hideText ? "py-3" : "p-3"}`}>
          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={`w-full flex items-center rounded-lg ${hideText ? "justify-center" : "justify-between"} px-2 py-2 hover:bg-gray-50 cursor-pointer`}
              aria-haspopup="menu"
              aria-expanded={menuOpen ? "true" : "false"}
            >
              <div className="flex items-center">
                {showInitial ? (
                  <AvatarBox>
                    <div
                      className="absolute inset-0 flex items-center justify-center text-sm font-semibold select-none rounded-full"
                      style={{ backgroundColor: bgColor, color: "#ffffff" }}
                      aria-hidden="true"
                    >
                      {initial}
                    </div>
                  </AvatarBox>
                ) : (
                  <AvatarBox>
                    <Image
                      loader={avatarLoader}
                      src={avatarSrc}
                      alt={user?.name || user?.email || "User"}
                      fill
                      sizes="36px"
                      className="object-cover rounded-full"
                      priority={false}
                      onError={() => setImgError(true)}
                    />
                  </AvatarBox>
                )}

                {!hideText && (
                  <div className="ml-3 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user?.name || user?.email || "User"}
                    </p>
                  </div>
                )}
              </div>

              {!hideText && (
                <svg className="w-4 h-4 text-gray-500 ml-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {menuOpen && (
              <>
                <button className="fixed inset-0 z-98 cursor-default" aria-hidden="true" onClick={() => setMenuOpen(false)} />
                <div
                  ref={menuRef}
                  role="menu"
                  aria-label="Account menu"
                  className="fixed z-99 w-72 sm:w-80 bg-white border border-gray-200 rounded-xl shadow-2xl ring-1 ring-black/5 py-2"
                  style={{ top: pos.top, left: pos.left }}
                >
                  <div className="px-4 pb-2 text-xs text-gray-500 truncate">{user?.email || "account"}</div>

                  <button role="menuitem" className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-50">
                    Settings
                  </button>

                  <div className="my-2 border-t border-gray-200" />

                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {isLoggingOut ? "Logging out…" : "Log out"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
