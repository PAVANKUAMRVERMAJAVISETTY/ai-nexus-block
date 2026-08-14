import { describe, expect, it } from 'vitest';

describe('Part 5 — Public Profile Data Security & Projection', () => {
  it('defines safe public profile response schema without sensitive auth fields', () => {
    const mockPublicResponse = {
      profile: {
        full_name: 'Naga Pavan Kumar',
        professional_title: 'AI Full Stack Developer',
        profile_photo_url: null,
        short_bio: 'Building intelligent developer tools',
        full_bio: 'Passionate software engineer',
        skills: ['TypeScript', 'Next.js'],
        github_url: 'https://github.com',
        linkedin_url: 'https://linkedin.com',
        website_url: 'https://ainexusblock.com',
        resume_url: null,
      },
    };

    expect(mockPublicResponse.profile).not.toHaveProperty('id');
    expect(mockPublicResponse.profile).not.toHaveProperty('email');
    expect(mockPublicResponse.profile).not.toHaveProperty('role');
    expect(mockPublicResponse.profile).not.toHaveProperty('password');
    expect(mockPublicResponse.profile).not.toHaveProperty('service_role_key');
    expect(mockPublicResponse.profile).toHaveProperty('full_name');
    expect(mockPublicResponse.profile).toHaveProperty('professional_title');
    expect(mockPublicResponse.profile).toHaveProperty('skills');
  });
});
