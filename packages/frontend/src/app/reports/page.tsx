import { redirect } from "next/navigation";

/**
 * Legacy /reports route — redirects to the main dashboard.
 * Reports are displayed in the dashboard's Daily Report panel.
 */
export default function ReportsPage() {
  redirect("/dashboard");
}
