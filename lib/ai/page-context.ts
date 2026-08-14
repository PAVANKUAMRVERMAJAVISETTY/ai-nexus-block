import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PageType =
  | "home"
  | "about"
  | "tools"
  | "tool"
  | "projects"
  | "project"
  | "knowledge"
  | "knowledge_item"
  | "roadmaps"
  | "roadmap"
  | "admin"
  | "ide"
  | "unknown";

export interface PageContext {
  pathname: string;
  pageType: PageType;
  entityType?: "tool" | "project" | "knowledge" | "roadmap";
  entitySlug?: string;
  entityId?: string;
  title?: string;
}

function cleanPath(pathname?: string) {
  if (!pathname) return "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export async function getPageContext(pathname?: string): Promise<PageContext> {
  const path = cleanPath(pathname);
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) {
    return { pathname: path, pageType: "home", title: "Home" };
  }

  if (parts[0] === "about") {
    return { pathname: path, pageType: "about", title: "About" };
  }

  if (parts[0] === "tools") {
    if (parts[1]) {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from("nexus_tools")
        .select("id,name,slug")
        .eq("slug", parts[1])
        .maybeSingle();

      return {
        pathname: path,
        pageType: "tool",
        entityType: "tool",
        entitySlug: parts[1],
        entityId: data?.id,
        title: data?.name ?? parts[1],
      };
    }

    return { pathname: path, pageType: "tools", title: "AI Tools" };
  }

  if (parts[0] === "projects") {
    if (parts[1]) {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from("nexus_projects")
        .select("id,name,slug")
        .eq("slug", parts[1])
        .maybeSingle();

      return {
        pathname: path,
        pageType: "project",
        entityType: "project",
        entitySlug: parts[1],
        entityId: data?.id,
        title: data?.name ?? parts[1],
      };
    }

    return { pathname: path, pageType: "projects", title: "Projects" };
  }

  if (parts[0] === "knowledge") {
    if (parts[1]) {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from("nexus_knowledge")
        .select("id,title,slug")
        .eq("slug", parts[1])
        .maybeSingle();

      return {
        pathname: path,
        pageType: "knowledge_item",
        entityType: "knowledge",
        entitySlug: parts[1],
        entityId: data?.id,
        title: data?.title ?? parts[1],
      };
    }

    return {
      pathname: path,
      pageType: "knowledge",
      title: "Knowledge",
    };
  }

  if (parts[0] === "roadmaps") {
    if (parts[1]) {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from("nexus_roadmaps")
        .select("id,title,slug")
        .eq("slug", parts[1])
        .maybeSingle();

      return {
        pathname: path,
        pageType: "roadmap",
        entityType: "roadmap",
        entitySlug: parts[1],
        entityId: data?.id,
        title: data?.title ?? parts[1],
      };
    }

    return {
      pathname: path,
      pageType: "roadmaps",
      title: "Roadmaps",
    };
  }

  if (parts[0] === "admin") {
    return {
      pathname: path,
      pageType: "admin",
      title: "Admin",
    };
  }

  if (parts[0] === "ide") {
    return {
      pathname: path,
      pageType: "ide",
      title: "Nexus IDE",
    };
  }

  return {
    pathname: path,
    pageType: "unknown",
  };
}
