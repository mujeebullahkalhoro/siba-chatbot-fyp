"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { Plus, Search, PanelLeftClose, PanelRightClose, X, Trash2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

// Strict circular avatar wrapper used for both photo and initials
function AvatarBox({ children }) {
  return (
    <div className="w-9 h-9 aspect-square rounded-full overflow-hidden relative shrink-0">
      {children}
    </div>
  );
}

const SidebarItem = ({ icon: Icon, text, active, isCollapsed, onClick }) => (
  <a
    href="#"
    onClick={onClick}
    className={`flex items-center p-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100
      ${active ? "bg-gray-100 text-gray-900" : ""}
      ${isCollapsed ? "justify-center w-full h-[46px]" : ""}`}
  >
    <Icon className="w-5 h-5 text-gray-600 shrink-0" />
    {!isCollapsed && <span className="ml-3 whitespace-nowrap">{text}</span>}
  </a>
);

const GMAIL_PALETTE = [
  "#F28B82", "#F6AEA9", "#FDD663", "#F8E36E", "#81C995", "#57BB8A",
  "#0097A7", "#78D9EC", "#8AB4F8", "#AECBFA", "#C58AF9", "#E8B2FF",
  "#FFB3C7", "#B39DDB", "#B0BEC5",
];
function hashString(str) { let h = 5381; for (let i = 0; i < str.length; i++)h = (h << 5) + h + str.charCodeAt(i); return h >>> 0; }
function gmailColor(seed) { const h = hashString((seed || "user").toLowerCase()); return GMAIL_PALETTE[h % GMAIL_PALETTE.length]; }

