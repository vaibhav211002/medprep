import React from 'react';

export default function Loader({ label = 'Loading...' }) {
  return (
    <div className="flex items-center gap-3 text-slate text-sm py-10 justify-center">
      <span className="h-4 w-4 rounded-full border-2 border-pine border-t-transparent animate-spin" />
      {label}
    </div>
  );
}
