import React, { useState, useEffect } from "react";
import { Block } from "./Block";
import styled from "@emotion/styled";
import { createLocalStorage } from "@/src/utils";

const init = `# キーパートナー（Key Partners）
KP1
KP2

# キーアクティビティ（Key Activities）
KA

# キーリソース（Key Resources）
KR

# 提供価値（Value Propositions）
VP

# 顧客との関係（Customer Relationships）
CR

# チャネル（Channels）
CH

# 顧客セグメント（Customer Segment）
CS

# コスト構造（Cost Structure）
CS

# 収入の流れ（Revenue Streams）
RS`;

const storage = createLocalStorage("lab:bmc");

function App() {
  const [data, setData] = useState(storage.get() ?? init);

  useEffect(() => {
    localStorage.setItem("data", data);
  }, [data]);

  const parts = data
    .split(/#[\s\S]+?\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((l) =>
      l
        .split("\n")
        .map((i) => i.trim())
        .filter((i) => Boolean(i) && !i.startsWith("//"))
    );

  const [
    keyPartners,
    keyActivities,
    keyResources,
    valuePropositions,
    customerRelationships,
    channels,
    customerSegment,
    costStructure,
    revenueStreams,
  ] = parts;

  return (
    <Parent>
      <Block
        title="キーパートナー（Key Partners）"
        className="keyPartners"
        items={keyPartners}
      />
      <Block
        title="キーアクティビティ（Key Activities）"
        className="keyActivities"
        items={keyActivities}
      />
      <Block
        title="キーリソース（Key Resources）"
        className="keyResources"
        items={keyResources}
      />
      <Block
        title="提供価値（Value Propositions）"
        className="valuePropositions"
        items={valuePropositions}
      />
      <Block
        title="顧客との関係（Customer Relationships）"
        className="customerRelationships"
        items={customerRelationships}
      />
      <Block
        title="チャネル（Channels）"
        className="channels"
        items={channels}
      />
      <Block
        title="顧客セグメント（Customer Segment）"
        className="customerSegment"
        items={customerSegment}
      />
      <Block
        title="コスト構造（Cost Structure）"
        className="costStructure"
        items={costStructure}
      />
      <Block
        title="収入の流れ（Revenue Streams）"
        className="revenueStreams"
        items={revenueStreams}
      />
      <Textarea
        value={data}
        onChange={(e) => setData(e.target.value)}
        cols={30}
        rows={10}
      />
    </Parent>
  );
}
const Textarea = styled.textarea`
  font-size: 1.2rem;
  width: 100%;
`;
const Parent = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-column-gap: 0px;
  grid-row-gap: 0px;
  grid-auto-rows: minmax(min-content, max-content);
  @media screen and (max-width: 960px) {
    display: flex;
    flex-wrap: wrap;
    div {
      width: 50%;
    }
  }

  .keyPartners {
    grid-area: 1 / 1 / 3 / 3;
  }
  .keyActivities {
    grid-area: 1 / 3 / 2 / 5;
  }
  .keyResources {
    grid-area: 2 / 3 / 3 / 5;
  }
  .valuePropositions {
    grid-area: 1 / 5 / 3 / 7;
  }
  .customerRelationships {
    grid-area: 1 / 7 / 2 / 9;
  }
  .channels {
    grid-area: 2 / 7 / 3 / 9;
  }
  .customerSegment {
    grid-area: 1 / 9 / 3 / 11;
  }
  .costStructure {
    grid-area: 3 / 1 / 4 / 6;
  }
  .revenueStreams {
    grid-area: 3 / 6 / 4 / 11;
  }

  .connection-border-bottom {
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
  }
  .connection-border-left {
    border-top-right-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
  }

  .connection-border-top {
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
  }
  .connection-border-right {
    border-top-left-radius: 0 !important;
    border-bottom-left-radius: 0 !important;
  }
  textarea {
    grid-column: span 10;
  }
`;
export default App;
