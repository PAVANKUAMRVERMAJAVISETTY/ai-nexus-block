import { PageContainer, PageHeader } from '@/components/common';
import { AdminForm } from '@/components/common/admin-form';
import type { AdminFormField } from '@/components/common/admin-form';

const fields: AdminFormField[] = [
  { name: 'title', label: 'Roadmap Title', type: 'text', placeholder: 'Full-Stack AI Engineer', required: true },
  { name: 'slug', label: 'Slug', type: 'text', placeholder: 'full-stack-ai-engineer', required: true },
  { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Short description', required: true, full: true },
  { name: 'category', label: 'Category', type: 'text', placeholder: 'Engineering', required: true },
  { name: 'tags', label: 'Tags (comma-separated)', type: 'text', placeholder: 'ai, fullstack', full: true },
  { name: 'difficulty', label: 'Difficulty', type: 'select', options: [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ], defaultValue: 'intermediate' },
  { name: 'estimated_hours', label: 'Estimated Hours', type: 'number', defaultValue: 40 },
  { name: 'image_url', label: 'Image URL', type: 'url', placeholder: 'https://...' },
  { name: 'featured', label: 'Featured', type: 'switch', defaultValue: false },
  { name: 'published', label: 'Published', type: 'switch', defaultValue: true },
  { name: 'display_order', label: 'Display Order', type: 'number', defaultValue: 0 },
];

export default function AdminRoadmapsPage() {
  return (
    <PageContainer>
      <PageHeader title="Manage Roadmaps" description="Add, edit, and delete engineering roadmaps." />
      <div className="mt-8 max-w-3xl">
        <AdminForm
          title="Add New Roadmap"
          description="Create a structured learning roadmap."
          fields={fields}
        />
      </div>
    </PageContainer>
  );
}
