import { PageContainer, PageHeader } from '@/components/common';
import { AdminForm } from '@/components/common/admin-form';
import type { AdminFormField } from '@/components/common/admin-form';

const fields: AdminFormField[] = [
  { name: 'name', label: 'Tool Name', type: 'text', placeholder: 'Cursor', required: true },
  { name: 'slug', label: 'Slug', type: 'text', placeholder: 'cursor', required: true },
  { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Short description', required: true, full: true },
  { name: 'category', label: 'Category', type: 'text', placeholder: 'AI Editor', required: true },
  { name: 'tags', label: 'Tags (comma-separated)', type: 'text', placeholder: 'ai, editor, productivity', full: true },
  { name: 'pricing', label: 'Pricing', type: 'select', options: [
    { value: 'free', label: 'Free' },
    { value: 'freemium', label: 'Freemium' },
    { value: 'paid', label: 'Paid' },
    { value: 'enterprise', label: 'Enterprise' },
  ], defaultValue: 'freemium' },
  { name: 'pricing_details', label: 'Pricing Details', type: 'text', placeholder: 'Free tier, Pro $20/mo' },
  { name: 'image_url', label: 'Image URL', type: 'url', placeholder: 'https://...' },
  { name: 'logo_url', label: 'Logo URL', type: 'url', placeholder: 'https://...' },
  { name: 'website_url', label: 'Website URL', type: 'url', placeholder: 'https://...' },
  { name: 'github_url', label: 'GitHub URL', type: 'url', placeholder: 'https://...' },
  { name: 'documentation_url', label: 'Documentation URL', type: 'url', placeholder: 'https://...' },
  { name: 'youtube_url', label: 'YouTube URL', type: 'url', placeholder: 'https://...' },
  { name: 'is_open_source', label: 'Open Source', type: 'switch', defaultValue: false },
  { name: 'featured', label: 'Featured', type: 'switch', defaultValue: false },
  { name: 'published', label: 'Published', type: 'switch', defaultValue: true },
  { name: 'display_order', label: 'Display Order', type: 'number', defaultValue: 0 },
];

export default function AdminToolsPage() {
  return (
    <PageContainer>
      <PageHeader title="Manage Tools" description="Add, edit, and delete AI and developer tools." />
      <div className="mt-8 max-w-3xl">
        <AdminForm
          title="Add New Tool"
          description="Catalog a new AI or developer tool."
          fields={fields}
        />
      </div>
    </PageContainer>
  );
}
