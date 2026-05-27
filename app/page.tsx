import { PageHeader } from "@/components/page-header";
import { Hero } from "@/components/hero";
import { About } from "@/components/about";
import { WorkSection } from "@/components/work-section";
import { AuditDemo } from "@/components/audit-demo";
import { Contact } from "@/components/contact";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-5xl space-y-28 px-6 pt-16 pb-16 md:space-y-36 md:pt-20 md:pb-24">
        <Hero />
        <About />
        <WorkSection />
        <AuditDemo />
        <Contact />
        <Footer />
      </main>
    </>
  );
}
