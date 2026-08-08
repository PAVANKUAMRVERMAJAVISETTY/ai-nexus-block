import { PageContainer, PageHeader } from '@/components/common';
import { AdminForm } from '@/components/common/admin-form';
import type { AdminFormField } from '@/components/common/admin-form';

const fields: AdminFormField[] = [
  { name: 'title', label: 'Project Title', type: 'text', placeholder: 'AI Nexus Block', required: true },
  { name: 'slug', label: 'Slug', type: 'text', placeholder: 'ai-nexus-block', required: true },
  { name: 'description', label: 'Short Description', type: 'textarea', placeholder: 'One-line summary', required: true, full: true },
  { name: 'long_description', label: 'Long Description', type: 'textarea', placeholder: 'Full project description', full: true },
  { name: 'category', label: 'Category', type: 'text', placeholder: 'AI Platform', required: true },
  { name: 'tags', label: 'Tags (comma-separated)', type: 'text', placeholder: 'nextjs, supabase, ai', full: true },
  { name: 'image_url', label: 'Cover Image URL', type: 'url', placeholder: 'https://...' },
  { name: 'live_url', label: 'Live Demo URL', type: 'url', placeholder: 'https://...' },
  { name: 'github_url', label: 'GitHub URL', type: 'url', placeholder: 'https://...' },
  { name: 'documentation_url', label: 'Documentation URL', type: 'url', placeholder: 'https://...' },
  { name: 'youtube_url', label: 'YouTube URL', type: 'url', placeholder: 'https://...' },
  { name: 'is_case_study', label: 'Case Study', type: 'switch', defaultValue: false },
  { name: 'featured', label: 'Featured', type: 'switch', defaultValue: false },
  { name: 'published', label: 'Published', type: 'switch', defaultValue: true },
  { name: 'display_order', label: 'Display Order', type: 'number', defaultValue: 0 },
];

export default function AdminProjectsPage() {
  return (
    <PageContainer>
      <PageHeader title="Manage Projects" description="Add, edit, and delete projects and case studies." />
      <div className="mt-8 max-w-3xl">
        <AdminForm
          title="Add New Project"
          description="Showcase a new project or case study."
          fields={fields}
        />
      </div>
    </PageContainer>
  );
}
