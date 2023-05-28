import { html, css, Script } from "@/site/core";
import { FileNode, FileSystemTree, WebContainer } from '@webcontainer/api';
import * as monaco from "monaco-editor";
import { Terminal } from 'xterm'

self.MonacoEnvironment = {
  getWorker(workerId: string, label: string) {
    const getWorkerModule = (moduleUrl: string, label: string) => {
      return new Worker(self.MonacoEnvironment.getWorkerUrl(moduleUrl), {
        name: label,
        type: 'module'
      });
    };

    switch (label) {
      case 'json':
        return getWorkerModule('/monaco-editor/esm/vs/language/json/json.worker?worker', label);
      case 'css':
      case 'scss':
      case 'less':
        return getWorkerModule('/monaco-editor/esm/vs/language/css/css.worker?worker', label);
      case 'html':
      case 'handlebars':
      case 'razor':
        return getWorkerModule('/monaco-editor/esm/vs/language/html/html.worker?worker', label);
      case 'typescript':
      case 'javascript':
        return getWorkerModule('/monaco-editor/esm/vs/language/typescript/ts.worker?worker', label);
      default:
        return getWorkerModule('/monaco-editor/esm/vs/editor/editor.worker?worker', label);
    }
  }
};


if (!crossOriginIsolated) {
  location.reload()
}

export const template = () => html`
<div class="container">
  <div class="preview"><iframe></iframe></div>
  <div class="editor"></div>
  <div class="term"></div>
</div>`;

export const script: Script = {
  async onMount(root) {
    const iframeEl = root.querySelector('iframe')!;
    const editorEl = root.querySelector<HTMLDivElement>('.editor')!;
    const termEl = root.querySelector<HTMLDivElement>('.term')!;
    const files: FileSystemTree = Object.fromEntries(Object.entries(import.meta.glob('./container/**/*', { eager: true, as: 'raw' })).map(([k, contents]) => {
      return [k.replace('./container/', ''), { file: { contents } }]
    }))

    const webcontainerInstance = await WebContainer.boot();
    await webcontainerInstance.mount(files);

    const term = new Terminal({
      convertEol: true,
    });
    term.open(termEl);

    const editor = monaco.editor.create(editorEl, {
      value: (files['index.js'] as FileNode).file.contents as string,
      minimap: { enabled: false },
      automaticLayout: true,
      language: "javascript",
      theme: 'vs-dark'
    });

    editor.getModel()?.onDidChangeContent(async () => {
      await webcontainerInstance.fs.writeFile('/index.js', editor.getValue());
    });

    const shellProcess = await webcontainerInstance.spawn('jsh', {
      terminal: {
        cols: term.cols,
        rows: term.rows,
      }
    });

    shellProcess.output.pipeTo(new WritableStream({
      write(data) {
        term.write(data);
      }
    }))

    const input = shellProcess.input.getWriter();
    term.onData((data) => {
      input.write(data);
    });

    webcontainerInstance.on('server-ready', (port, url) => {
      iframeEl.src = url;
    });
  },
};

export const style = css`
.container {
  display: grid;
  grid-template-rows: 30vh;
  grid-template-columns: 100%;
  gap: 1rem;
  height: 100%;
  width: 100%;
}

textarea {
  width: 100%;
  height: 100%;
  resize: none;
  border-radius: 0.5rem;
  background: black;
  color: white;
  padding: 0.5rem 1rem;
}

.xterm-helper-textarea, .xterm-helpers{
  opacity: 0;
}
.xterm-scroll-area{
  display: none;
}
iframe {
  height: 100%;
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid skyblue;
  color: #fff;
}
`;
