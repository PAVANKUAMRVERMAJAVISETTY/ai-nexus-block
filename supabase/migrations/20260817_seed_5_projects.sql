-- ============================================================
-- SEED ALL 5 PRODUCTION PROJECTS INTO nexus_projects
-- ============================================================

INSERT INTO public.nexus_projects (
    id,
    title,
    slug,
    description,
    long_description,
    project_type,
    tags,
    repository_url,
    live_url,
    image_url,
    featured,
    status,
    metadata
)
VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'AI Nexus Block',
    'ai-nexus-block',
    'AI-Powered Developer Research & Engineering Platform featuring advanced AI-driven code analysis, instant bug resolution workflows, and secure PostgreSQL RLS architecture.',
    'Official creator and research platform built using Next.js 15, TypeScript, Supabase RLS, and a multi-provider AI assistant. Offers developer tools directory, interactive architecture diagrams, engineering roadmaps, and instant AI copilot support.',
    'Full Stack AI',
    ARRAY['Next.js', 'TypeScript', 'Supabase RLS', 'Tailwind CSS', 'AI Assistant', 'Framer Motion'],
    'https://github.com/PAVANKUAMRVERMAJAVISETTY/ai-nexus-block',
    'https://ai-nexus-block.vercel.app/',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
    TRUE,
    'published',
    '{"is_case_study": true}'::jsonb
),
(
    '00000000-0000-0000-0000-000000000002',
    'Urban Properties',
    'urban-properties',
    'Full-Stack Direct Owner Real Estate Platform & Lead Tracking featuring a 4-role RBAC hierarchy, Haversine geolocation area agent routing engine, unauthenticated lead capture gate, and zero-dependency PKZip binary archiver for bulk listing media downloads.',
    'Production real-time property rentals and sales web platform built with React 19, TypeScript, TanStack Router/Start, Supabase Auth and PostgreSQL RLS. Features micro-market territory routing via the Haversine formula and native Uint8Array/CRC-32 PKZip binary encoding.',
    'Supabase Systems',
    ARRAY['React 19', 'TypeScript', 'TanStack Router/Start', 'Supabase RLS', 'TanStack Query', 'Vite', 'Tailwind CSS', 'PKZip Archiver', 'Haversine Geolocation'],
    NULL,
    'https://seedhaproperties.com/',
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=800&auto=format&fit=crop',
    TRUE,
    'published',
    '{"is_case_study": true}'::jsonb
),
(
    '00000000-0000-0000-0000-000000000003',
    'Trippy''s Mehfill',
    'trippys-mehfill',
    'Intelligent Cloud-Kitchen ERP & Ordering Platform covering menu management, live order tracking, customer workflows, operational dashboards, and role-based access control with RLS policies.',
    'Full-stack cloud-kitchen ERP delivering real-time kitchen transactional updates, multi-tenant order streams, role-based staff dashboards, and strict database privacy using React/Next.js, TypeScript, and Supabase PostgreSQL RLS.',
    'Full Stack AI',
    ARRAY['React', 'Next.js', 'TypeScript', 'Supabase', 'PostgreSQL', 'RLS', 'Tailwind CSS'],
    NULL,
    'https://trippysmehfill.vercel.app/',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop',
    TRUE,
    'published',
    '{"is_case_study": true}'::jsonb
),
(
    '00000000-0000-0000-0000-000000000004',
    'Shree Gopi Traders',
    'shree-gopi-traders',
    'B2B Wholesale Salon & Beauty Supplies E-Commerce platform featuring quantity-based dynamic pricing, product variants, stock tracking, bulk-order inquiries, and WhatsApp support workflows.',
    'High-performance wholesale B2B e-commerce platform built using Next.js, TypeScript, Tailwind CSS, and Supabase. Supports dynamic bulk discount tiers, inventory tracking, and integrated customer inquiry routing.',
    'Frontend',
    ARRAY['Next.js', 'TypeScript', 'Tailwind CSS', 'Supabase', 'PostgreSQL', 'B2B E-Commerce'],
    NULL,
    'https://www.sreegopitraders.com/',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop',
    TRUE,
    'published',
    '{"is_case_study": false}'::jsonb
),
(
    '00000000-0000-0000-0000-000000000005',
    'Extru Tech',
    'extru-tech',
    'Industry & Professional Network Platform connecting students, consultants, and manufacturers with career pathways, formulation inquiries, and integrated Razorpay online payment workflows.',
    'Professional industrial network connecting engineering students, industrial consultants, and extrusion manufacturers. Integrates career paths, consultation bookings, and Razorpay API payment gateways.',
    'Backend & API',
    ARRAY['React', 'Next.js', 'Supabase', 'Razorpay API', 'TypeScript', 'Tailwind CSS'],
    NULL,
    'https://extru-tech.vercel.app/',
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800&auto=format&fit=crop',
    TRUE,
    'published',
    '{"is_case_study": false}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    long_description = EXCLUDED.long_description,
    project_type = EXCLUDED.project_type,
    tags = EXCLUDED.tags,
    repository_url = EXCLUDED.repository_url,
    live_url = EXCLUDED.live_url,
    image_url = EXCLUDED.image_url,
    featured = EXCLUDED.featured,
    status = EXCLUDED.status,
    metadata = EXCLUDED.metadata;
