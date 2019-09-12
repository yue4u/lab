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
  z: "--..",
  "0": "-----",
  "1": ".----",
  "2": "..---",
  "3": "...--",
  "4": "....-",
  "5": ".....",
  "6": "-....",
  "7": "--...",
  "8": "---..",
  "9": "----."
};
type MorseCodeMap = typeof morseCodeMap;
type MorseCodeKey = keyof MorseCodeMap;

export const tagInterfaceMap: Record<string, string> = {
  h1: "HTMLHeadingElement",
  h2: "HTMLHeadingElement",
  h3: "HTMLHeadingElement",
  h4: "HTMLHeadingElement",
  h5: "HTMLHeadingElement",
  h6: "HTMLHeadingElement",
  a: "HTMLAnchorElement ",
  area: "HTMLAreaElement",
  audio: "HTMLAudioElement",
  br: "HTMLBRElement",
  base: "HTMLBaseElement",
  //basefont: "HTMLBaseFontElement",
  body: "HTMLBodyElement",
  button: "HTMLButtonElement",
  canvas: "HTMLCanvasElement",
  //content: "HTMLContentElement",
  dl: "HTMLDListElement",
  data: "HTMLDataElement",
  datalist: "HTMLDataListElement",
  dialog: "HTMLDialogElement",
  embed: "HTMLEmbedElement",
  fieldset: "HTMLFieldSetElement",
  form: "HTMLFormElement",
  frameset: "HTMLFrameSetElement",
  hr: "HTMLHRElement",
  //head: "HTMLHeadElement",
  //heading: "HTMLHeadingElement",
  //html: "HTMLHtmlElement",
  iframe: "HTMLIFrameElement",
  //img: "HTMLImageElement",
  input: "HTMLInputElement",
  //isindex: "HTMLIsIndexElement",
  //keygen: "HTMLKeygenElement",
  li: "HTMLLIElement",
  label: "HTMLLabelElement",
  legend: "HTMLLegendElement",
  //link: "HTMLLinkElement",
  map: "HTMLMapElement",
  //media: "HTMLMediaElement",
  //meta: "HTMLMetaElement",
  meter: "HTMLMeterElement",
  //mod: "HTMLModElement",
  ol: "HTMLOListElement",
  object: "HTMLObjectElement",
  optgroup: "HTMLOptGroupElement",
  option: "HTMLOptionElement",
  output: "HTMLOutputElement",
  p: "HTMLParagraphElement",
  param: "HTMLParamElement",
  picture: "HTMLPictureElement",
  pre: "HTMLPreElement",
  progress: "HTMLProgressElement",
  blockquote: "HTMLQuoteElement",
  //script: "HTMLScriptElement",
  select: "HTMLSelectElement",
  //  shadow: "HTMLShadowElement",
  source: "HTMLSourceElement",
  span: "HTMLSpanElement",
  style: "HTMLStyleElement",
  th: "HTMLTableCaptionElement",
  td: "HTMLTableCellElement",
  //tablecol: "HTMLTableColElement",
  //td: "HTMLTableDataCellElement",
  table: "HTMLTableElement",
  //th: "HTMLTableHeaderCellElement",
  tr: "HTMLTableRowElement",
  //tablesection: "HTMLTableSectionElement",
  //template: "HTMLTemplateElement",
  textarea: "HTMLTextAreaElement",
  time: "HTMLTimeElement",
  title: "HTMLTitleElement",
  track: "HTMLTrackElement",
  ul: "HTMLUListElement",
  //unknown: "HTMLUnknownElement",
  video: "HTMLVideoElement",
  div: "HTMLDivElement"
};
const getMorseCodeTag = (tag: string) => {
  // TODO: check char range
  const morseCode = ([...tag] as MorseCodeKey[])
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
    return [morseCode, tagInterfaceMap[tag]];
  })
);
