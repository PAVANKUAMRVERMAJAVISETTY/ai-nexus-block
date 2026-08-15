'use client';

import { useState, useEffect } from 'react';
import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { ProjectCard } from '@/components/cards';
import { AdminWrapper } from '@/components/admin';
import { FolderGit2 } from 'lucide-react';
import type { Project } from '@/types/projects';

const filterTabs = [
  '#All',
  '#Frontend',
  '#Backend & API',
  '#Supabase Systems',
  '#Full Stack AI',
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState('#All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((json) => {
        setProjects(json.data || []);
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects = projects.filter((p) => {
    if (activeTab === '#All') return true;
    const cleanTab = activeTab.replace('#', '').toLowerCase().trim();
    const cat = (p.category || '').toLowerCase().trim();
    const tags = (p.tags ?? []).map((t) => t.toLowerCase().trim());
    return (
      cat === cleanTab ||
      cat.includes(cleanTab) ||
      cleanTab.includes(cat) ||
      tags.some((t) => t.includes(cleanTab) || cleanTab.includes(t))
    );
  });

  return (
    <PageContainer>
      <AdminWrapper entityType="projects">
        <PageHeader
          title="Projects Showcase"
          description="Featured engineering work, case studies, and full-stack AI applications."
        />

        {/* Top Filter Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-border/40 pb-4">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted border-border/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-64 rounded-xl bg-muted/40" />
              ))}
            </div>
          ) : filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FolderGit2 className="h-10 w-10" />}
              title="No projects found"
              description="No projects match the selected category filter."
            />
          )}
        </div>
      </AdminWrapper>
    </PageContainer>
  );
}
