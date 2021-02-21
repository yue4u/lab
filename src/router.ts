type routerChange = (path: Location) => void;

export const routes = new Map<string, { component: Function; tag: string }>();

export const links: {
  name: string;
  slug: string;
}[] = Object.entries(import.meta.glob("../pages/**/index.ts*")).map(
  ([path, component]) => {
    const [type, name] = path.replace("../pages/", "").split("/");
    const slug = ["", type, name].join("/");
    const tag = `lab-` + name;
    routes.set(slug, { tag, component });
    return { slug, name };
  }
);

const listeners = new Set<routerChange>();

export const router = {
  push(path: string) {
    history.pushState({}, "", path);
    listeners.forEach((l) => l(window.location));
  },
  listen(fn: routerChange) {
    listeners.add(fn);
  },
};

window.addEventListener("popstate", () => {
  listeners.forEach((l) => l(window.location));
});
