import { html, css, Script } from "@/site/core";
import { FileNode, FileSystemTree, WebContainer } from '@webcontainer/api';
import * as monaco from "monaco-editor-core";
import EditorWorker from "monaco-editor-core/esm/vs/editor/editor.worker?worker";
import { Terminal } from 'xterm'

if (!crossOriginIsolated) {
  location.reload()
}

self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};

export const template = () => html`<div class="container">
<div class="editor">
</div>
<div class="preview">
  <iframe></iframe>
</div>
<div class="term">
</div>
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

    const term = new Terminal();
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

    const installProcess = await webcontainerInstance.spawn('npm', ['install']);

    installProcess.output.pipeTo(new WritableStream({
      write(data) {
        term.write(data);
      }
    }))

    if (await installProcess.exit !== 0) {
      alert('Installation failed');
    };

    await webcontainerInstance.spawn('npm', ['run', 'start']);

    webcontainerInstance.on('server-ready', (port, url) => {
      iframeEl.src = url;
    });
  },
};

export const style = css`
.container {
  display: grid;
  grid-template: 1fr;
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

textarea.xterm-helper-textarea{
  display: none;
}

iframe {
  height: 100%;
  width: 100%;
  border-radius: 0.5rem;
  color: #fff;
}
`;
