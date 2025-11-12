self.onmessage = async (e) => {
  const [tpl, items] = e.data as [string, string[][]];
  const { iterTpl } = await import("./js/iter-tpl.min");

  const ret = items
    .map((array) => {
      try {
        return iterTpl.template(tpl, array);
      } catch (e) {
        return e;
      }
    })
    .join("\n");
  self.postMessage(ret);
};
