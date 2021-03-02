import React, { FC } from "react";
import styled from "@emotion/styled";

export const Block: FC<{
  title: string;
  className: string;
  items?: string[];
}> = (props) => {
  return (
    <BlockContainer className={props.className}>
      <BlockItemTitle>{props.title}</BlockItemTitle>
      <BlockItemList>
        {props.items?.map((item, i) => {
          const [text, cost] = item
            .split("//")[0]
            .split("$")
            .map((t) => t.trim());
          if (text.startsWith("@")) {
            const t = text.slice(1);
            return (
              <BlockItem id={item} key={`${item}-${i}`}>
                <BlockItemPure empty={Boolean(t)}>{t}</BlockItemPure>
              </BlockItem>
            );
          }
          return (
            <BlockItem key={`${item}-${i}`}>
              <BlockItemText id={item}>{text}</BlockItemText>
              {cost && (
                <BlockItemCost plus={!cost?.startsWith("-")}>
                  {cost}
                </BlockItemCost>
              )}
            </BlockItem>
          );
        })}
      </BlockItemList>
    </BlockContainer>
  );
};

const BlockContainer = styled.div`
  box-shadow: /*---------*/ 4px 0 0 0 #888,
    /*-------------------*/ 0 4px 0 0 #888,
    /*-------------------*/ 4px 4px 0 0 #888,
    /*-------------------*/ 4px 0 0 0 #888 inset,
    /*-------------------*/ 0 4px 0 0 #888 inset;
`;

const BlockItemTitle = styled.h3`
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  margin-left: 4px;
  padding: 4px;
  margin-bottom: 1rem;
  height: 4rem;
`;

const BlockItemList = styled.ul`
  list-style: none;
  padding: 5px;
  margin: 0;
  margin-left: 4px;
`;

const BlockItem = styled.li`
  display: flex;
`;

const BlockItemText = styled.span`
  background-color: #ff980078;
  border-left: 3px solid orange;
  padding: 5px;
  margin-bottom: 10px;
  flex: 1;
`;

const BlockItemCost = styled.span<{ plus?: boolean }>`
  background-color: ${({ plus }) => (plus ? "#e8ffbf88" : "#fff3f588")};
  color: ${({ plus }) => (plus ? "#000" : "red")};
  border-left: 3px solid orange;
  padding: 5px;
  margin-bottom: 10px;
  width: 50%;
  flex: 1;
`;

const BlockItemPure = styled.span<{ empty?: boolean }>`
  flex: 1;
  text-align: right;
  min-height: 24px;
  background-color: ${({ empty }) => (empty ? "#eeeeee88" : "#ffffff88")};
  margin-bottom: 10px;
  padding: 5px;
  font-weight: bold;
`;
