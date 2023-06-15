import { Script, css, html } from '@/site/core'
import { router } from '../router';

export const template = () => html`<a target="_blank">edit on GitHub</a>`;

export const style = css`
  lab-source-link {
      margin-top: 3rem;
      color: gray;
      text-decoration: underline;
      color: aquamarine;
  }
  @media screen and (max-width: 680px) {
    lab-source-link {
      margin: 3rem 0;
      display: block;
    }
  }
`;

const toGithubUrl = (project: string) => `https://github.com/yue4u/lab/tree/master/projects${project}`

export const script: Script = {
    onMount(root) {
        const a = root.querySelector('a')!;
        a.href = toGithubUrl(location.pathname)
        router.listen((path) => {
            a.href = toGithubUrl(path.pathname)
        })
    }
}
