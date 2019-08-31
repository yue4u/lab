export const morseCodeMap = {
  a: ".-",
  b: "-...",
  c: "-.-.",
  d: "-..",
  e: ".",
  f: "..-.",
  g: "--.",
  h: "....",
  i: "..",
  j: ".---",
  k: "-.-",
  l: ".-..",
  m: "--",
  n: "-.",
  o: "---",
  p: ".--.",
  q: "--.-",
  r: ".-.",
  s: "...",
  t: "-",
  u: "..-",
  v: "...-",
  w: ".--",
  x: "-..-",
  y: "-.--",
  z: "--.."
};
type MorseCodeMap = typeof morseCodeMap;
type AToZ = keyof MorseCodeMap;

export const tagInterfaceMap = {
  a: HTMLAnchorElement,
  area: HTMLAreaElement,
  audio: HTMLAudioElement,
  br: HTMLBRElement,
  //base: HTMLBaseElement,
  //basefont: HTMLBaseFontElement,
  body: HTMLBodyElement,
  button: HTMLButtonElement,
  canvas: HTMLCanvasElement,
  //content: HTMLContentElement,
  dlist: HTMLDListElement,
  data: HTMLDataElement,
  datalist: HTMLDataListElement,
  dialog: HTMLDialogElement,
  embed: HTMLEmbedElement,
  fieldset: HTMLFieldSetElement,
  form: HTMLFormElement,
  frameset: HTMLFrameSetElement,
  hr: HTMLHRElement,
  head: HTMLHeadElement,
  heading: HTMLHeadingElement,
  html: HTMLHtmlElement,
  iframe: HTMLIFrameElement,
  image: HTMLImageElement,
  input: HTMLInputElement,
  //isindex: HTMLIsIndexElement,
  //keygen: HTMLKeygenElement,
  li: HTMLLIElement,
  label: HTMLLabelElement,
  legend: HTMLLegendElement,
  link: HTMLLinkElement,
  map: HTMLMapElement,
  media: HTMLMediaElement,
  meta: HTMLMetaElement,
  meter: HTMLMeterElement,
  mod: HTMLModElement,
  olist: HTMLOListElement,
  object: HTMLObjectElement,
  optgroup: HTMLOptGroupElement,
  option: HTMLOptionElement,
  output: HTMLOutputElement,
  paragraph: HTMLParagraphElement,
  param: HTMLParamElement,
  picture: HTMLPictureElement,
  pre: HTMLPreElement,
  progress: HTMLProgressElement,
  quote: HTMLQuoteElement,
  script: HTMLScriptElement,
  select: HTMLSelectElement,
  //  shadow: HTMLShadowElement,
  source: HTMLSourceElement,
  span: HTMLSpanElement,
  style: HTMLStyleElement,
  tablecaption: HTMLTableCaptionElement,
  tablecell: HTMLTableCellElement,
  tablecol: HTMLTableColElement,
  tabledatacell: HTMLTableDataCellElement,
  table: HTMLTableElement,
  tableheadercell: HTMLTableHeaderCellElement,
  tablerow: HTMLTableRowElement,
  tablesection: HTMLTableSectionElement,
  template: HTMLTemplateElement,
  textarea: HTMLTextAreaElement,
  time: HTMLTimeElement,
  title: HTMLTitleElement,
  track: HTMLTrackElement,
  ulist: HTMLUListElement,
  unknown: HTMLUnknownElement,
  video: HTMLVideoElement
};

type TagInterfaceMap = typeof tagInterfaceMap;
type Tag = keyof TagInterfaceMap;

const getMorseCodeTag = (tag: string) => {
  // TODO: check char range
  const morseCode = ([...tag] as AToZ[])
    .map(char => morseCodeMap[char])
    .join("");
  return `m-${morseCode}`;
};

export let tagMorseCodeMap: Record<string, string> = {};

// populate tagMorseCodeMap
Object.keys(tagInterfaceMap).map(tag => {
  tagMorseCodeMap[tag] = getMorseCodeTag(tag);
});

export let morseCodeInterfaceMap = Object.fromEntries(
  Object.entries(tagMorseCodeMap).map(([tag, morseCode]) => {
    return [morseCode, tagInterfaceMap[tag as keyof TagInterfaceMap]];
  })
);
