import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "gi-optimizer",
  description:
    "Personal, preset-first Genshin build optimizer. Runs entirely in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="container">{children}</main>
        <footer className="gi-footer">
          <div className="gi-footer-inner">
            <span>
              <strong>gi-optimizer</strong> · Preset-first Genshin Impact build
              optimizer powered by Genshin Optimizer formulas.
            </span>
            <span>100% client-side · Zero server uploads</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
