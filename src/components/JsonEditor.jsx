import React, { useState, useEffect } from 'react';

export default function JsonEditor({ isOpen, onClose, jsonData, onImport }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setText(jsonData);
      setError('');
    }
  }, [isOpen, jsonData]);

  function handleImport() {
    const success = onImport(text);
    if (success) {
      setError('');
      onClose();
    } else {
      setError('Invalid JSON format. Please check your data and try again.');
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Bracket JSON</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="modal-description">
            Edit the JSON directly to update teams, owners, and scores. You can copy this JSON,
            modify it, and paste it back to import changes.
          </p>
          <textarea
            className="json-textarea"
            value={text}
            onChange={(e) => { setText(e.target.value); setError(''); }}
            spellCheck={false}
          />
          {error && <div className="json-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleCopy}>
            {copied ? '✓ Copied!' : 'Copy JSON'}
          </button>
          <div className="modal-footer-right">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleImport}>Import JSON</button>
          </div>
        </div>
      </div>
    </div>
  );
}