export default function ResponsiveSidebar({ isMobileOpen, onClose, sessions = [], currentSessionId, onSelectSession, onNewChat, onDeleteChat }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const hideText = isCollapsed;
  const { user, logout } = useAuth() || {};
  const { t, isRTL } = useLanguage();

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chatIdToDelete, setChatIdToDelete] = useState(null);

  const handleDeleteClick = (sessionId, e) => {
    e.stopPropagation();
    setChatIdToDelete(sessionId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = (e) => {
    if (onDeleteChat && chatIdToDelete) {
      onDeleteChat(chatIdToDelete, e);
    }
    setIsDeleteModalOpen(false);
    setChatIdToDelete(null);
  };

  // Filter sessions based on search query
  const filteredSessions = sessions.filter(session =>
    (session.title || t("sidebar.newChat")).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Popover & Menu State
  const [menuOpen, setMenuOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Avatar State
  const [imgError, setImgError] = useState(false);

  // Calculate avatar properties
  const initial = useMemo(() => (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase(), [user]);
  const bgColor = useMemo(() => gmailColor(user?.email || "user"), [user]);
  const avatarSrc = user?.picture;
  const showInitial = !avatarSrc || imgError;
  const avatarLoader = ({ src }) => src;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      if (logout) await logout();
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Calculate menu position
  useEffect(() => {
    if (menuOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top: Math.max(10, rect.top - 160),
        left: rect.left
      });
    }
  }, [menuOpen]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !triggerRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);


  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900 bg-opacity-50 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`h-screen shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out z-50
          fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} w-64 ${isMobileOpen ? "translate-x-0 shadow-xl" : (isRTL ? "translate-x-full" : "-translate-x-full")}
          md:sticky md:translate-x-0 md:top-0
          ${isCollapsed ? "md:w-14" : "md:w-72"}`}
      >
        {/* Header */}
        <div className={`flex items-center border-b border-gray-200 ${hideText ? "justify-center py-4" : "justify-between p-4"}`}>
          {!hideText && (
            <>
              <div className="flex items-center">
                <Image src="/image.png" alt="SIBA AI Logo" width={46} height={46} className="rounded-full" />
                <span className={`${isRTL ? 'mr-2' : 'ml-2'} text-xl font-bold text-gray-900`}>{t('sidebar.brand')}</span>
              </div>
              <div className="hidden md:block">
                <button onClick={() => setIsCollapsed(true)} className="text-gray-500 hover:text-gray-800 relative group/tooltip">
                  <PanelLeftClose className="w-5 h-5" />
                  <span className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-full ml-2' : 'right-full mr-2'} px-2 py-1 bg-gray-200 text-blue-950 text-xs rounded whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10`}>
                    {t('sidebar.closeSidebar')}
                  </span>
                </button>
              </div>
              {isMobileOpen && (
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 md:hidden" aria-label={t('sidebar.closeSidebar')}>
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
                aria-label={t('sidebar.openSidebar')}
              >
                <PanelRightClose className="w-5 h-5" />
                <span className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2 py-1 bg-gray-200 text-blue-950 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10`}>
                  {t('sidebar.openSidebar')}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* New Chat */}
        <div className={hideText ? "px-2 py-4" : "p-4"}>
          <button
            onClick={onNewChat}
            className={`flex items-center justify-center w-full text-white font-semibold py-2 rounded-lg transition ${hideText ? "p-2 h-[46px]" : "px-4"}`}
            style={{ backgroundColor: '#ea6645' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#d95a3d'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ea6645'}
          >
            <Plus className={`w-5 h-5 ${hideText ? "" : (isRTL ? "ml-2" : "mr-2")}`} />
            {!hideText && <span>{t('sidebar.newChat')}</span>}
          </button>
        </div>

        {/* Chat History and Search */}
        <div className={`flex-1 overflow-y-auto space-y-1 ${hideText ? "px-2 py-4" : "px-4"}`}>

          {/* Search Input Area */}
          {!hideText ? (
            <div className="relative mb-2">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
              <input
                type="text"
                placeholder={t('sidebar.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                dir={isRTL ? "rtl" : "ltr"}
                className={`w-full ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 text-sm bg-gray-100 border border-transparent rounded-lg focus:bg-white focus:border-gray-300 focus:outline-none transition-all`}
              />
            </div>
          ) : (
            <SidebarItem
              icon={Search}
              text={t('sidebar.search')}
              isCollapsed={true}
              onClick={(e) => { e.preventDefault(); setIsCollapsed(false); }}
            />
          )}

          {!hideText && (
            <>
              <h3 className="px-2 pt-4 text-xs font-semibold text-gray-500 uppercase">
                {t('sidebar.myChats')} ({filteredSessions.length})
              </h3>
              {filteredSessions.map((session) => (
                <div key={session._id} onClick={() => onSelectSession(session._id)} className="group relative">
                  <a
                    href="#"
                    className={`block text-sm p-2 rounded-lg hover:bg-gray-100 truncate ${isRTL ? 'pl-8' : 'pr-8'} ${currentSessionId === session._id ? "bg-gray-100 font-semibold" : "text-gray-700"}`}
                  >
                    {session.title || t('sidebar.newChat')}
                  </a>
                  <button
                    onClick={(e) => handleDeleteClick(session._id, e)}
                    className={`absolute ${isRTL ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity`}
                    title={t('sidebar.deleteChat')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {filteredSessions.length === 0 && (
                <p className="px-2 text-sm text-gray-400 italic">{t('sidebar.noChats')}</p>
              )}
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
                  <div className={`${isRTL ? 'mr-3' : 'ml-3'} min-w-0`}>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user?.name || user?.email || "User"}
                    </p>
                  </div>
                )}
              </div>

              {!hideText && (
                <svg className={`w-4 h-4 text-gray-500 ${isRTL ? 'mr-2' : 'ml-2'}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
                  style={{ top: pos.top - 160, left: 10 }}
                >
                  <div className="px-4 pb-2 text-xs text-gray-500 truncate">{user?.email || "account"}</div>

                  <button role="menuitem" className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-50">
                    {t('sidebar.settings')}
                  </button>

                  <div className="my-2 border-t border-gray-200" />

                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {isLoggingOut ? t('sidebar.loggingOut') : t('sidebar.logout')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
