// ─────────────────────────────────────────────────────────────────────────────
// StoredFile — loads a file from IndexedDB and renders a thumb + link
// Props:
//   idbKey    : key used when saving to IndexedDB (e.g. "load_load001_rateCon")
//   fileName  : original filename (determines image vs non-image display)
//   imgStyle  : optional override for image element styles
//   showThumb : whether to show image preview (default true)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { idbGet } from "../storage";
import { C } from "../styles";

export default function StoredFile({ idbKey, fileName, imgStyle, showThumb = true }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let objectUrl = null;
    if (!idbKey) return;

    idbGet(idbKey).then(blob => {
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [idbKey]);

  if (!fileName) return null;

  const isImage = /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(fileName);

  return (
    <div>
      {showThumb && url && isImage && (
        <img
          src={url}
          alt={fileName}
          style={imgStyle || {
            width:"100%", maxHeight:120, objectFit:"contain",
            borderRadius:6, marginBottom:6, border:`1px solid ${C.border}`,
          }}
        />
      )}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize:11, color:C.accent, display:"block",
                   marginBottom:4, fontWeight:700 }}
        >
          {isImage ? "🔍 View full size ↗" : "📎 Open file ↗"} — {fileName}
        </a>
      ) : (
        <div style={{ fontSize:11, color:C.green, fontWeight:700 }}>
          ✓ {fileName}
        </div>
      )}
    </div>
  );
}
