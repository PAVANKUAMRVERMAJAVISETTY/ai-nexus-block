import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { ProjectCard } from '@/components/cards';
import { Button } from '@/components/ui/button';
import { getProjects } from '@/services/projects';
import { FolderGit2 } from 'lucide-react';

export default function ProjectsPage() {
  const { data: projects } = getProjects();

  return (
    <PageContainer>
      <PageHeader
        title="Projects"
        description="Featured work, case studies, and engineering experiments."
      />
      <div className="mt-8">
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FolderGit2 className="h-10 w-10" />}
            title="No projects yet"
            description="Projects will appear here once published."
          />
        )}
      </div>
    </PageContainer>
  );
}
