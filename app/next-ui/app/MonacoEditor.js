"use client";

import React, { useEffect, useState } from "react";

/**
 * Thin runtime wrapper around @monaco-editor/react that loads Monaco from
 * local static files (public/vs/) instead of the jsDelivr CDN.
 *
 * The import is performed inside useEffect so it only runs in the browser.
 * This prevents Turbopack from statically analysing @monaco-editor/loader's
 * config (which contains a CDN URL that Turbopack tries to resolve as a
 * filesystem path, causing ENOENT).
 */
export default function MonacoEditor(props) {
  const [EditorComponent, setEditorComponent] = useState(null);

  useEffect(() => {
    let cancelled = false;

    import("@monaco-editor/react").then((mod) => {
      if (cancelled) return;

      // Configure the loader to use local static files served from public/vs/
      mod.loader.config({ paths: { vs: "/vs" } });

      // mod.default is the <Editor /> component
      setEditorComponent(() => mod.default);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!EditorComponent) {
    return (
      <div
        style={{
          height: props.height || "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1e1e1e",
          color: "#6b7280",
          fontSize: "12px",
          fontFamily: "var(--font-geist-mono), monospace",
        }}
      >
        Loading editor...
      </div>
    );
  }

  return <EditorComponent {...props} />;
}
