import "./globals.css";
import TopBar from "./TopBar";

export const metadata = { title: "Creator Studio" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopBar />
        {children}
      </body>
    </html>
  );
}
