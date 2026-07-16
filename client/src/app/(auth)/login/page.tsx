import { AppShell } from "@/components/ui/app-shell";
import { AuthPanel } from "@/components/ui/auth-panel";

export default function LoginPage() {
  return (
    <AppShell
      eyebrow="Auth"
      title="Sign in to continue."
      description="Use the client shell to access candidate and admin flows."
    >
      <AuthPanel mode="login" />
    </AppShell>
  );
}
