import { createApp } from "vue";

export const withVue = (element: Parameters<typeof createApp>[0]) => ({
  render(root: HTMLElement) {
    createApp(element).mount(root);
  },
});
