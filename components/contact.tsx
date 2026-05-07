import Link from "next/link";

export function Contact() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">Contact</h2>
      <ul className="space-y-2 text-base">
        <li>
          <span className="text-muted-foreground">LinkedIn: </span>
          <Link
            href="https://www.linkedin.com/in/rishi-r-patel/"
            className="underline underline-offset-4 hover:text-primary"
            target="_blank"
            rel="noreferrer"
          >
            linkedin.com/in/rishi-r-patel
          </Link>
        </li>
        <li>
          <span className="text-muted-foreground">Email: </span>
          <Link
            href="mailto:rrp0620@gmail.com"
            className="underline underline-offset-4 hover:text-primary"
          >
            rrp0620@gmail.com
          </Link>
        </li>
        <li>
          <span className="text-muted-foreground">Open to: </span>
          Forward Deployed Strategist, AI Solutions Manager, AI Adoption Lead,
          AI Implementation Manager, Customer Engineer (non-coding flavor),
          Deployment Strategist
        </li>
        <li>
          <span className="text-muted-foreground">Location: </span>
          Remote (US, based in Delaware)
        </li>
      </ul>
    </section>
  );
}
