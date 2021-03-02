type routerChange = (path: Location) => void;
type LabPageType = "demos" | "games" | "tools";

export const routes = new Map<string, { component: Function; tag: string }>();
export const links: Record<
  LabPageType,
  {
    name: string;
    slug: string;
  }[]
> = {
  demos: [],
  games: [],
  tools: [],
};

Object.entries(import.meta.glob("../projects/**/index.ts*")).map(
  ([path, component]) => {
    const [type, name] = path.replace("../projects/", "").split("/");
    const slug = ["", type, name].join("/");
    const tag = `lab-` + name;
    routes.set(slug, { tag, component });
    links[type as LabPageType].push({ name, slug });
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
