import Link from "next/link";
import { SectionHeader } from "@/components/section-header";

function ContactRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-1 border-b border-border py-4 md:grid-cols-[160px_1fr]">
      <div className="label text-muted-foreground">{label}</div>
      <div className="text-base text-foreground/85">{children}</div>
    </div>
  );
}

export function Contact() {
  return (
    <section className="space-y-8">
      <SectionHeader label="Contact" meta="The quickest way in" />

      <div className="space-y-1">
        <ContactRow label="Email">
          <Link
            href="mailto:rrp0620@gmail.com"
            className="underline decoration-accent decoration-1 underline-offset-[4px] text-accent transition-all hover:decoration-2"
          >
            rrp0620@gmail.com
          </Link>
        </ContactRow>

        <ContactRow label="LinkedIn">
          <Link
            href="https://www.linkedin.com/in/rishi-r-patel/"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-accent decoration-1 underline-offset-[4px] text-accent transition-all hover:decoration-2"
          >
            linkedin.com/in/rishi-r-patel
          </Link>
        </ContactRow>

        <ContactRow label="Open to">
          GTM Engineering, Revenue Operations, AI Solutions, Forward
          Deployed, and AI Adoption roles. Remote, US East.
        </ContactRow>

        <ContactRow label="Location">
          Remote. Based in Delaware (US East Coast). Open to relocating to
          California.
        </ContactRow>
      </div>
    </section>
  );
}
