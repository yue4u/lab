const modules: Record<string, Function> = import.meta.glob(
  "../pages/**/index.ts*"
);

Object.entries(modules).forEach(async ([path, defineFn]) => {
  const name = `lab-` + path.split("/").reverse()[1];
  (await defineFn()).default(name);
  const view = document.createElement(name);
  document.querySelector("#app")?.appendChild(view);
});
