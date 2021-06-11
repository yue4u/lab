import PDFJS from "pdfjs-dist";

type Await<T> = T extends {
  then(resolve?: (value: infer U) => unknown): unknown;
}
  ? U
  : T;

export type PDFPageProxy = Await<
  ReturnType<
    Await<ReturnType<typeof PDFJS["getDocument"]>["promise"]>["getPage"]
  >
>;
