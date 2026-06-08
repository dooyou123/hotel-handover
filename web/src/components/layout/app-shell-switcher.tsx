import { AppShellNova } from '@/components/layout/app-shell-nova';

type AppShellSwitcherProps = {
  email: string;
  children: React.ReactNode;
};

export function AppShellSwitcher({ email, children }: AppShellSwitcherProps) {
  return <AppShellNova email={email}>{children}</AppShellNova>;
}
