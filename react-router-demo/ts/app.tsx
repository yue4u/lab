import React, { useState, useEffect } from "react";
import { Switch, Route } from "react-router-dom";
import history from "./history";
import { Global, css, keyframes } from "@emotion/core";
import styled from "@emotion/styled";

import Home from "./home";
import Page from "./page";

const loop = keyframes`
  0% {
    color: skyblue;
    transform: rotate(0);
  }

  50% {
    color: hotpink;
    transform: rotate(180deg);
  }

  100% {
    color: skyblue;
    transform: rotate(360deg);
  }
`;

const InputWrapper = styled.div`
  transition: 0.3s all cubic-bezier(0.19, 1, 0.22, 1);
  width: fit-content;
  border: 5px solid #00bcd4;
  border-top: 0;
  border-bottom: 0;
  margin: 0 auto;
  position: relative;

  &:focus {
    border: 5px solid #3f51b5;
    border-top: 0;
    border-bottom: 0;
  }
  &::before {
    content: "✿";
    font-size: 1.5rem;
    position: absolute;
    left: -2rem;
    top: 0.5rem;
    animation: 1.5s ${loop} linear infinite;
    text-shadow: 0 0 1px #ccc;
    transform-origin: 50% 45%;
  }
  &::after {
    content: "✿";
    font-size: 1.5rem;
    position: absolute;
    right: -2rem;
    top: 0.5rem;
    animation: 1.5s ${loop} linear infinite;
    animation-direction: reverse;
    text-shadow: 0 0 1px #ccc;
    transform-origin: 50% 45%;
  }
`;

const InputBox = styled.input`
  border: 0;
  padding: 5px;
  color: #00bcd4;
  text-shadow: 0 0 5px #fff;
  text-align: center;
  font-size: 2rem;
  background: 0;
  &:focus {
    outline: none;
  }
`;

export default function App() {
  const pathname = window.location.pathname.substr(1);
  let [name, setName] = useState(decodeURI(pathname));

  useEffect(() => {
    name = name.replace(/^\//, "");
    history.push(`/${name}`);
  }, [name]);

  return (
    <>
      <Global
        styles={css`
          * {
            box-sizing: border-box;
          }
          html {
            font-size: 24px;
            font-family: "Arima Madurai", cursive;
          }
          body {
            text-align: center;
          }
        `}
      />
      <h1>React Router Demo</h1>
      <InputWrapper>
        <InputBox
          type="text"
          value={name}
          size={name.length || 1}
          onChange={e => setName(e.target.value)}
          placeholder="..."
          spellCheck={false}
        />
      </InputWrapper>
      <Switch>
        <Route exact path="/" component={Home} />
        <Route path="/:name" component={Page} />
      </Switch>
    </>
  );
}
