export const commands = {
  async collect({ limit, cursor }, host) {
    const page = await host.messages.mine({ limit, cursor });
    return { messages: page.messages, cursor: page.cursor, remaining: limit - page.count, done: page.done };
  },
};
