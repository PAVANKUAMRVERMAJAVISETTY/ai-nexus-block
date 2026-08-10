'use client';

import { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, GraduationCap, Briefcase, Target, Github, Globe, Linkedin, Loader2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile } from '@/types/database';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [degree, setDegree] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [targetRolesInput, setTargetRolesInput] = useState('');
  const [learningGoals, setLearningGoals] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch profile');

      const p: Profile = data.profile;
      setProfile(p);
      setDisplayName(p.display_name || '');
      setAvatarUrl(p.avatar_url || '');
      setBio(p.bio || '');
      setEducationLevel(p.education_level || '');
      setDegree(p.degree || '');
      setSpecialization(p.specialization || '');
      setGraduationYear(p.graduation_year || '');
      setExperienceLevel(p.experience_level || '');
      setSkillsInput(Array.isArray(p.skills) ? p.skills.join(', ') : '');
      setTargetRolesInput(Array.isArray(p.target_roles) ? p.target_roles.join(', ') : '');
      setLearningGoals(p.learning_goals || '');
      setGithubUrl(p.github_url || '');
      setPortfolioUrl(p.portfolio_url || '');
      setLinkedinUrl(p.linkedin_url || '');
    } catch (err: any) {
      toast.error(err.message || 'Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Display Name is required.');
      return;
    }

    setSaving(true);
    try {
      const skillsArray = skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const targetRolesArray = targetRolesInput
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      const payload = {
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim() || null,
        bio: bio.trim() || null,
        education_level: educationLevel || null,
        degree: degree.trim() || null,
        specialization: specialization.trim() || null,
        graduation_year: graduationYear.trim() || null,
        experience_level: experienceLevel || null,
        skills: skillsArray,
        target_roles: targetRolesArray,
        learning_goals: learningGoals.trim() || null,
        github_url: githubUrl.trim() || null,
        portfolio_url: portfolioUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
      };

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');

      setProfile(data.profile);
      toast.success('Profile saved successfully! AI Assistant prompt context updated.');
    } catch (err: any) {
      toast.error(err.message || 'Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="My Profile"
        description="Career, learning, and developer background context used by AI Nexus Assistant."
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs">Loading profile context...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="mt-6 space-y-6">
          <Tabs defaultValue="basic" className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 gap-1">
              <TabsTrigger value="basic" className="text-xs py-2 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Basic
              </TabsTrigger>
              <TabsTrigger value="education" className="text-xs py-2 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" />
                Education
              </TabsTrigger>
              <TabsTrigger value="professional" className="text-xs py-2 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" />
                Skills
              </TabsTrigger>
              <TabsTrigger value="learning" className="text-xs py-2 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Goals
              </TabsTrigger>
              <TabsTrigger value="developer" className="text-xs py-2 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                Links
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: BASIC INFO */}
            <TabsContent value="basic">
              <Card className="border-border/40 bg-card">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Basic Profile Information
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Your account identity and primary public bio.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName" className="text-xs">Display Name *</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Jane Doe"
                        required
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs">Email Address (Read-only)</Label>
                      <Input
                        id="email"
                        value={profile?.email || ''}
                        disabled
                        className="text-xs bg-muted/40 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatarUrl" className="text-xs">Avatar Image URL</Label>
                    <Input
                      id="avatarUrl"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-xs">Short Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Full-stack developer interested in AI agents and real-time architectures..."
                      rows={3}
                      className="text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: EDUCATION */}
            <TabsContent value="education">
              <Card className="border-border/40 bg-card">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Education & Background
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Academic or self-taught learning background.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Education Level</Label>
                      <Select value={educationLevel} onValueChange={setEducationLevel}>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="undergraduate">Undergraduate Student</SelectItem>
                          <SelectItem value="graduate">Graduate Student</SelectItem>
                          <SelectItem value="bootcamp">Bootcamp Graduate</SelectItem>
                          <SelectItem value="self_taught">Self-Taught</SelectItem>
                          <SelectItem value="professional">Working Professional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="degree" className="text-xs">Degree / Diploma</Label>
                      <Input
                        id="degree"
                        value={degree}
                        onChange={(e) => setDegree(e.target.value)}
                        placeholder="B.S. Computer Science"
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="specialization" className="text-xs">Specialization / Major</Label>
                      <Input
                        id="specialization"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="Software Engineering / AI"
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="graduationYear" className="text-xs">Graduation / Target Year</Label>
                      <Input
                        id="graduationYear"
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(e.target.value)}
                        placeholder="2026"
                        className="text-xs"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: PROFESSIONAL & SKILLS */}
            <TabsContent value="professional">
              <Card className="border-border/40 bg-card">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Skills & Experience
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Technologies, frameworks, and current proficiency level.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Experience Level</Label>
                    <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner / Student</SelectItem>
                        <SelectItem value="junior">Junior Developer (0-2 yrs)</SelectItem>
                        <SelectItem value="mid">Mid-Level Developer (2-5 yrs)</SelectItem>
                        <SelectItem value="senior">Senior Developer (5+ yrs)</SelectItem>
                        <SelectItem value="lead">Lead / Architect</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skillsInput" className="text-xs">Skills & Tech Stack (Comma separated)</Label>
                    <Input
                      id="skillsInput"
                      value={skillsInput}
                      onChange={(e) => setSkillsInput(e.target.value)}
                      placeholder="TypeScript, React, Next.js, Node.js, Supabase, Tailwind, Python"
                      className="text-xs"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {skillsInput
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[10px]">
                            {skill}
                          </Badge>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetRoles" className="text-xs">Target Job Roles (Comma separated)</Label>
                    <Input
                      id="targetRoles"
                      value={targetRolesInput}
                      onChange={(e) => setTargetRolesInput(e.target.value)}
                      placeholder="Full Stack Engineer, AI Application Developer, Frontend Architect"
                      className="text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: LEARNING GOALS */}
            <TabsContent value="learning">
              <Card className="border-border/40 bg-card">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Learning Goals & Target Topics
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Current topics you are studying so AI Nexus Assistant can tailor explanations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="learningGoals" className="text-xs">Current Learning Goals</Label>
                    <Textarea
                      id="learningGoals"
                      value={learningGoals}
                      onChange={(e) => setLearningGoals(e.target.value)}
                      placeholder="Mastering Next.js 14 App Router, Supabase Row-Level Security, vector embeddings, and multi-agent systems..."
                      rows={4}
                      className="text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 5: DEVELOPER LINKS */}
            <TabsContent value="developer">
              <Card className="border-border/40 bg-card">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Developer Profiles & Portfolio Links
                  </CardTitle>
                  <CardDescription className="text-xs">
                    External profile links for developer context.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="githubUrl" className="text-xs flex items-center gap-1.5">
                      <Github className="h-3.5 w-3.5" />
                      GitHub Profile URL
                    </Label>
                    <Input
                      id="githubUrl"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/username"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portfolioUrl" className="text-xs flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" />
                      Portfolio / Website URL
                    </Label>
                    <Input
                      id="portfolioUrl"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://myportfolio.dev"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl" className="text-xs flex items-center gap-1.5">
                      <Linkedin className="h-3.5 w-3.5" />
                      LinkedIn Profile URL
                    </Label>
                    <Input
                      id="linkedinUrl"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between border-t border-border/40 pt-4">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Profile updates automatically personalize AI Nexus Assistant context.
            </p>
            <Button type="submit" disabled={saving} className="text-xs flex items-center gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Profile
            </Button>
          </div>
        </form>
      )}
    </PageContainer>
  );
}
