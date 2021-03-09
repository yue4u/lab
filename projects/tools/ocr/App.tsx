import React from "react";
import styled from "@emotion/styled";
import OCR from "./OCR";

export default function App() {
  return (
    <>
      <Title>OCR</Title>
      <OCR />
    </>
  );
}

const Title = styled.h1`
  margin-top: 0;
`;
