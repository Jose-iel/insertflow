'use client';

import { useState, useCallback } from 'react';
import { ImageUploader } from './image-uploader';
import { ImageGallery } from './image-gallery';

export function ImagesContainer() {
  const [refreshKey, setRefreshKey] = useState(0);

  const onUploadComplete = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <>
      <ImageUploader onUploadComplete={onUploadComplete} />
      <ImageGallery key={refreshKey} />
    </>
  );
}
