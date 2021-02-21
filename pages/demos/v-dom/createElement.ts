import { vProps, vNode } from "./types";

export function createElement(
  tag: string,
  { attrs = {}, children = [] }: vProps
): vNode {
  const vEl = Object.create(null);
  return Object.assign(vEl, {
    tag,
    attrs,
    children
  });
}
