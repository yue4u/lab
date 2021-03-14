import React from "react";
import { useEffect, useState } from "react";
import "./app.css";

export default function App() {
  return (
    <>
      <Player id="UC1opHUrw8rvnsadT-iGp7Cg" />
      <Player id="????" />
    </>
  );
}

function Player({ id }: { id: string }) {
  const { state, error } = usePlayer(id);

  return (
    <>
      {/* this is a hack to make the class switch work. Don't do this */}
      <p className={["state", state, error && "error"].join(" ")}>
        {/* prioritize error than other state */}
        {error ? "error" : state}
      </p>
      <iframe
        id={id}
        className="frame"
        frameBorder={0}
        src={`https://www.youtube.com/embed/live_stream?channel=${id}&enablejsapi=1&mute=1`}
      />
    </>
  );
}

function usePlayer(id: string) {
  // to lazy to type this
  const [state, setState] = useState("loading");
  // `unstarted` will overwrite the error state, so separate them
  const [error, setError] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!window.YT) return;
      clearInterval(intervalId);
      const player = new window.YT.Player(id, {
        events: {
          onReady() {
            setState("ready");
            player.playVideo();
          },
          onError() {
            setError(true);
          },
          onStateChange(event) {
            [
              () => setState("unstarted"),
              () => setState("ended"),
              () => setState("playing"),
              () => setState("paused"),
              () => setState("buffering"),
              () => setState("videocued"),
            ][event.data + 1]();
          },
        },
      });
    }, 1000);
  }, []);
  return { state, error };
}
