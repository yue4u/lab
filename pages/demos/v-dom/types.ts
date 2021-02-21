export type vPropAttrs = {
  [k: string]: any;
};
export type vProps = {
  attrs?: vPropAttrs;
  children?: vNodeChildren;
};

export interface vElementNode extends vProps {
  tag: string;
}
export type vNode = vElementNode | string;
export type vNodeChildren = vNode[];
export type Node = HTMLElement | Text;
export type patch<T = Element> = (node: T) => any;
