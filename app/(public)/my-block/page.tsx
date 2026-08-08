'use client';

import { useState } from 'react';
import { PageContainer, PageHeader } from '@/components/common';
import { MyBlockPanel } from '@/components/modals';
import { Button } from '@/components/ui/button';

export default function MyBlockPage() {
  const [open, setOpen] = useState(true);

  return (
    <PageContainer>
      <PageHeader
        title="My Block"
        description="The developer's living profile — open the panel to view."
      />
      <div className="mt-8">
        <Button onClick={() => setOpen(true)}>Open My Block Panel</Button>
        <MyBlockPanel open={open} onOpenChange={setOpen} />
      </div>
    </PageContainer>
  );
}
