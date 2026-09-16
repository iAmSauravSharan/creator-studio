import "./globals.css";
import TopBar from "./TopBar";

export const metadata = { title: "Sirf Bhakti Songs — Studio" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopBar />
        <div className="page">{children}</div>
      </body>
    </html>
  );
}
