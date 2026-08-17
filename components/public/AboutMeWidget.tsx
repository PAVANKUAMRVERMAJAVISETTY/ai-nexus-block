'use client';

import { useEffect, useState } from 'react';
import { User, X, ExternalLink, FileText, Github, Linkedin, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProfileData {
  full_name: string;
  professional_title: string;
  profile_photo_url: string | null;
  short_bio: string;
  full_bio: string | null;
  skills: string[];
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  resume_url: string | null;
}

export function AboutMeWidget() {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [showAutoPopup, setShowAutoPopup] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Fetch public profile data
    fetch('/api/public/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data?.profile) {
          setProfile(data.profile);
        }
      })
      .catch(() => {});

    // Check if auto-popup was already shown during this session
    const seen = sessionStorage.getItem('nexus_about_popup_seen');
    if (!seen) {
      setShowAutoPopup(true);

      const timer = setTimeout(() => {
        setShowAutoPopup(false);
        sessionStorage.setItem('nexus_about_popup_seen', 'true');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!mounted || !profile) return null;

  const dismissAutoPopup = () => {
    setShowAutoPopup(false);
    sessionStorage.setItem('nexus_about_popup_seen', 'true');
  };

  const openFullModal = () => {
    setShowAutoPopup(false);
    setShowFullModal(true);
    sessionStorage.setItem('nexus_about_popup_seen', 'true');
  };

  const displayPhoto = profile?.profile_photo_url || '/naga-pavan-profile.jpg';

  return (
    <>
      {/* 1. 5-Second Automated Introduction Centered Splash Popup */}
      {showAutoPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in zoom-in-95 duration-300"
          role="dialog"
          aria-label="Developer Introduction"
        >
          <div className="bg-card border border-primary/40 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-center flex flex-col items-center">
            <button
              onClick={dismissAutoPopup}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Dismiss intro"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-primary/50 bg-muted flex items-center justify-center text-primary font-bold text-2xl shrink-0 shadow-xl mb-4">
              <img
                src={displayPhoto}
                alt={profile.full_name}
                className="h-full w-full object-cover"
              />
            </div>

            <h3 className="text-xl font-bold text-foreground leading-tight flex items-center justify-center gap-2">
              {profile.full_name}
              <Sparkles className="h-5 w-5 text-amber-400 fill-amber-400" />
            </h3>
            <p className="text-sm text-primary font-semibold mt-1">{profile.professional_title}</p>

            <p className="mt-3 text-xs text-muted-foreground leading-relaxed max-w-sm">
              {profile.short_bio}
            </p>

            {profile.skills && profile.skills.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {profile.skills.slice(0, 6).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-md"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between w-full pt-3 border-t border-border/50">
              <span className="text-[11px] text-muted-foreground italic">Moving to bottom-right in 5s...</span>
              <Button size="sm" variant="default" onClick={openFullModal} className="text-xs px-4">
                Full Profile →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Persistent Bottom-Right About Me Floating Widget */}
      {!showFullModal && (
        <div className="fixed bottom-6 right-6 z-40 transition-all duration-300">
          {minimized ? (
            <Button
              onClick={() => setMinimized(false)}
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg border-primary/40 bg-card hover:bg-muted"
              aria-label="Open About Me widget"
              title="About Developer"
            >
              <User className="h-5 w-5 text-primary" />
            </Button>
          ) : (
            <div className="bg-card/90 border border-border/80 rounded-xl p-3 shadow-xl backdrop-blur-md flex items-center gap-3 max-w-xs transition-all hover:border-primary/40 group">
              <div className="h-9 w-9 rounded-full overflow-hidden border border-primary/30 bg-muted flex items-center justify-center shrink-0">
                <img
                  src={displayPhoto}
                  alt={profile.full_name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{profile.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{profile.professional_title}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={openFullModal}
                  className="h-7 text-xs px-2 text-primary hover:text-primary hover:bg-primary/10"
                >
                  About →
                </Button>
                <button
                  onClick={() => setMinimized(true)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                  aria-label="Minimize About Me"
                  title="Minimize"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Full Interactive About Me Modal */}
      {showFullModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="About Developer Profile"
          >
            <button
              onClick={() => setShowFullModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-primary/50 bg-muted flex items-center justify-center shadow-md mb-3">
                <img
                  src={displayPhoto}
                  alt={profile.full_name}
                  className="h-full w-full object-cover"
                />
              </div>

              <h2 className="text-xl font-bold text-foreground">{profile.full_name}</h2>
              <p className="text-sm text-primary font-medium mt-0.5">{profile.professional_title}</p>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed max-w-sm">
                {profile.short_bio}
              </p>
            </div>

            {profile.full_bio && (
              <div className="mt-5 pt-4 border-t border-border">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  About Me
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                  {profile.full_bio}
                </p>
              </div>
            )}

            {profile.skills && profile.skills.length > 0 && (
              <div className="mt-5 pt-4 border-t border-border">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  Skills & Technologies
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 text-xs font-medium bg-muted text-foreground border border-border rounded-md"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-center gap-2">
              {profile.github_url && (
                <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5">
                  <a href={profile.github_url} target="_blank" rel="noopener noreferrer">
                    <Github className="h-3.5 w-3.5" />
                    GitHub
                  </a>
                </Button>
              )}
              {profile.linkedin_url && (
                <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5">
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-3.5 w-3.5" />
                    LinkedIn
                  </a>
                </Button>
              )}
              {profile.resume_url && (
                <Button variant="default" size="sm" asChild className="h-8 text-xs gap-1.5">
                  <a href={profile.resume_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-3.5 w-3.5" />
                    Resume
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
