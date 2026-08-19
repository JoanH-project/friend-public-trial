"use client";

import { useEffect, useState } from "react";

type AvatarProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
};

/** A fixed, cropped avatar that never lets user supplied images affect layout. */
export default function Avatar({ src, alt = "", className = "", imageClassName = "" }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  return (
    <div className={`avatar-frame ${className}`.trim()}>
      {src && !failed ? (
        <img className={imageClassName} src={src} alt={alt} onError={() => setFailed(true)} />
      ) : (
        <span aria-label="默认头像" role="img">😈</span>
      )}
    </div>
  );
}
