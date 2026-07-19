export default function Page({ user, def }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{def?.icon} {def?.label}</div>
          <div className="page-sub">{def?.desc}</div>
        </div>
      </div>
      <div className="loading-wrap">
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>🚧 Page under construction</div>
      </div>
    </div>
  );
}
