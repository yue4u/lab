import { createApp } from "vue";
import { define } from "./with-define";

export const withVue = (element: Parameters<typeof createApp>[0]) =>
  define((root) => {
    createApp(element).mount(root);
  });
