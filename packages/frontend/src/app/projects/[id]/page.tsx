import { redirect } from "next/navigation";

export function generateStaticParams() {
  return [{ id: "demo" }];
}

export default function ProjectSettingsPage() {
  redirect("/dashboard");
}
