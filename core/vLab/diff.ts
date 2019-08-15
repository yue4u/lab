import { vNode, vPropAttrs, patch } from "./types";
import { render } from "./render";

export function diff(
  vOldTree: vNode,
  vNewTree: vNode
): patch<Element | ChildNode> {
  if (vNewTree === undefined) {
    return node => {
      node.remove();
      return undefined;
    };
  }

  if (typeof vOldTree === "string" || typeof vNewTree === "string") {
    if (vOldTree !== vNewTree) {
      return node => {
        const newNode = render(vNewTree);
        node.replaceWith(newNode);
        return newNode;
      };
    } else {
      return node => node;
    }
  }

  if (vOldTree.tag !== vNewTree.tag) {
    return node => {
      const newNode = render(vNewTree);
      node.replaceWith(newNode);
      return newNode;
    };
  }

  const diffProps = (prevProps: vPropAttrs, newProps: vPropAttrs): patch => {
    const patches: patch[] = [];

    for (const [k, v] of Object.entries(newProps)) {
      patches.push(node => {
        node.setAttribute(k, v);
        return node;
      });
    }

    for (const k in prevProps) {
      if (!(k in newProps)) {
        patches.push(node => {
          node.removeAttribute(k);
          return node;
        });
      }
    }

    return node => {
      for (const patch of patches) {
        patch(node);
      }
      return node;
    };
  };

  const zip = (xs: patch<ChildNode>[], ys: NodeListOf<ChildNode>) => {
    const zipped = [];
    for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
      zipped.push({ p: xs[i], node: ys[i] });
    }
    return zipped;
  };

  const diffChildren = (
    vOldChildren: vNode[],
    vNewChildren: vNode[]
  ): patch<ChildNode | Element> => {
    let childPatches: patch<ChildNode>[] = [];

    vOldChildren.forEach((vOldChild, i) => {
      const patch = diff(vOldChild, vNewChildren[i]);

      childPatches.push(patch);
    });

    const additionalPatches: patch<Element>[] = [];
    for (const vAdditionalChild of vNewChildren.slice(vOldChildren.length)) {
      additionalPatches.push(node => {
        node.appendChild(render(vAdditionalChild));
        return node;
      });
    }

    return parent => {
      for (const item of zip(childPatches, parent.childNodes)) {
        item.p(item.node);
      }

      for (const patch of additionalPatches) {
        if (parent instanceof Element) {
          patch(parent);
        }
      }
      return parent;
    };
  };

  const patchProps = diffProps(vOldTree.attrs || {}, vNewTree.attrs || {});
  const patchChildren = diffChildren(
    vOldTree.children || [],
    vNewTree.children || []
  );

  return node => {
    if (node instanceof Element) {
      patchProps(node);
    }
    patchChildren(node);
    return node;
  };
}
