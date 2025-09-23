import { ConnectionBlock } from "@/components/connection-block";
import { Dashboard } from "@/components/dashboard";
import { Hero } from "@/components/hero";
import { Container, Group } from "@mantine/core";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <Container
      my={24}
      className={`${geistSans.className} ${geistMono.className}`}
    >
      <main className="flex flex-col gap-6 row-start-2 items-center w-full max-w-4xl">
        <div className="flex flex-col items-center gap-4 w-full">
          <Hero />
          <div className="flex flex-col gap-4 w-full">
            <ConnectionBlock />
            <Dashboard />
          </div>
        </div>
        <Group
          component="footer"
          className="px-4 py-6 space-between border-t border-border bg-card/30 backdrop-blur-sm"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                © 2025 IOTA Snap Wallet. Built by Liquidlink.
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a
                href="https://www.npmjs.com/package/@liquidlink-lab/iota-metamask-snap"
                className="hover:text-foreground transition-colors"
              >
                Snap Document
              </a>
              <a className="hover:text-foreground transition-colors">
                Contact Liquidlink with liquidlink.io@gmail.com
              </a>
            </div>
          </div>
        </Group>
      </main>
    </Container>
  );
}
