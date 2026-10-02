export default function DashboardLoading() {
  return (
    <main className="workspace dashboard-loading" aria-busy="true" aria-live="polite">
      <aside className="workspace-sidebar" aria-hidden="true">
        <div className="loading-brand">
          <span />
          <i />
        </div>
        <div className="loading-nav-label" />
        <div className="loading-nav-item" />
        <div className="loading-nav-item loading-nav-item-short" />
        <div className="loading-sidebar-bottom">
          <div />
          <div />
          <div />
        </div>
      </aside>
      <section className="workspace-main">
        <header className="workspace-topbar">
          <div className="loading-breadcrumb" />
          <div className="loading-action" />
        </header>
        <div className="dashboard-content">
          <div className="loading-welcome">
            <div>
              <div className="loading-eyebrow" />
              <div className="loading-title" />
              <div className="loading-subtitle" />
            </div>
            <div className="loading-action loading-welcome-action" />
          </div>
          <div className="loading-stats">
            {Array.from({ length: 4 }, (_, index) => <div className="loading-stat" key={index} />)}
          </div>
          <div className="loading-project-heading">
            <div />
            <div />
          </div>
          <div className="loading-projects">
            {Array.from({ length: 3 }, (_, index) => <div className="loading-project" key={index} />)}
          </div>
          <span className="visually-hidden">Loading your dashboard…</span>
        </div>
      </section>
    </main>
  );
}
