"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  FolderHeart,
  Image as ImageIcon,
  Images,
  Layers3,
  Plus,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import type { ProjectStatus } from "@/generated/prisma/client";

type DashboardProject = {
  id: string;
  name: string;
  status: ProjectStatus;
  updatedAt: string;
  coverImage: string | null;
  imageCount: number;
};

type DashboardClientProps = {
  user: {
    name: string | null;
    email: string;
    credits: number;
  };
  stats: {
    totalProjects: number;
    completedProjects: number;
    generatedImages: number;
  };
  projects: DashboardProject[];
};

const statusLabel: Record<ProjectStatus, string> = {
  DRAFT: "Draft",
  UPLOADING: "Uploading",
  ANALYZING: "Analyzing",
  GENERATING: "Generating",
  COMPLETED: "Complete",
  FAILED: "Needs attention",
};

function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoDate));
}

export function DashboardClient({
  user,
  stats,
  projects,
}: DashboardClientProps) {
  const [query, setQuery] = useState("");
  const [remoteResults, setRemoteResults] = useState<{
    query: string;
    projects: DashboardProject[];
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"recent" | "name">("recent");
  const displayName = user.name?.trim().split(/\s+/)[0] || "there";
  const recentMatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return projects;
    return projects.filter((project) =>
      project.name.toLowerCase().includes(normalizedQuery),
    );
  }, [projects, query]);
  const normalizedQuery = query.trim();
  const matchingProjects =
    remoteResults?.query === normalizedQuery
      ? remoteResults.projects
      : recentMatches;
  const filteredProjects = useMemo(() => {
    if (sortOrder === "name") {
      return [...matchingProjects].sort((first, second) =>
        first.name.localeCompare(second.name),
      );
    }
    return matchingProjects;
  }, [matchingProjects, sortOrder]);

  useEffect(() => {
    if (!normalizedQuery) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/projects?q=${encodeURIComponent(normalizedQuery)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const result = await response.json() as {
            projects?: DashboardProject[];
            error?: string;
          };
          if (!response.ok) throw new Error(result.error ?? "Could not search projects.");
          setRemoteResults({ query: normalizedQuery, projects: result.projects ?? [] });
          setSearchError(null);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setSearchError(error instanceof Error ? error.message : "Could not search projects.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchLoading(false);
        });
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery]);

  function updateSearch(value: string) {
    setQuery(value);
    setSearchLoading(Boolean(value.trim()));
    setSearchError(null);
    if (!value.trim()) setRemoteResults(null);
  }

  return (
    <main className="workspace">
      <aside className="workspace-sidebar">
        <Link className="workspace-brand" href="/" aria-label="SnapStudio AI home">
          <span className="workspace-brand-mark"><Sparkles size={17} /></span>
          <span>snapstudio<span>.ai</span></span>
        </Link>

        <div className="workspace-nav-label">WORKSPACE</div>
        <nav className="workspace-nav" aria-label="Workspace navigation">
          <a className="workspace-nav-item active" href="#overview">
            <Layers3 size={17} /> Overview
          </a>
          <a className="workspace-nav-item" href="#recent-projects">
            <FolderHeart size={17} /> My projects
            <span className="nav-count">{stats.totalProjects}</span>
          </a>
          <Link className="workspace-nav-item" href="/gallery">
            <Images size={17} /> Gallery
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-credit-card">
            <span className="credit-card-icon"><Sparkles size={15} /></span>
            <span className="credit-card-label">CREATION CREDITS</span>
            <strong>{user.credits}</strong>
            <small>credits available</small>
            <div className="credit-progress" aria-label={`${user.credits} credits remaining`}>
              <span style={{ width: `${Math.min(100, Math.max(0, user.credits * 10))}%` }} />
            </div>
            <span className="credit-note">More ways to create, coming soon.</span>
          </div>
          <div className="sidebar-user">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "workspace-avatar",
                  userButtonPopoverCard: "workspace-user-popover",
                },
              }}
            />
            <span className="sidebar-user-copy">
              <strong>{user.name || "Your account"}</strong>
              <small>{user.email}</small>
            </span>
            <ChevronDown size={14} className="user-chevron" />
          </div>
        </div>
      </aside>

      <section className="workspace-main" id="overview">
        <header className="workspace-topbar">
          <div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>Overview</strong></div>
          <div className="topbar-actions">
            <span className="topbar-status"><span /> All systems ready</span>
            <Link href="/projects/new" className="button button-primary topbar-create">
              <Plus size={16} /> New project
            </Link>
          </div>
        </header>

        <div className="dashboard-content">
          <motion.div
            className="dashboard-welcome"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div>
              <span className="eyebrow"><span className="status-dot" /> YOUR CREATIVE SPACE</span>
              <h1>Good to see you, {displayName}<span>.</span></h1>
              <p>Your next great campaign is closer than you think.</p>
            </div>
            <Link href="/projects/new" className="button button-primary welcome-create">
              <WandSparkles size={16} /> Create a photoshoot <ArrowRight size={16} />
            </Link>
          </motion.div>

          <div className="dashboard-stats">
            <article className="dashboard-stat">
              <span className="stat-icon stat-icon-lime"><Layers3 size={17} /></span>
              <span className="stat-label">TOTAL PROJECTS</span>
              <strong>{stats.totalProjects}</strong>
              <small>In your workspace</small>
            </article>
            <article className="dashboard-stat">
              <span className="stat-icon"><Check size={17} /></span>
              <span className="stat-label">COMPLETED SHOOTS</span>
              <strong>{stats.completedProjects}</strong>
              <small>Ready to share</small>
            </article>
            <article className="dashboard-stat">
              <span className="stat-icon"><ImageIcon size={17} /></span>
              <span className="stat-label">IMAGES CREATED</span>
              <strong>{stats.generatedImages}</strong>
              <small>Across all projects</small>
            </article>
            <article className="dashboard-stat credit-stat">
              <span className="stat-icon"><Sparkles size={17} /></span>
              <span className="stat-label">CREDITS LEFT</span>
              <strong>{user.credits}</strong>
              <small>Ready when you are</small>
            </article>
          </div>

          <section className="projects-section" id="recent-projects">
            <div className="projects-heading">
              <div>
                <span className="eyebrow">YOUR WORK, AT A GLANCE</span>
                <h2>Recent projects</h2>
              </div>
              <div className="project-tools">
                <label className="project-search">
                  <Search size={15} />
                  <input
                    aria-label="Search projects"
                    placeholder="Search projects"
                    value={query}
                    onChange={(event) => updateSearch(event.target.value)}
                  />
                </label>
                <label className="sort-select-label">
                  <span className="visually-hidden">Sort projects</span>
                  <select
                    className="sort-button"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value as "recent" | "name")}
                    aria-label="Sort projects"
                  >
                    <option value="recent">Recent</option>
                    <option value="name">Name A–Z</option>
                  </select>
                  <ChevronDown size={13} aria-hidden="true" />
                </label>
              </div>
            </div>

            {!normalizedQuery && projects.length === 0 ? (
              <motion.div
                className="dashboard-empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
              >
                <div className="empty-art">
                  <span className="empty-orbit empty-orbit-one" />
                  <span className="empty-orbit empty-orbit-two" />
                  <span className="empty-sparkle"><WandSparkles size={26} /></span>
                </div>
                <span className="eyebrow">A BLANK CANVAS, IN THE BEST WAY</span>
                <h3>Your first campaign starts with one photo.</h3>
                <p>Upload a product image and turn it into a complete fashion shoot.</p>
                <Link href="/projects/new" className="button button-primary">
                  Start your first project <ArrowRight size={16} />
                </Link>
              </motion.div>
            ) : filteredProjects.length === 0 && searchLoading ? (
              <div className="project-no-results">
                <span className="upload-spinner"><Search size={18} /></span>
                <strong>Searching your projects…</strong>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="project-no-results">
                <Search size={20} />
                <strong>{searchError ?? `No projects match “${query}”`}</strong>
                <span>{searchError ? "Try again or refresh the page." : "Try another project name."}</span>
              </div>
            ) : (
              <div className="project-grid">
                {filteredProjects.map((project, index) => (
                  <motion.article
                    className="project-card"
                    key={project.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.05 }}
                  >
                    <Link
                      href={`/projects/${project.id}`}
                      className="project-cover"
                      style={project.coverImage ? { backgroundImage: `url("${project.coverImage}")` } : undefined}
                      aria-label={`Open project ${project.name}`}
                    >
                      {!project.coverImage && <ImageIcon size={26} />}
                      <span className={`project-status status-${project.status.toLowerCase()}`}>
                        <span /> {statusLabel[project.status]}
                      </span>
                      <span className="project-open"><ArrowUpRight size={16} /></span>
                    </Link>
                    <div className="project-card-details">
                      <div>
                        <Link href={`/projects/${project.id}`} className="project-name">{project.name}</Link>
                        <span className="project-date"><Clock3 size={12} /> {formatDate(project.updatedAt)}</span>
                      </div>
                      <span className="project-image-count">{project.imageCount} <ImageIcon size={13} /></span>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </section>

          <footer className="dashboard-footer">
            <span>Made for the brands making their own rules.</span>
            <span>SNAPSTUDIO AI · 2026</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
