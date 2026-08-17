'use client';

import { useEffect, useState } from 'react';
import { PageContainer, PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: 'Naga Pavan Kumar Javisetty',
    professional_title: 'AI-Focused Full-Stack Developer & Systems Architect',
    profile_photo_url: '/naga-pavan-profile.jpg',
    short_bio: 'Building autonomous agentic platforms, production-ready Next.js applications, and high-performance cloud databases with Supabase RLS policies.',
    full_bio: 'AI-focused Full-Stack Developer with a B.Tech in CSE and extensive hands-on experience building production-ready, enterprise-grade web applications, real-time marketplaces, and ERP systems using React 19, Next.js, TypeScript, Supabase, PostgreSQL, and RLS security.',
    skills: 'React 19, Next.js, TypeScript, Supabase, PostgreSQL, RLS Security, TanStack Router/Start, Tailwind CSS, Razorpay API, PKZip Archiver, Haversine Algorithm, AI Workflows (Cline, Roo Code, Cursor, OpenRouter)',
    github_url: 'https://github.com/PAVANKUAMRVERMAJAVISETTY',
    linkedin_url: 'https://linkedin.com',
    website_url: 'https://ai-nexus-block.vercel.app/',
    resume_url: '/Naga_Pavan_Kumar_Javisetty_Resume.pdf',
    is_public: true,
  });

  useEffect(() => {
    fetch('/api/admin/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data?.profile) {
          const p = data.profile;
          setFormData((prev) => ({
            ...prev,
            full_name: p.full_name || prev.full_name,
            professional_title: p.professional_title || prev.professional_title,
            profile_photo_url: p.profile_photo_url || prev.profile_photo_url,
            short_bio: p.short_bio || prev.short_bio,
            full_bio: p.full_bio || prev.full_bio,
            skills: Array.isArray(p.skills) ? p.skills.join(', ') : p.skills || prev.skills,
            github_url: p.github_url || prev.github_url,
            linkedin_url: p.linkedin_url || prev.linkedin_url,
            website_url: p.website_url || prev.website_url,
            resume_url: p.resume_url || prev.resume_url,
            is_public: p.is_public !== false,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/admin/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      toast.success('Public developer profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Admin Developer Profile"
        description="Manage your public About Me information, skills, and links displayed across the site."
      />
      <div className="mt-8 max-w-3xl">
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              This information appears on your public About Me introduction popup and developer badge.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="full_name" className="mb-1.5 block">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="professional_title" className="mb-1.5 block">
                    Professional Title / Headline <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="professional_title"
                    value={formData.professional_title}
                    onChange={(e) => setFormData({ ...formData, professional_title: e.target.value })}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="profile_photo_url" className="mb-1.5 block">
                    Profile Photo / Avatar URL
                  </Label>
                  <Input
                    id="profile_photo_url"
                    type="url"
                    placeholder="https://..."
                    value={formData.profile_photo_url}
                    onChange={(e) => setFormData({ ...formData, profile_photo_url: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="short_bio" className="mb-1.5 block">
                    Short Introduction (Shown on Intro Popup)
                  </Label>
                  <Input
                    id="short_bio"
                    value={formData.short_bio}
                    onChange={(e) => setFormData({ ...formData, short_bio: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="full_bio" className="mb-1.5 block">
                    Full Biography / About Me
                  </Label>
                  <Textarea
                    id="full_bio"
                    rows={4}
                    value={formData.full_bio}
                    onChange={(e) => setFormData({ ...formData, full_bio: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="skills" className="mb-1.5 block">
                    Skills & Technologies (Comma-separated)
                  </Label>
                  <Input
                    id="skills"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    placeholder="TypeScript, Next.js, Supabase..."
                  />
                </div>

                <div>
                  <Label htmlFor="github_url" className="mb-1.5 block">
                    GitHub Profile URL
                  </Label>
                  <Input
                    id="github_url"
                    type="url"
                    value={formData.github_url}
                    onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="linkedin_url" className="mb-1.5 block">
                    LinkedIn Profile URL
                  </Label>
                  <Input
                    id="linkedin_url"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="website_url" className="mb-1.5 block">
                    Portfolio / Website URL
                  </Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="resume_url" className="mb-1.5 block">
                    Resume Document URL
                  </Label>
                  <Input
                    id="resume_url"
                    type="url"
                    placeholder="https://.../resume.pdf"
                    value={formData.resume_url}
                    onChange={(e) => setFormData({ ...formData, resume_url: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-border/40 p-3">
                  <Label htmlFor="is_public">Public Profile Visibility</Label>
                  <Switch
                    id="is_public"
                    checked={formData.is_public}
                    onCheckedChange={(v) => setFormData({ ...formData, is_public: v })}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}
