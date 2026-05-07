import { Hero } from "@/components/hero";
import { About } from "@/components/about";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24 space-y-20 md:space-y-28">
      <Hero />
      <About />
    </main>
  );
}
