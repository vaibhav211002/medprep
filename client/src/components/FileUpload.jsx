import React, { useRef, useState } from 'react';

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export default function FileUpload({ file, onFileChange, id = 'pdf-upload' }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  function acceptFile(candidate) {
    if (!candidate) return;
    const isPdf = candidate.type === 'application/pdf' || candidate.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Choose a PDF file.');
      onFileChange(null);
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setError('The PDF must be 25 MB or smaller.');
      onFileChange(null);
      return;
    }
    setError('');
    onFileChange(candidate);
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div>
      <div
        className={'rounded-2xl border border-dashed p-6 text-center transition-colors sm:p-8 ' +
          (dragging ? 'border-pine bg-pine-light' : 'border-line bg-paper/70 hover:border-pine/60')}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          id={id}
          className="sr-only"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => acceptFile(event.target.files?.[0])}
        />
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-pine-light text-lg font-semibold text-pine-dark" aria-hidden="true">
          PDF
        </div>
        {file ? (
          <>
            <p className="mt-3 break-all text-sm font-semibold text-ink">{file.name}</p>
            <p className="mt-1 text-xs text-slate">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn-secondary !py-2" onClick={() => inputRef.current?.click()}>
                Choose another
              </button>
              <button type="button" className="btn-secondary !py-2" onClick={() => { onFileChange(null); setError(''); }}>
                Remove
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm font-semibold text-ink">Drag and drop a PDF here</p>
            <p className="mt-1 text-xs text-slate">PDF only, up to 25 MB</p>
            <button type="button" className="btn-secondary mt-4 !py-2" onClick={() => inputRef.current?.click()}>
              Choose a PDF
            </button>
          </>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
