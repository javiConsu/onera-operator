import { redirect } from "next/navigation";

/**
 * Legacy /projects route — redirects to the main dashboard.
 * Project management is handled within the dashboard.
 */
export default function ProjectsPage() {
  redirect("/dashboard");
}
