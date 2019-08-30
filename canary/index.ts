const create = (tag: string) => (...args: any[]) => {
  console.log(tag, args);
};

const p = create("p");
const div = create("div");
const html = create("html");
const header = create("header");
const main = create("main");
const nav = create("nav");
const ul = create("ul");
const li = create("li");
const a = create("a");

const x = [1, 2];

type HeaderItemProps = {
  text: string;
  link: string;
};

const headerItem = ({ text, link }: HeaderItemProps) => a(text, { link });

const headerItems = [1, 2, 3].map(i =>
  headerItem({ text: `link-${i}`, link: `/link-${i}` })
);

const LabHeader = () => header(nav(ul(headerItems)));

const app = () => div(LabHeader());

app();
