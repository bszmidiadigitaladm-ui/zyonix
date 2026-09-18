"use client";

// Last-resort boundary for errors in the root layout itself. It replaces the
// whole document, so it can't use the theme, i18n provider or shared UI — just
// inline styles that match the dark palette.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#06100e",
          color: "#f3f7f6",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#93a8a3", marginBottom: 24 }}>Please try again in a moment.</p>
          <button
            onClick={() => retry()}
            style={{
              background: "#2dd4bf",
              color: "#04211d",
              border: "none",
              borderRadius: 999,
              padding: "10px 20px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
