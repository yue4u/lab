import { vNode, Node } from "./types";

export function renderChild(vNode: vNode): Node {
  if (typeof vNode === "string") {
    return document.createTextNode(vNode);
  } else {
    return render(vNode);
  }
}

export function render(vNode: vNode): Node {
  if (typeof vNode === "string") {
    return renderChild(vNode);
  }

  const node = document.createElement(vNode.tag);

  if (vNode.attrs) {
    Object.entries(vNode.attrs).map(([k, v]) => node.setAttribute(k, v));
  }

  if (Array.isArray(vNode.children) && vNode.children.length) {
    vNode.children.map(child => node.appendChild(renderChild(child)));
  }
  return node;
}

export function mount(node: Node, parent: Element): Element {
  parent.replaceWith(node);
  if (typeof node === "string") {
    if (parent.parentNode instanceof Element) {
      return parent.parentNode;
    } else {
      throw Error("parentNode is not Element");
    }
  } else {
    if (node instanceof Element) {
      return node;
    } else {
      throw Error("node is not Element");
    }
  }
}
