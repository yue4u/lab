import React from "react";
import { Script } from "@/site/core";
import App from "./app";

import { withReact } from "@/site/with-react";

const { script: reactScript } = withReact(<App />);

export const script: Script = {
  onMount(root) {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/player_api";
    const firstScriptTag = document.querySelector("script");
    console.log(firstScriptTag);
    firstScriptTag!.parentNode!.insertBefore(tag, firstScriptTag);
    reactScript!.onMount!(root);
  },
};
