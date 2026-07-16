import { AppShell } from "@/components/ui/app-shell";
import { AuthPanel } from "@/components/ui/auth-panel";

export default function RegisterPage() {
  return (
    <AppShell
      eyebrow="Auth"
      title="Create your account."
      description="Choose your role and start using the SIEGE platform."
    >
      <AuthPanel mode="register" />
    </AppShell>
  );
}
