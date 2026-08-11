'use client';

import { IdeWorkspace } from '@/features/ide/components/ide-workspace';

export default function IdeProjectPage({ params }: { params: { projectId: string } }) {
  return <IdeWorkspace projectId={params.projectId} />;
}
