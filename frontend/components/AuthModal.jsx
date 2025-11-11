"use client";
import { useEffect, useRef, useState, useMemo } from "react";

const IBA_DOMAIN = "@iba-suk.edu.pk";
const IBA_HD = "iba-suk.edu.pk";

export default function AuthModal({ isOpen, onClose }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const initializedRef = useRef(false);
  const codeClientRef = useRef(null);

  const isIbaEmail = useMemo(
    () => typeof email === "string" && email.toLowerCase().endsWith(IBA_DOMAIN),
    [email]
  );

  useEffect(() => {
    if (!isOpen) return;

    const onReady = () => {
      if (!window.google?.accounts?.oauth2) return;
      if (initializedRef.current) return;

      const redirectBase =
        process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

      codeClientRef.current = window.google.accounts.oauth2.initCodeClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
        scope: "openid email profile",
        ux_mode: "redirect",
        redirect_uri: `${redirectBase}/api/auth/google/callback`,
        hd: IBA_HD,
      });

      initializedRef.current = true;
    };

    const existing = document.getElementById("gis-script");
    if (existing) {
      onReady();
      return;
    }
    const s = document.createElement("script");
    s.id = "gis-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = onReady;
    document.body.appendChild(s);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) initializedRef.current = false;
  }, [isOpen]);

  if (!isOpen) return null;

  const beginGoogleRedirect = (loginEmail) => {
    const g = window.google?.accounts?.oauth2;
    if (!g) return;

    const redirectBase =
      process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

    const client = g.initCodeClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      scope: "openid email profile",
      ux_mode: "redirect",
      redirect_uri: `${redirectBase}/api/auth/google/callback`,
      login_hint: loginEmail,
      hd: IBA_HD,
    });

    client.requestCode();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isIbaEmail) {
      setErr(`Please use your IBA email (${IBA_DOMAIN}).`);
      return;
    }
    setErr("");
    beginGoogleRedirect(email.trim().toLowerCase());
  };

  const handleGoogleClick = () => {
    setErr("");
    beginGoogleRedirect(undefined);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto p-8 relative flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-center text-gray-800">
          Log in or Sign up
        </h2>
        <p className="text-center text-gray-600 text-sm mt-2">
          Get smarter answers and access personalized features.
        </p>
<button
  onClick={handleGoogleClick}
  className="flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-3 px-6 mt-8 w-full text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
  type="button"
>
  {/* Google multicolor G */}
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083h-1.611v-.083H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.844 1.153 7.964 3.036l5.657-5.657C35.101 6.053 29.935 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.464 16.547 18.864 14 24 14c3.059 0 5.844 1.153 7.964 3.036l5.657-5.657C35.101 6.053 29.935 4 24 4c-7.69 0-14.256 4.372-17.694 10.691z"/>
    <path fill="#4CAF50" d="M24 44c5.766 0 10.598-1.905 14.131-5.174l-6.517-5.334C29.72 35.579 27.062 36.5 24 36.5c-5.202 0-9.62-3.311-11.27-7.942l-6.629 5.114C8.476 39.633 15.598 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083h-1.611v-.083H24v8h11.303c-.793 2.237-2.258 4.038-4.189 5.225l6.517 5.334C39.705 36.355 44 30.947 44 24c0-1.341-.138-2.651-.389-3.917z"/>
  </svg>
  <span>Continue with Google (IBA Domain)</span>
</button>


        <div className="flex items-center my-6 w-full">
          <div className="grow border-t border-gray-200"></div>
          <span className="shrink mx-4 text-gray-400 text-sm uppercase">
            or
          </span>
          <div className="grow border-t border-gray-200"></div>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <input
              id="iba-email"
              type="email"
              placeholder="Enter your IBA Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-base"
              required
              pattern={`^[^\\s@]+@${IBA_HD.replace(".", "\\.")}$`}
              title={`Use your IBA email (e.g., user${IBA_DOMAIN})`}
              autoComplete="email"
            />
            {err && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {err}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isIbaEmail}
            className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition-colors duration-200 ${
              isIbaEmail
                ? "bg-[#ea6645] hover:bg-[#d95a3d]"
                : "bg-gray-300 cursor-not-allowed"
            }`}
            aria-disabled={!isIbaEmail}
          >
            Continue
          </button>
        </form>

        <p className="text-center text-gray-500 text-xs mt-6">
          Only IBA institutional users can access internal features.
        </p>
      </div>
    </div>
  );
}
