import { WorkspaceSidebar } from './workspace-sidebar';

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <WorkspaceSidebar />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
