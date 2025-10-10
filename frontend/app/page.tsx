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
          className="px-4 py-6 w-full border-t border-border bg-card/30 backdrop-blur-sm"
        >
          <div className="grid w-full grid-cols-2 items-center gap-4 text-sm text-muted-foreground md:grid-cols-3">
            <div className="flex items-center justify-center gap-2 col-span-2 text-center md:col-span-1 md:justify-start md:text-left md:justify-self-start">
              <span>© 2025 IOTA Snap Wallet. Built by Liquidlink.</span>
            </div>
            <a
              href="https://www.npmjs.com/package/@liquidlink-lab/iota-metamask-snap"
              className="hover:text-foreground transition-colors justify-self-start md:justify-self-center"
            >
              Snap Document
            </a>
            <a className="hover:text-foreground transition-colors justify-self-end text-right md:justify-self-end">
              Contact Liquidlink with liquidlink.io@gmail.com
            </a>
          </div>
        </Group>
      </main>
    </Container>
  );
}
