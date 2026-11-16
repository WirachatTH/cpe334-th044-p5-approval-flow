/// <reference types="vite/client" />

interface ImportMetaEnv {
  // The commit the UI was built from (F-05 v0.10); see components/BuildFooter.tsx.
  readonly VITE_GIT_SHA?: string;
}
