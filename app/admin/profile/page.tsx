import { PageContainer, PageHeader } from '@/components/common';
import { AdminForm } from '@/components/common/admin-form';
import type { AdminFormField } from '@/components/common/admin-form';

const fields: AdminFormField[] = [
  { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Your Name', required: true },
  { name: 'display_name', label: 'Display Name', type: 'text', placeholder: 'yourname' },
  { name: 'role', label: 'Role', type: 'text', placeholder: 'AI Product Engineer', required: true },
  { name: 'location', label: 'Location', type: 'text', placeholder: 'City, Country' },
  { name: 'short_bio', label: 'Short Bio', type: 'text', placeholder: 'One-line bio', full: true },
  { name: 'bio', label: 'Bio', type: 'textarea', placeholder: 'Full biography', full: true },
  { name: 'avatar_url', label: 'Avatar URL', type: 'url', placeholder: 'https://...' },
  { name: 'current_mission', label: 'Current Mission', type: 'text', placeholder: 'What are you focused on?' },
  { name: 'current_project', label: 'Current Project', type: 'text', placeholder: 'Project name' },
  { name: 'github_url', label: 'GitHub URL', type: 'url', placeholder: 'https://github.com/...' },
  { name: 'linkedin_url', label: 'LinkedIn URL', type: 'url', placeholder: 'https://linkedin.com/...' },
  { name: 'resume_url', label: 'Resume URL', type: 'url', placeholder: 'https://.../resume.pdf' },
  { name: 'website_url', label: 'Website URL', type: 'url', placeholder: 'https://...' },
  { name: 'is_public', label: 'Public Profile', type: 'switch', defaultValue: true },
];

export default function AdminProfilePage() {
  return (
    <PageContainer>
      <PageHeader title="My Profile" description="Update your developer profile and links." />
      <div className="mt-8 max-w-3xl">
        <AdminForm
          title="Profile Settings"
          description="This information appears on your public profile and My Block panel."
          fields={fields}
        />
      </div>
    </PageContainer>
  );
}
