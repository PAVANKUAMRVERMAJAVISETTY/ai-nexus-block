import { PageContainer, PageHeader } from '@/components/common';
import { AdminForm } from '@/components/common/admin-form';
import type { AdminFormField } from '@/components/common/admin-form';

const fields: AdminFormField[] = [
  { name: 'title', label: 'Article Title', type: 'text', placeholder: 'Understanding Agentic AI', required: true },
  { name: 'slug', label: 'Slug', type: 'text', placeholder: 'understanding-agentic-ai', required: true },
  { name: 'excerpt', label: 'Excerpt', type: 'textarea', placeholder: 'Short summary', required: true, full: true },
  { name: 'content', label: 'Content', type: 'textarea', placeholder: 'Full article content...', full: true },
  { name: 'category', label: 'Category', type: 'text', placeholder: 'AI Architecture', required: true },
  { name: 'tags', label: 'Tags (comma-separated)', type: 'text', placeholder: 'ai, agents, architecture', full: true },
  { name: 'image_url', label: 'Cover Image URL', type: 'url', placeholder: 'https://...' },
  { name: 'documentation_url', label: 'Documentation URL', type: 'url', placeholder: 'https://...' },
  { name: 'youtube_url', label: 'YouTube URL', type: 'url', placeholder: 'https://...' },
  { name: 'reading_time_minutes', label: 'Reading Time (min)', type: 'number', defaultValue: 5 },
  { name: 'is_pinned', label: 'Pinned', type: 'switch', defaultValue: false },
  { name: 'featured', label: 'Featured', type: 'switch', defaultValue: false },
  { name: 'published', label: 'Published', type: 'switch', defaultValue: true },
  { name: 'display_order', label: 'Display Order', type: 'number', defaultValue: 0 },
];

export default function AdminKnowledgePage() {
  return (
    <PageContainer>
      <PageHeader title="Manage Knowledge" description="Add, edit, and delete knowledge articles." />
      <div className="mt-8 max-w-3xl">
        <AdminForm
          title="Add New Article"
          description="Publish a knowledge article or guide."
          fields={fields}
        />
      </div>
    </PageContainer>
  );
}
