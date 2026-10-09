interface PendingActionsProps {
  pendingClipboard?: string;
  pendingShell?: string;
  onConfirmClipboard: () => void;
  onCancelClipboard: () => void;
  onConfirmShell: () => void;
  onCancelShell: () => void;
}

export function PendingActions({
  pendingClipboard,
  pendingShell,
  onConfirmClipboard,
  onCancelClipboard,
  onConfirmShell,
  onCancelShell,
}: PendingActionsProps) {
  if (!pendingClipboard && !pendingShell) return null;

  return (
    <div className="pending-actions">
      {pendingClipboard != null && (
        <div className="pending-card">
          <p className="pending-label">Copy to clipboard?</p>
          <pre className="pending-preview">{pendingClipboard}</pre>
          <div className="pending-buttons">
            <button type="button" onClick={onConfirmClipboard}>
              Copy
            </button>
            <button type="button" className="secondary" onClick={onCancelClipboard}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {pendingShell != null && (
        <div className="pending-card warn">
          <p className="pending-label">Run shell command?</p>
          <pre className="pending-preview">{pendingShell}</pre>
          <div className="pending-buttons">
            <button type="button" onClick={onConfirmShell}>
              Run
            </button>
            <button type="button" className="secondary" onClick={onCancelShell}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
