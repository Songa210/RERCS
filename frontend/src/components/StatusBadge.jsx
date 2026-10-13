// A small colored label that shows an incident status.
function StatusBadge({ status }) {
  // "In Progress" becomes "In-Progress" so it matches the CSS class name
  const cssName = status.replace(/ /g, '-');

  return <span className={`badge badge-${cssName}`}>{status}</span>;
}

export default StatusBadge;