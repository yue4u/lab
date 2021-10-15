import React, { useCallback, useState, useEffect, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { createWorker } from "tesseract.js";
import workerPath from "tesseract.js/dist/worker.min.js?url";
import corePath from "@/node_modules/.pnpm/tesseract.js-core@2.2.0/node_modules/tesseract.js-core/tesseract-core.wasm.js?url";
import styled from "@emotion/styled";

export default function OCR() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<
    "loading" | "working" | "done" | "idle" | string
  >("loading");
  const [progress, setProgress] = useState("0%");

  const worker = useMemo(() => {
    return createWorker({
      workerPath,
      corePath,
      logger: ({ status, progress }) => {
        setStatus(status);
        setProgress(((progress * 100) | 0) + "%");
      },
    });
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  useEffect(() => {
    (async () => {
      await worker.load();
      await worker.loadLanguage("eng+chi_sim");
      await worker.initialize("eng+chi_sim");
      setStatus("idle");
    })();
  }, []);
  useEffect(() => {
    if (!file) return;
    const recognize = async () => {
      setProgress("0%");
      setStatus("working");
      const { data } = await worker.recognize(file);
      setText(data.text);
      setStatus("idle");
      setProgress("0%");
    };
    recognize();
  }, [file]);
  const idle = status === "idle";

  return (
    <>
      <DropZone {...getRootProps()} idle={idle}>
        <input {...getInputProps()} disabled={!idle} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p>Drag 'n' drop some files here, or click to select files</p>
        )}
      </DropZone>
      <Progress style={{ width: idle ? "0%" : progress }} />
      <p>
        ( <strong>{status}</strong> {progress} )
      </p>
      <Text>
        <code>{text}</code>
      </Text>
    </>
  );
}

const Progress = styled.div`
  margin: 1rem 0;
  height: 5px;
  width: 0;
  background: linear-gradient(to right, #00bcd4, yellow);
`;

const DropZone = styled.div<{ idle: boolean }>`
  border: 3px dashed ${({ idle }) => (idle ? "aquamarine" : "#666")};
  padding: 10px;
`;

const Text = styled.pre`
  white-space: pre-line;
`;
