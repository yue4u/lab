import React, { useState } from "react";

const app = () => {
  const [count, setCount] = useState(0);
  return (
    <h1>
      <span>Here is React</span>
      <button onClick={() => setCount(count + 1)}>{count}</button>
    </h1>
  );
};

export default app;
