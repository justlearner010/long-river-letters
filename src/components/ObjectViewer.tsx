import { useEffect, useState } from 'react';

// Must respect the deploy base: project pages are served from /<repo>/, so a
// leading-slash path would resolve against the domain root and 404.
const MODEL_VIEWER_SRC = `${import.meta.env.BASE_URL}vendor/model-viewer.min.js`;

interface ObjectViewerProps {
  src: string;
  alt: string;
}

/**
 * Module-level singleton: the bundle is ~950 KB and must be fetched exactly once
 * no matter how many viewers mount (or how many times React re-runs the effect).
 */
let loaderPromise: Promise<void> | null = null;

function loadModelViewer(): Promise<void> {
  if (!loaderPromise) {
    loaderPromise = new Promise<void>((resolve, reject) => {
      const existing = customElements.get('model-viewer');
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.type = 'module';
      script.src = MODEL_VIEWER_SRC;
      script.dataset.modelViewer = 'true';
      script.addEventListener('load', () => {
        customElements.whenDefined('model-viewer').then(() => resolve());
      });
      script.addEventListener('error', () => reject(new Error('model-viewer failed to load')));
      document.head.append(script);
    });
  }
  return loaderPromise;
}

export default function ObjectViewer({ src, alt }: ObjectViewerProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    // jsdom has no custom-element registry or WebGL.
    if (typeof window === 'undefined' || !window.customElements) {
      setStatus('failed');
      return;
    }
    let active = true;
    loadModelViewer()
      .then(() => {
        if (active) setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('failed');
      });
    return () => {
      active = false;
    };
  }, []);

  if (status === 'failed') {
    return <p className="letter-object-caption">3D 模型未能加载</p>;
  }
  if (status === 'loading') {
    return <p className="letter-object-caption">正在展开物件…</p>;
  }

  return (
    <model-viewer
      src={src}
      alt={alt}
      camera-orbit="0deg 62deg 1.6m"
      min-camera-orbit="auto 0deg auto"
      max-camera-orbit="auto 90deg auto"
      auto-rotate
      auto-rotate-delay="0"
      rotation-per-second="12deg"
      interaction-prompt="none"
      shadow-intensity="0"
      exposure="1"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
