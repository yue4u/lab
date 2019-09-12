import React from "react";
import "css-doodle";
import styled from "@emotion/styled";

const Wrapper = styled.div`
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  opacity: 0.2;
`;

export default function Background() {
  return (
    <Wrapper>
      <css-doodle>
        {`
    :doodle {
      @grid: 7 / 100vmax;
    }
    @shape: clover 5;
    background: hsla(
      calc(360 - @i() * 4), 70%, 68%, @r(.8)
    );
    transform:
    scale(@r(.2, 1.5))
    translate(@m2(@r(-50%, 50%)));
    `}
      </css-doodle>
    </Wrapper>
  );
}
