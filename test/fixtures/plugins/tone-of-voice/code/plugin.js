export const commands = {
  async collect({ limit, types = ['private'], cursor }, host) {
    const page = await host.messages.mine({ limit, types, cursor });
    return { messages: page.messages, cursor: page.cursor, remaining: limit - page.count, done: page.done };
  },
};
