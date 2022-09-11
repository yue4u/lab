/// <reference types="svelte" />

import type { Environment } from "monaco-editor-core/esm/vs/editor/editor.api";
declare global {
    interface Window {
        /**
         * @see https://github.com/microsoft/monaco-editor/issues/2580
         */
        MonacoEnvironment: Environment;
    }
}
