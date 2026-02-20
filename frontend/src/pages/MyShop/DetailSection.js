function DetailSection({ title, children }) {
  return (
    <div className="detail-section">
      <h4>{title}</h4>
      <div className="detail-grid">
        {children}
      </div>
    </div>
  );
}