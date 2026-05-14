import { redirect } from "next/navigation";

/**
 * Legacy /case-study route. Preserved because the resume PDF and earlier
 * LinkedIn pastes point at it. Redirects to the canonical project page.
 */
export default function CaseStudyRedirect() {
  redirect("/projects/escape-room");
}
