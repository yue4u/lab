import React, { FC } from "react";
import { match } from "react-router-dom";
import styled from "@emotion/styled";

type PageProps = {
  match: match<{
    name: string;
  }>;
};

const PageName = styled.strong`
  background: linear-gradient(to right, hotpink, skyblue);
  padding: 5px;
  border-radius: 5px;
  color: #fff;
  text-shadow: 0 0 5px #000;
`;

const Page: FC<PageProps> = ({ match }) => {
  const { name } = match.params;
  return (
    <>
      <h2>Router Page</h2>
      <p>
        Here is <PageName>{name}</PageName> page
      </p>
    </>
  );
};

export default Page;
