import { tagMorseCodeMap, tagInterfaceMap } from "./map";

export function transform(source: string) {
  for (let [tag, morseCode] of Object.entries(tagMorseCodeMap)) {
    source = source
      .replace(new RegExp(`<${tag} `, "g"), `<${morseCode} `)
      .replace(new RegExp(`</${tag}[\s]*>`, "g"), `</${morseCode}>`);
  }
  return source;
}

export function genCustomElementDefination() {
  let ret = "";
  Object.entries(tagMorseCodeMap).map(([tag, code], index) => {
    ret += `customElements.define("${code}", class M${index} extends ${tagInterfaceMap[tag]} {},{ extends: "${tag}"});\n`;
  });

  return ret;
}
