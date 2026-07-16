self.onmessage = (event: MessageEvent<{ type: string }>) => {
  if (event.data.type === "ping") {
    self.postMessage({ type: "pong" });
  }
};
