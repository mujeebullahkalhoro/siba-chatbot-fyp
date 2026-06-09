import AuthProvider from "@/context/AuthContext";

export default function ShareSectionLayout({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
