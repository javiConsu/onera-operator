import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 bp-texture">
      <div className="relative z-10">
        <SignUp forceRedirectUrl="/new" />
      </div>
    </div>
  );
}
