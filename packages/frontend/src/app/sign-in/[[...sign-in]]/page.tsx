import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 bp-texture">
      <div className="relative z-10">
        <SignIn forceRedirectUrl="/dashboard" />
      </div>
    </div>
  );
}
