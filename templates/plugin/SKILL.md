---
name: my-plugin
description: Summarises how the user writes in Telegram and looks up words in a dictionary API.
---

# My plugin

A template plugin for Better-TG-CLI. Replace this text with what your plugin teaches the agent.

## Summary

When the user asks how much or how they write in Telegram:

1. Run `telegram plugin run my-plugin summary --input '{"limit":300}'`.
2. While `done` is false and `remaining` is above 0, run it again with the `cursor` it returned and
   `"limit"` set to `remaining`, and add the counts up.
3. On `flood_wait`, wait `retryAfterSeconds`, then go on with the error's `cursor`.
4. Tell the user the totals and quote the `samples` only if they asked to see examples.

## Define

When the user asks what a word in a message means, run
`telegram plugin run my-plugin define --input '{"word":"<the word>"}'`. This sends the word to
api.example.com, so it is a write: in write mode `ask` the user approves it. If `definition` is
`null`, say the dictionary does not know the word. On `secret_missing`, ask the user to run the
command in the error in their own terminal.
