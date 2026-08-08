import { PageContainer, PageHeader } from '@/components/common';
import { AdminForm } from '@/components/common/admin-form';
import type { AdminFormField } from '@/components/common/admin-form';

const fields: AdminFormField[] = [
  { name: 'title', label: 'Resource Title', type: 'text', placeholder: 'AI Engineering Handbook', required: true },
  { name: 'slug', label: 'Slug', type: 'text', placeholder: 'ai-engineering-handbook', required: true },
  { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Short description', required: true, full: true },
  { name: 'category', label: 'Category', type: 'text', placeholder: 'AI', required: true },
  { name: 'tags', label: 'Tags (comma-separated)', type: 'text', placeholder: 'ai, engineering', full: true },
  { name: 'resource_type', label: 'Resource Type', type: 'select', options: [
    { value: 'article', label: 'Article' },
    { value: 'video', label: 'Video' },
    { value: 'book', label: 'Book' },
    { value: 'course', label: 'Course' },
    { value: 'tool', label: 'Tool' },
    { value: 'repository', label: 'Repository' },
    { value: 'other', label: 'Other' },
  ], defaultValue: 'article' },
  { name: 'image_url', label: 'Image URL', type: 'url', placeholder: 'https://...' },
  { name: 'website_url', label: 'Website URL', type: 'url', placeholder: 'https://...' },
  { name: 'github_url', label: 'GitHub URL', type: 'url', placeholder: 'https://...' },
  { name: 'documentation_url', label: 'Documentation URL', type: 'url', placeholder: 'https://...' },
  { name: 'youtube_url', label: 'YouTube URL', type: 'url', placeholder: 'https://...' },
  { name: 'featured', label: 'Featured', type: 'switch', defaultValue: false },
  { name: 'published', label: 'Published', type: 'switch', defaultValue: true },
  { name: 'display_order', label: 'Display Order', type: 'number', defaultValue: 0 },
];

export default function AdminResourcesPage() {
  return (
    <PageContainer>
      <PageHeader title="Manage Resources" description="Add, edit, and delete curated resources." />
      <div className="mt-8 max-w-3xl">
        <AdminForm
          title="Add New Resource"
          description="Add a curated resource for developers."
          fields={fields}
        />
      </div>
    </PageContainer>
  );
}
