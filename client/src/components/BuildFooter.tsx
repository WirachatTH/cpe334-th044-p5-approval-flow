// The last line of every screen: which commit the UI was built from (F-05 contract v0.10, section 2.1, Lab 5 R-08).
// The value is fixed when the image is built (Dockerfile build argument GIT_SHA, passed as VITE_GIT_SHA), so a person
// looking at the public page can tell which release is running. Only a hexadecimal commit is shown. Anything else,
// including an unset value, shows "dev", so nothing from the build environment can put free text on the page.

const COMMIT = /^[0-9a-f]{7,40}$/;

export function BuildFooter() {
  const value: unknown = import.meta.env.VITE_GIT_SHA;
  const id = typeof value === "string" && COMMIT.test(value) ? value.slice(0, 7) : "dev";
  return <footer className="build-footer">Build {id}</footer>;
}
