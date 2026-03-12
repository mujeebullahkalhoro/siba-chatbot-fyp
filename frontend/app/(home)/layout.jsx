import AuthProvider from "@/context/AuthContext";

export const metadata = {
  title: "SIBA Chatbot",
  description: "Sukkur IBA University AI Chatbot",
};

export default function HomeLayout({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
