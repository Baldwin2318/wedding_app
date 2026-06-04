import { useEffect } from "react";

export default function PhotoViewer({ photo, onClose }) {
  useEffect(() => {
    if (!photo) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [photo, onClose]);

  if (!photo) return null;

   return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close photo viewer"
        onClick={onClose}
        className="fixed right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-3xl leading-none text-white backdrop-blur-md active:scale-95"
      >
        ×
      </button>
  
      <img
        src={photo.src}
        alt={photo.alt ?? "Selected photo"}
        onClick={(event) => event.stopPropagation()}
        className="max-h-full max-w-full select-none rounded-2xl object-contain"
        draggable={false}
      />
    </div>
  );
}
