var groupsCommand = new Command("groups").description("List groups").option("--admin", "Only show groups where you are admin").option("--json", "Output as JSON").option("--markdown", "Output as Markdown").action(async (options) => {
  const spinner2 = spinner("Fetching groups...").start();
  try {
    const client = await getClient();
    let groups;
    if (options.admin) {
      groups = await getAdminGroups(client);
    } else {
      const allChats = await getDialogs(client, 500);
      groups = allChats.filter((c) => c.type === "group" || c.type === "supergroup");
    }
    spinner2.stop();
    const format = getOutputFormat(options);
    switch (format) {
      case "json":
        console.log(formatJson(groups));
        break;
      case "markdown":
        console.log(formatChatsMarkdown(groups));
        break;
      default:
        console.log(formatChats(groups));
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to fetch groups");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/sync.ts
var import_fs3 = require("fs");
var import_path2 = require("path");
function readSyncMeta(outputDir) {
  const metaPath = import_path2.join(outputDir, ".sync-meta.json");
  if (import_fs3.existsSync(metaPath)) {
    try {
      return JSON.parse(import_fs3.readFileSync(metaPath, "utf-8"));
    } catch {
      return {};
    }
  }
  return {};
}
function writeSyncMeta(outputDir, meta) {
  import_fs3.writeFileSync(import_path2.join(outputDir, ".sync-meta.json"), JSON.stringify(meta, null, 2));
}
async function formatMessageLines(client, chatId, chatTitle, msg, outputDir, chatMediaDir, downloadMedia) {
  const time = msg.date.toISOString().replace("T", " ").substring(0, 19);
  const sender = msg.isOutgoing ? "You" : msg.sender;
  const reply = msg.replyToMsgId ? ` (reply to #${msg.replyToMsgId})` : "";
  const lines = [`**${sender}** - ${time}${reply}`];
  if (msg.media) {
    if (downloadMedia) {
      try {
        const result2 = await downloadMessageMedia(client, chatId, msg.id, chatMediaDir);
        if (result2) {
          const rel = import_path2.relative(outputDir, result2.filePath);
          lines.push(`> [${formatMediaLabel(result2.media)}](${rel})`);
        } else {
          lines.push(`> _[${formatMediaLabel(msg.media)}]_`);
        }
      } catch (mediaErr) {
        lines.push(`> _[${formatMediaLabel(msg.media)}] (download failed)_`);
        console.error(colors_default.yellow(`
Warning: media download failed for ${chatTitle}#${msg.id}: ${mediaErr instanceof Error ? mediaErr.message : mediaErr}`));
      }
    } else {
      lines.push(`> _[${formatMediaLabel(msg.media)}]_`);
    }
  }
  if (msg.text || !msg.media) {
    lines.push(`> ${msg.text || "(no text)"}`);
  }
  lines.push(`*#${msg.id}*
`);
  return lines;
}
function buildSyncFetchOptions(o) {
  if (o.minId) {
    return { limit: Number.MAX_SAFE_INTEGER, minId: o.minId, minDate: o.since ? o.minDate : undefined, maxDate: o.maxDate };
  }
  return { limit: o.all ? Number.MAX_SAFE_INTEGER : 1000, minDate: o.minDate, maxDate: o.maxDate };
}
var syncCommand = new Command("sync").description("Sync messages to markdown files").option("--days <number>", "Number of days to sync", "7").option("--since <time>", 'Start from time offset (e.g., "1h", "30m", "7d")').option("--until <time>", 'End at time offset (e.g., "1h", "30m", "7d")').option("--all", "Sync entire chat history (no time limit)").option("--chat <name>", "Sync specific chat only").option("--output <dir>", "Output directory", "./telegram-sync").option("--media", "Also download photos and documents alongside markdown").option("--resume", "Incremental sync: only fetch messages newer than the last sync").action(async (options) => {
  const spinner2 = spinner("Starting sync...").start();
  try {
    const client = await getClient();
    const outputDir = options.output;
    if (!import_fs3.existsSync(outputDir)) {
      import_fs3.mkdirSync(outputDir, { recursive: true });
    }
    let minDate;
    let maxDate;
    if (options.all) {} else if (options.since) {
      minDate = parseTimeOffset(options.since);
    } else {
      minDate = new Date;
      minDate.setDate(minDate.getDate() - parseInt(options.days));
    }
    if (options.until) {
      maxDate = parseTimeOffset(options.until);
    }
    const meta = readSyncMeta(outputDir);
    let chats;
    if (options.chat) {
      const allChats = await getDialogs(client, 500);
      const needle = options.chat.toLowerCase();
      const exact = allChats.filter((c) => c.id === options.chat || c.title.toLowerCase() === needle);
      chats = exact.length > 0 ? exact : allChats.filter((c) => c.title.toLowerCase().includes(needle));
      if (chats.length === 0) {
        spinner2.fail(`No chat found matching "${options.chat}"`);
        await disconnectClient();
        return;
      }
    } else {
      chats = await getDialogs(client, 100);
    }
    spinner2.text = `Syncing ${chats.length} chats...`;
    let synced = 0;
    let newMessages = 0;
    for (const chat of chats) {
      try {
        spinner2.text = `Syncing "${chat.title}"...`;
        const safeTitle = chat.title.replace(/[/\\?%*:|"<>]/g, "-");
        const filePath = import_path2.join(outputDir, `${safeTitle}.md`);
        const chatMediaDir = import_path2.join(outputDir, safeTitle, "media");
        const minId = options.resume && import_fs3.existsSync(filePath) ? meta[chat.id]?.lastMessageId : undefined;
        const fetchOptions = buildSyncFetchOptions({ all: !!options.all, since: !!options.since, minDate, maxDate, minId });
        const { messages } = await getMessages(client, chat.id, fetchOptions);
        if (messages.length === 0) {
          continue;
        }
        messages.sort((a, b) => a.date.getTime() - b.date.getTime());
        const body = [];
        for (const msg of messages) {
          body.push(...await formatMessageLines(client, chat.id, chat.title, msg, outputDir, chatMediaDir, !!options.media));
        }
        let content;
        if (minId) {
          content = import_fs3.readFileSync(filePath, "utf-8").trimEnd() + `

` + body.join(`
`);
        } else {
          const header = [`# ${chat.title}`, `
Type: ${chat.type}`];
          if (chat.username) {
            header.push(`Username: @${chat.username}`);
          }
          header.push(`
Synced: ${new Date().toISOString()}`);
          header.push(`Messages: ${messages.length}`);
          header.push(`
---
`);
          content = [...header, ...body].join(`
`);
        }
        import_fs3.writeFileSync(filePath, content);
        meta[chat.id] = {
          title: chat.title,
          lastMessageId: Math.max(minId ?? 0, ...messages.map((m) => m.id)),
          lastSyncDate: new Date().toISOString()
        };
        synced++;
        newMessages += messages.length;
      } catch (error) {
        console.error(colors_default.yellow(`
Warning: Could not sync "${chat.title}": ${error instanceof Error ? error.message : error}`));
      }
    }
    writeSyncMeta(outputDir, meta);
    spinner2.succeed(colors_default.green(`Synced ${newMessages} messages from ${synced} chats to ${outputDir}`));
    await disconnectClient();
    process.exit(0);
  } catch (error) {
    spinner2.fail("Sync failed");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/kick.ts
var kickCommand = new Command("kick").description("Kick/remove a user from a group").argument("<group>", "Group name or username").argument("<user>", "Username to kick (e.g., @username)").option("--json", "Output as JSON").action(async (group, user, options) => {
  assertWriteEnabled();
  const spinner2 = spinner(`Kicking ${user} from "${group}"...`).start();
  try {
    const client = await getClient();
    const result2 = await kickUser(client, group, user);
    auditLog({ timestamp: new Date().toISOString(), command: "kick", target: group, kickedUser: user, result: { success: result2.success } });
    if (result2.success) {
      if (options.json) {
        spinner2.stop();
        console.log(formatJson(result2));
      } else {
        spinner2.succeed(result2.message);
      }
    } else {
      if (options.json) {
        spinner2.stop();
        console.log(formatJson(result2));
      } else {
        spinner2.fail(result2.message);
      }
      process.exit(1);
    }
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "kick", target: group, kickedUser: user, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to kick user");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/promote.ts
var promoteCommand = new Command("promote").description("Promote a group member to admin").argument("<group>", "Group name or @username").argument("<user>", "Username to promote (e.g., @username)").option("--rank <title>", "Custom admin title/badge (supergroups only)").option("--add-admins", "Also allow the new admin to add other admins").action(async (group, user, options) => {
  assertWriteEnabled();
  const spinner2 = spinner(`Promoting ${user} in "${group}"...`).start();
  try {
    const client = await getClient();
    const result2 = await promoteAdmin(client, group, user, {
      rank: options.rank,
      canAddAdmins: options.addAdmins
    });
    auditLog({ timestamp: new Date().toISOString(), command: "promote", target: group, targetUser: user, result: { success: result2.success, error: result2.success ? undefined : result2.message } });
    if (result2.success) {
      spinner2.succeed(result2.message);
    } else {
      spinner2.fail(result2.message);
      process.exit(1);
    }
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "promote", target: group, targetUser: user, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to promote user");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/transfer-owner.ts
var transferOwnerCommand = new Command("transfer-owner").description("Transfer group/channel ownership to another member (irreversible)").argument("<group>", "Group name or @username").argument("<user>", "New owner username (e.g., @username)").option("-y, --yes", "Skip the typed confirmation prompt").action(async (group, user, options) => {
  assertWriteEnabled();
  console.log(colors_default.yellow(`
You are about to transfer ownership of "${group}" to ${user}.`));
  console.log(colors_default.gray(`You will lose your creator role. Only the new owner can transfer it back.
`));
  if (!options.yes) {
    const confirm = await prompt(`Type the group name "${group}" to confirm: `);
    if (confirm.toLowerCase() !== group.toLowerCase()) {
      console.log(colors_default.red("Confirmation did not match. Aborted."));
      process.exit(1);
    }
  }
  const password = await promptHidden("Enter your Telegram 2FA password: ");
  if (!password) {
    console.error(colors_default.red("A 2FA password is required to transfer ownership."));
    process.exit(1);
  }
  const spinner2 = spinner(`Transferring ownership of "${group}" to ${user}...`).start();
  try {
    const client = await getClient();
    const result2 = await transferOwnership(client, group, user, password);
    auditLog({ timestamp: new Date().toISOString(), command: "transfer-owner", target: group, targetUser: user, result: { success: result2.success, error: result2.success ? undefined : result2.message } });
    if (result2.success) {
      spinner2.succeed(result2.message);
    } else {
      spinner2.fail(result2.message);
      process.exit(1);
    }
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "transfer-owner", target: group, targetUser: user, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to transfer ownership");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/mute.ts
var muteCommand = new Command("mute").description("Mute a chat").argument("<chat>", "Chat name, username, or ID").option("-d, --duration <duration>", "Duration (1h, 8h, 1d, 1w, or forever)", "forever").option("--json", "Output as JSON").action(async (chat, options) => {
  assertWriteEnabled();
  const spinner2 = spinner(`Muting "${chat}"...`).start();
  try {
    const client = await getClient();
    const result2 = await muteChat(client, chat, options.duration);
    if (result2.success) {
      if (options.json) {
        spinner2.stop();
        console.log(formatJson(result2));
      } else {
        spinner2.succeed(result2.message);
      }
    } else {
      if (options.json) {
        spinner2.stop();
        console.log(formatJson(result2));
      } else {
        spinner2.fail(result2.message);
      }
      process.exit(1);
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to mute chat");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/unmute.ts
var unmuteCommand = new Command("unmute").description("Unmute a chat").argument("<chat>", "Chat name, username, or ID").option("--json", "Output as JSON").action(async (chat, options) => {
  assertWriteEnabled();
  const spinner2 = spinner(`Unmuting "${chat}"...`).start();
  try {
    const client = await getClient();
    const result2 = await unmuteChat(client, chat);
    if (result2.success) {
      if (options.json) {
        spinner2.stop();
        console.log(formatJson(result2));
      } else {
        spinner2.succeed(result2.message);
      }
    } else {
      if (options.json) {
        spinner2.stop();
        console.log(formatJson(result2));
      } else {
        spinner2.fail(result2.message);
      }
      process.exit(1);
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to unmute chat");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/folders.ts
var foldersCommand = new Command("folders").description("List all folders with their chats").option("--json", "Output as JSON").action(async (options) => {
  const spinner2 = spinner("Loading folders...").start();
  try {
    const client = await getClient();
    const folders = await getFolders(client);
    spinner2.stop();
    if (options.json) {
      console.log(JSON.stringify(folders, null, 2));
    } else {
      if (folders.length === 0) {
        console.log("No folders found.");
      } else {
        console.log(formatFolders(folders));
      }
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to load folders");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/folder.ts
var folderCommand = new Command("folder").description("Show chats in a specific folder").argument("<name>", "Folder name").option("--json", "Output as JSON").action(async (name, options) => {
  const spinner2 = spinner(`Loading folder "${name}"...`).start();
  try {
    const client = await getClient();
    const folder = await getFolder(client, name);
    spinner2.stop();
    if (!folder) {
      console.error(`Folder not found: ${name}`);
      process.exit(1);
    }
    if (options.json) {
      console.log(JSON.stringify(folder, null, 2));
    } else {
      console.log(formatFolder(folder));
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to load folder");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/folder-add.ts
var folderAddCommand = new Command("folder-add").description("Add a chat to a folder").argument("<folder>", "Folder name").argument("<chat>", "Chat name, username, or ID").option("--json", "Output as JSON").action(async (folder, chat, options) => {
  assertWriteEnabled();
  const spinner2 = spinner(`Adding "${chat}" to folder "${folder}"...`).start();
  try {
    const client = await getClient();
    const result2 = await addChatToFolder(client, folder, chat);
    if (result2.success) {
      if (options.json) {
        spinner2.stop();
        console.log(formatJson(result2));
      } else {
        spinner2.succeed(result2.message);
      }
    } else {
      if (options.json) {
        spinner2.stop();
        console.log(formatJson(result2));
      } else {
        spinner2.fail(result2.message);
      }
      process.exit(1);
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to add chat to folder");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/folder-remove.ts
var folderRemoveCommand = new Command("folder-remove").description("Remove a chat from a folder").argument("<folder>", "Folder name").argument("<chat>", "Chat name, username, or ID").option("--json", "Output as JSON").action(async (folder, chat, options) => {
  assertWriteEnabled();
  const spinner2 = spinner(`Removing "${chat}" from folder "${folder}"...`).start();
  try {
    const client = await getClient();
    const result2 = await removeChatFromFolder(client, folder, chat);
    if (result2.success) {
      if (options.json) {
        spinner2.stop();
        console.log(formatJson(result2));
      } else {
        spinner2.succeed(result2.message);
      }
    } else {
      if (options.json) {
        spinner2.stop();
        console.log(formatJson(result2));
      } else {
        spinner2.fail(result2.message);
      }
      process.exit(1);
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to remove chat from folder");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/confirm.ts
var import_node_child_process7 = require("node:child_process");
var import_node_path10 = require("node:path");
var import_node_os6 = require("node:os");
async function confirmByHuman(what) {
  const os = import_node_os6.platform();
  const hasTty = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  if (hasTty) {
    const answer = await prompt(`${what} [y/N] `);
    return /^(y|yes|д|да)$/i.test(answer);
  }
  if (os === "win32")
    return confirmOnWindows(what);
  if (os !== "darwin") {
    console.error(colors_default.red("No terminal to confirm on. Run this command yourself in a terminal."));
    return false;
  }
  const text2 = `${what}

Если об этом просит агент, а вы не ожидали — нажмите «Отмена».`;
  const script = `display dialog ${JSON.stringify(text2)} with title "Telegram CLI" ` + 'buttons {"Отмена", "Разрешить"} default button "Отмена" cancel button "Отмена" ' + "with icon caution giving up after 120";
  const out = await run2("/usr/bin/osascript", ["-e", script], 125000);
  return out !== null && out.includes("button returned:Разрешить") && !out.includes("gave up:true");
}
function windowsConfirmScript(text2) {
  const quoted = "'" + text2.replace(/'/g, "''") + "'";
  return "Add-Type -AssemblyName System.Windows.Forms;" + "$owner = New-Object System.Windows.Forms.Form; $owner.TopMost = $true; $owner.ShowInTaskbar = $false;" + `$r = [System.Windows.Forms.MessageBox]::Show($owner, ${quoted}, 'Telegram CLI', 'YesNo', 'Warning', 'Button2');` + "if ($r -eq 'Yes') { [Console]::Out.Write('ALLOW') } else { [Console]::Out.Write('DENY') }";
}
async function confirmOnWindows(what) {
  const text2 = `${what}

Если об этом просит агент, а вы не ожидали — нажмите «Нет».`;
  const ps = import_node_path10.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const out = await run2(ps, ["-NoProfile", "-NonInteractive", "-NoLogo", "-STA", "-EncodedCommand", encodedCommand(windowsConfirmScript(text2))], 125000);
  return out?.trim() === "ALLOW";
}
function run2(file, args2, timeout) {
  return new Promise((resolve) => {
    import_node_child_process7.execFile(file, args2, { encoding: "utf8", timeout, windowsHide: true }, (error, stdout) => resolve(error ? null : stdout));
  });
}

// src/write-mode.ts
function modeQuestion(mode, forSeconds) {
  const span = forSeconds ? ` на ${humanSpan(forSeconds)}` : " без ограничения по времени";
  return mode === "ask" ? `Разрешить Telegram CLI отправлять, редактировать и удалять сообщения от вашего аккаунта${span}, но только после вашего одобрения каждого действия?` : `Разрешить Telegram CLI отправлять, редактировать и удалять сообщения от вашего аккаунта${span} без вопросов?`;
}
function humanSpan(seconds) {
  if (seconds % 604800 === 0)
    return `${seconds / 604800} нед.`;
  if (seconds % 86400 === 0)
    return `${seconds / 86400} дн.`;
  if (seconds % 3600 === 0)
    return `${seconds / 3600} ч`;
  return `${Math.round(seconds / 60)} мин`;
}
async function applyModeChoice(choice, options = {}) {
  if (choice.mode === "read-only") {
    deleteWriteValue();
    return { ok: true };
  }
  if (choice.mode === "on" && !options.alreadyConfirmed) {
    if (hasHumanChannel()) {
      if (!await confirmByHuman(modeQuestion(choice.mode, choice.forSeconds)))
        return { ok: false, error: "not_confirmed" };
    } else if (!mayTrustUnconfirmedChoice()) {
      return { ok: false, error: "needs_terminal" };
    }
  }
  if (!setWriteValue(encodeWriteState(choice.forSeconds, Date.now(), choice.mode)))
    return { ok: false, error: "store_failed" };
  return { ok: true, until: parseWriteState(getWriteValue()).until };
}
function currentModeLine() {
  return describeWriteState(parseWriteState(getWriteValue()));
}

// src/onboard.ts
var import_node_crypto4 = require("node:crypto");
var import_node_http2 = require("node:http");

// src/onboard-page.ts
var import_node_crypto3 = require("node:crypto");
var en = {
  title: "Log in to Telegram for Better-TG-CLI",
  lead: "Your agent opened this page. What you enter here stays on this computer: the agent never sees the login key, the QR code or your password.",
  inviteH: "Step 1. Login key",
  getInvite: "Get a login key",
  getInviteNote: "better-tg-cli.com opens: confirm your email with the code we send, and the login key comes back here by itself.",
  haveInvite: "I already have a login key",
  paste: "Paste your login key",
  use: "Continue",
  ownKeys: "Use my own keys from my.telegram.org",
  apiId: "api_id",
  apiHash: "api_hash",
  connecting: "Connecting to Telegram…",
  scanH: "Step 2. Scan the QR code",
  scanNote: "On your phone: Telegram → Settings → Devices → Link Desktop Device. The code refreshes by itself.",
  passwordH: "Step 3. Two-step verification password",
  passwordNote: "You have one if you turned on a cloud password in Telegram. Hint:",
  send: "Log in",
  wrong: "Wrong password, try again.",
  doneH: "Done!",
  doneNote: "Logged in as {user}. You can close this tab and go back to your agent.",
  errorH: "Could not log in",
  retry: "Try again",
  gone: "This page stopped answering. Run telegram onboard again.",
  failed: "Something went wrong",
  modeTitle: "What may your agent do in Telegram?",
  modeH: "Last step. What may the agent do?",
  modeNote: "You can change this later with telegram write-access.",
  roName: "Read only",
  roNote: "Reads and searches only.",
  askName: "Ask me each time (recommended)",
  askNote: "Before each message or action, the agent shows it to you in the chat and sends only after your yes. It relies on the agent following its instructions.",
  onName: "Write freely",
  onNote: "Sends, edits and deletes without asking. Only for an agent you trust: a message it reads could talk it into posting as you.",
  forLabel: "For",
  forAlways: "until I change it",
  for1h: "1 hour",
  for1d: "1 day",
  for1w: "1 week",
  save: "Save",
  notConfirmed: "Not confirmed in the dialog. Choose again.",
  needsTerminal: "This computer can only confirm that in a terminal. Run telegram write-access on there. Until then the agent asks before each write.",
  modeDone: "Saved: {mode}. You can close this tab and go back to your agent.",
  doneMode: "Logged in as {user}. Write mode: {mode}. You can close this tab and go back to your agent."
};
var es = {
  title: "Inicia sesión en Telegram para Better-TG-CLI",
  lead: "Tu agente abrió esta página. Lo que introduces aquí se queda en este equipo: el agente nunca ve la clave de acceso, el código QR ni tu contraseña.",
  inviteH: "Paso 1. Clave de acceso",
  getInvite: "Obtener una clave de acceso",
  getInviteNote: "Se abrirá better-tg-cli.com: confirma tu correo con el código que te enviamos y la clave de acceso volverá aquí sola.",
  haveInvite: "Ya tengo una clave de acceso",
  paste: "Pega tu clave de acceso",
  use: "Continuar",
  ownKeys: "Usar mis propias claves de my.telegram.org",
  apiId: "api_id",
  apiHash: "api_hash",
  connecting: "Conectando con Telegram…",
  scanH: "Paso 2. Escanea el código QR",
  scanNote: "En tu teléfono: Telegram → Ajustes → Dispositivos → Vincular dispositivo de escritorio. El código se actualiza solo.",
  passwordH: "Paso 3. Contraseña de la verificación en dos pasos",
  passwordNote: "La tienes si activaste una contraseña en la nube en Telegram. Pista:",
  send: "Iniciar sesión",
  wrong: "Contraseña incorrecta, inténtalo de nuevo.",
  doneH: "¡Listo!",
  doneNote: "Has iniciado sesión como {user}. Puedes cerrar esta pestaña y volver a tu agente.",
  errorH: "No se pudo iniciar sesión",
  retry: "Intentar de nuevo",
  gone: "Esta página ya no responde. Vuelve a ejecutar telegram onboard.",
  failed: "Algo salió mal",
  modeTitle: "¿Qué puede hacer tu agente en Telegram?",
  modeH: "Último paso. ¿Qué puede hacer el agente?",
  modeNote: "Puedes cambiarlo más tarde con telegram write-access.",
  roName: "Solo lectura",
  roNote: "Solo lee y busca.",
  askName: "Preguntarme cada vez (recomendado)",
  askNote: "Antes de cada mensaje o acción, el agente te lo muestra en el chat y solo lo envía tras tu sí. Depende de que el agente siga sus instrucciones.",
  onName: "Escribir libremente",
  onNote: "Envía, edita y borra sin preguntar. Solo para un agente de confianza: un mensaje que lea podría convencerlo de publicar en tu nombre.",
  forLabel: "Durante",
  forAlways: "hasta que lo cambie",
  for1h: "1 hora",
  for1d: "1 día",
  for1w: "1 semana",
  save: "Guardar",
  notConfirmed: "No se confirmó en el diálogo. Elige de nuevo.",
  needsTerminal: "Este equipo solo puede confirmarlo en una terminal. Ejecuta allí telegram write-access on. Hasta entonces el agente pregunta antes de cada escritura.",
  modeDone: "Guardado: {mode}. Puedes cerrar esta pestaña y volver a tu agente.",
  doneMode: "Has iniciado sesión como {user}. Modo de escritura: {mode}. Puedes cerrar esta pestaña y volver a tu agente."
};
var ru = {
  title: "Вход в Telegram для Better-TG-CLI",
  lead: "Эту страницу открыл ваш агент. Всё, что здесь вводите, остаётся на этом компьютере: агент не видит ни ключ входа, ни QR, ни пароль.",
  inviteH: "Шаг 1. Ключ входа",
  getInvite: "Получить ключ входа",
  getInviteNote: "Откроется better-tg-cli.com: подтвердите почту кодом из письма, и ключ входа сам вернётся сюда.",
  haveInvite: "У меня уже есть ключ входа",
  paste: "Вставьте ключ входа",
  use: "Продолжить",
  ownKeys: "Войти со своими ключами с my.telegram.org",
  apiId: "api_id",
  apiHash: "api_hash",
  connecting: "Подключаемся к Telegram…",
  scanH: "Шаг 2. Отсканируйте QR",
  scanNote: "На телефоне: Telegram → Настройки → Устройства → Подключить устройство. Код обновляется сам.",
  passwordH: "Шаг 3. Пароль двухэтапной проверки",
  passwordNote: "Он есть, если вы включали «Облачный пароль» в Telegram. Подсказка:",
  send: "Войти",
  wrong: "Пароль не подошёл, попробуйте ещё раз.",
  doneH: "Готово!",
  doneNote: "Вы вошли как {user}. Эту вкладку можно закрыть и вернуться к агенту.",
  errorH: "Не получилось войти",
  retry: "Попробовать ещё раз",
  gone: "Страница больше не отвечает. Запустите telegram onboard ещё раз.",
  failed: "Что-то пошло не так",
  modeTitle: "Что агенту можно делать в Telegram?",
  modeH: "Последний шаг. Что можно агенту?",
  modeNote: "Это можно поменять потом командой telegram write-access.",
  roName: "Только чтение",
  roNote: "Только читает и ищет.",
  askName: "Спрашивать каждый раз (рекомендуем)",
  askNote: "Перед каждым сообщением или действием агент показывает его вам в чате и отправляет только после вашего «да». Держится на том, что агент слушается инструкций.",
  onName: "Писать без вопросов",
  onNote: "Отправляет, правит и удаляет, не спрашивая. Только для агента, которому вы доверяете: прочитанное сообщение может уговорить его написать от вашего имени.",
  forLabel: "На",
  forAlways: "пока не поменяю",
  for1h: "1 час",
  for1d: "1 день",
  for1w: "1 неделю",
  save: "Сохранить",
  notConfirmed: "В диалоге не подтвердили. Выберите ещё раз.",
  needsTerminal: "На этом компьютере это подтверждается только в терминале. Запустите там telegram write-access on. До тех пор агент спрашивает перед каждой записью.",
  modeDone: "Сохранено: {mode}. Эту вкладку можно закрыть и вернуться к агенту.",
  doneMode: "Вы вошли как {user}. Режим записи: {mode}. Эту вкладку можно закрыть и вернуться к агенту."
};
var STRINGS = { en, es, ru };
function onboardPage(options) {
  const nonce = import_node_crypto3.randomBytes(16).toString("base64");
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    `style-src 'nonce-${nonce}'`,
    "img-src 'self' data:",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'"
  ].join("; ");
  const inviteUrl = `${options.site}/?return=${encodeURIComponent(options.returnTo)}`;
  const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Better-TG-CLI</title>
<style nonce="${nonce}">
:root{--bg:#fff;--fg:#0a0a0a;--dim:#6b6f73;--line:#e4e5e7;--panel:#fafafa;--accent:#1c93d1;--err:#c62828;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#000;--fg:#f2f2f2;--dim:#8d9297;--line:#26282a;--panel:#0b0b0b;--accent:#2AABEE;--err:#ff6b6b;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,sans-serif}
main{max-width:560px;margin:0 auto;padding:48px 16px 64px}
.brand{font:500 14px/1 ui-monospace,monospace;letter-spacing:1px;margin-bottom:32px}.brand i{font-style:normal;color:var(--accent)}
h1{font-size:28px;line-height:1.15;letter-spacing:-.5px;margin:0 0 10px}
h2{font-size:19px;margin:0 0 10px}
p{margin:0 0 14px;color:var(--dim)}
section{margin-top:28px}
.btn,button{display:inline-block;font:inherit;font-weight:500;cursor:pointer;border:0;border-radius:10px;padding:11px 18px;background:var(--fg);color:var(--bg);text-decoration:none}
button.ghost{background:transparent;color:var(--accent);padding:0;font-weight:400}
button:disabled{opacity:.5}
input{width:100%;font:inherit;padding:11px 13px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--fg);margin-bottom:10px}
details{margin-top:18px}summary{cursor:pointer;color:var(--accent)}
details>div{margin-top:12px}
.qr{display:inline-block;background:#fff;padding:10px;border-radius:14px;border:1px solid var(--line)}
.qr svg{display:block;width:260px;height:260px}
.err{color:var(--err)}
.mono{font-family:ui-monospace,monospace}
.opt{display:block;border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:10px;cursor:pointer;background:var(--panel)}
.opt:has(input:checked){border-color:var(--accent)}
.opt input{width:auto;margin:0 8px 0 0}.opt b{color:var(--fg)}.opt small{display:block;color:var(--dim);margin:4px 0 0 24px}
select{font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--fg);margin:0 0 14px 6px}
[hidden]{display:none!important}
</style></head><body><main>
<div class="brand">BETTER-TG-CLI<i>.</i></div>
<h1 data-t="title"></h1>
<p data-t="lead"></p>

<section id="invite" hidden>
  <h2 data-t="inviteH"></h2>
  <a class="btn" id="get" href="${inviteUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" data-t="getInvite"></a>
  <p data-t="getInviteNote"></p>
  <details><summary data-t="haveInvite"></summary><div>
    <input id="tok" autocomplete="off" spellcheck="false" data-ph="paste">
    <button id="use" data-t="use"></button></div></details>
  <details><summary data-t="ownKeys"></summary><div>
    <input id="apiId" inputmode="numeric" autocomplete="off" data-ph="apiId">
    <input id="apiHash" autocomplete="off" spellcheck="false" data-ph="apiHash">
    <button id="keys" data-t="use"></button></div></details>
</section>

<section id="connecting" hidden><p data-t="connecting"></p></section>

<section id="scan" hidden>
  <h2 data-t="scanH"></h2><p data-t="scanNote"></p>
  <div class="qr" id="qr"></div>
</section>

<section id="password" hidden>
  <h2 data-t="passwordH"></h2>
  <p><span data-t="passwordNote"></span> <b id="hint"></b></p>
  <input id="pw" type="password" autocomplete="current-password">
  <button id="pwgo" data-t="send"></button>
</section>

<section id="mode" hidden>
  <h2 data-t="modeH"></h2><p data-t="modeNote"></p>
  <label class="opt"><input type="radio" name="mode" value="read-only"><b data-t="roName"></b><small data-t="roNote"></small></label>
  <label class="opt"><input type="radio" name="mode" value="ask" checked><b data-t="askName"></b><small data-t="askNote"></small></label>
  <label class="opt"><input type="radio" name="mode" value="on"><b data-t="onName"></b><small data-t="onNote"></small></label>
  <p id="forrow" hidden><span data-t="forLabel"></span><select id="for"><option value="" data-t="forAlways"></option><option value="1h" data-t="for1h"></option><option value="1d" data-t="for1d"></option><option value="1w" data-t="for1w"></option></select></p>
  <button id="modego" data-t="save"></button>
</section>

<section id="done" hidden><h2 data-t="doneH"></h2><p id="donetext"></p></section>
<section id="error" hidden><h2 data-t="errorH"></h2><p class="mono" id="errtext"></p><button id="retry" data-t="retry"></button></section>
<p class="err" id="msg" role="alert" hidden></p>
</main>
<script nonce="${nonce}">
const S = ${JSON.stringify(STRINGS)};
// First browser language we have, else English; the invite site gets the same one
const LANG = (navigator.languages || [navigator.language || '']).map(l => l.toLowerCase().split('-')[0]).find(l => l in S) || 'en';
const L = S[LANG];
document.documentElement.lang = LANG;
const getLink = document.getElementById('get');
getLink.href = getLink.getAttribute('href') + '&lang=' + LANG;
document.title = L.title;
for (const el of document.querySelectorAll('[data-t]')) el.textContent = L[el.dataset.t];
for (const el of document.querySelectorAll('[data-ph]')) el.placeholder = L[el.dataset.ph];
const $ = id => document.getElementById(id);
const base = location.pathname.replace(/cb$/, '');
const msg = t => { $('msg').textContent = t || ''; $('msg').hidden = !t; };

async function post(route, body) {
  const res = await fetch(base + route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error === 'not_confirmed' ? L.notConfirmed : data.error === 'needs_terminal' ? L.needsTerminal : data.message || data.error || L.failed);
}
async function act(route, body, btn) {
  msg(''); if (btn) btn.disabled = true;
  try { await post(route, body); await poll(); } catch (e) { msg(e.message); } finally { if (btn) btn.disabled = false; }
}

// Back from better-tg-cli.com with #invite=…: take it, then drop it from the address bar
const m = /[#&]invite=([^&]+)/.exec(location.hash);
history.replaceState(null, '', base);
if (m) act('invite', { invite: decodeURIComponent(m[1]) });

$('use').onclick = () => act('invite', { invite: $('tok').value }, $('use'));
$('keys').onclick = () => act('invite', { apiId: $('apiId').value, apiHash: $('apiHash').value }, $('keys'));
$('pwgo').onclick = () => { const pw = $('pw').value; $('pw').value = ''; act('password', { password: pw }, $('pwgo')); };
$('pw').onkeydown = e => { if (e.key === 'Enter') $('pwgo').click(); };
$('retry').onclick = () => act('retry', {}, $('retry'));
const picked = () => document.querySelector('input[name=mode]:checked').value;
for (const r of document.querySelectorAll('input[name=mode]')) r.onchange = () => { $('forrow').hidden = picked() === 'read-only'; };
const MODE_NAMES = { 'read-only': 'roName', ask: 'askName', on: 'onName' };
$('modego').onclick = () => act('mode', { mode: picked(), for: picked() === 'read-only' ? '' : $('for').value }, $('modego'));

let last = '', timer, modeSeeded = false;
async function poll() {
  let s;
  try { s = await (await fetch(base + 'state', { cache: 'no-store' })).json(); }
  catch { msg(L.gone); clearInterval(timer); return; }
  for (const id of ['invite', 'connecting', 'scan', 'password', 'mode', 'done', 'error']) $(id).hidden = s.step !== id;
  if (s.step === 'mode' && !modeSeeded && s.mode) { const r = document.querySelector('input[name=mode][value="' + s.mode + '"]'); if (r) r.checked = true; $('forrow').hidden = s.mode === 'read-only'; modeSeeded = true; }
  if (s.modeOnly) { document.title = L.modeTitle; document.querySelector('h1').textContent = L.modeTitle; document.querySelector('h1 + p').hidden = true; }
  // qrSvg is rendered by this local CLI from the Telegram login token, not taken from any site
  if (s.step === 'scan' && s.qrSvg !== last) { $('qr').innerHTML = s.qrSvg; last = s.qrSvg; }
  if (s.step === 'password') { $('hint').textContent = s.hint || '—'; if (s.error === 'wrong_password') msg(L.wrong); }
  if (s.step === 'error') $('errtext').textContent = s.error || '';
  if (s.step === 'done') {
    const u = s.user || {};
    const who = (u.name || '') + (u.username ? ' (@' + u.username + ')' : '');
    const mode = s.mode ? L[MODE_NAMES[s.mode]] : '';
    $('donetext').textContent = s.modeOnly ? L.modeDone.replace('{mode}', mode)
      : s.mode ? L.doneMode.replace('{user}', who).replace('{mode}', mode) : L.doneNote.replace('{user}', who);
    clearInterval(timer);
  }
}
poll();
timer = setInterval(poll, 1000);
</script></body></html>`;
  return { html, csp };
}

// src/onboard.ts
var ONBOARD_SITE = "https://better-tg-cli.com";
var MAX_BODY2 = 16000;
var MODE_SPANS = { "": undefined, "1h": 3600, "1d": 86400, "1w": 604800 };
var MODE_WAIT_MS = 10 * 60000;
function json2(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(JSON.stringify(body));
}
function readBody2(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY2) {
        reject(new Error("too large"));
        req.destroy();
      } else
        chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("bad json"));
      }
    });
    req.on("error", reject);
  });
}
async function startOnboarding(options) {
  const secret = import_node_crypto4.randomBytes(32).toString("base64url");
  const state = options.modeOnly ? { step: "mode", modeOnly: true } : { step: "invite" };
  const abort = new AbortController;
  let creds;
  let running = false;
  let passwordWaiter;
  let resolveDone;
  const done = new Promise((r) => resolveDone = r);
  let modeTimer;
  let applying = false;
  const set = (patch) => Object.assign(state, { error: undefined }, patch);
  function finish(mode = options.modeOnly ? undefined : options.defaultMode) {
    if (modeTimer)
      clearTimeout(modeTimer);
    set({ step: "done", mode, qrSvg: undefined });
    options.emit({ event: "done", ...state.user ? { user: state.user } : {}, ...mode ? { mode } : {} });
    resolveDone({ user: state.user, mode });
  }
  function askMode() {
    set({ step: "mode", qrSvg: undefined });
    options.emit({ event: "waiting_mode" });
    modeTimer = setTimeout(() => finish(), MODE_WAIT_MS);
    modeTimer.unref?.();
  }
  async function runLogin() {
    if (!creds || running)
      return;
    running = true;
    set({ step: "connecting", qrSvg: undefined });
    try {
      const result2 = await options.driver.login(creds, {
        onQr: (url2) => {
          const first = state.step !== "scan";
          set({ step: "scan", qrSvg: renderSVG(url2, { border: 2 }) });
          if (first)
            options.emit({ event: "waiting_scan" });
        },
        password: (hint) => new Promise((resolve) => {
          const wrong = state.error === "wrong_password";
          set({ step: "password", hint, qrSvg: undefined });
          if (wrong)
            state.error = "wrong_password";
          options.emit({ event: "need_password" });
          passwordWaiter = resolve;
        }),
        onPasswordError: () => {
          state.error = "wrong_password";
        },
        signal: abort.signal
      });
      options.save(result2.session, creds, creds.invite);
      set({ user: result2.user, mode: options.defaultMode });
      if (options.applyMode && options.defaultMode)
        await options.applyMode({ mode: options.defaultMode });
      if (options.applyMode) {
        options.emit({ event: "logged_in", user: result2.user });
        askMode();
      } else
        finish();
    } catch (e) {
      if (abort.signal.aborted)
        return;
      const message = errorMessage(e);
      set({ step: "error", error: message, qrSvg: undefined });
      options.emit({ event: "error", message });
    } finally {
      running = false;
    }
  }
  let origin = "";
  const base = `/s/${secret}/`;
  const handler = async (req, res) => {
    if (req.headers.host !== origin.slice("http://".length))
      return json2(res, 421, { error: "wrong_host" });
    const path2 = (req.url ?? "").split("?")[0];
    if (!path2.startsWith(base))
      return json2(res, 404, { error: "not_found" });
    const route = path2.slice(base.length);
    if (req.method === "GET" && (route === "" || route === "cb")) {
      const { html, csp } = onboardPage({ site: options.site ?? ONBOARD_SITE, returnTo: `${origin}${base}cb` });
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "content-security-policy": csp,
        "referrer-policy": "no-referrer",
        "x-content-type-options": "nosniff"
      });
      res.end(html);
      return;
    }
    if (req.method === "GET" && route === "state")
      return json2(res, 200, state);
    if (req.method !== "POST")
      return json2(res, 404, { error: "not_found" });
    if (req.headers.origin !== origin)
      return json2(res, 403, { error: "wrong_origin" });
    let body;
    try {
      body = await readBody2(req);
    } catch {
      return json2(res, 400, { error: "bad_request" });
    }
    if (route === "invite") {
      if (creds)
        return json2(res, 409, { error: "already_started" });
      try {
        if (typeof body.invite === "string" && body.invite.trim()) {
          creds = { ...await options.redeemInvite(body.invite.trim()), invite: true };
        } else {
          const apiId = Number(body.apiId);
          const apiHash = typeof body.apiHash === "string" ? body.apiHash.trim() : "";
          if (!Number.isInteger(apiId) || apiId <= 0 || !/^[0-9a-f]{32}$/i.test(apiHash)) {
            return json2(res, 400, { error: "bad_keys" });
          }
          creds = { apiId, apiHash, invite: false };
        }
      } catch (e) {
        return json2(res, 400, { error: "invite_failed", message: errorMessage(e) });
      }
      runLogin();
      return json2(res, 202, { ok: true });
    }
    if (route === "password") {
      if (state.step !== "password" || !passwordWaiter || typeof body.password !== "string" || !body.password) {
        return json2(res, 409, { error: "not_waiting_for_password" });
      }
      const give = passwordWaiter;
      passwordWaiter = undefined;
      set({ step: "connecting" });
      give(body.password);
      return json2(res, 202, { ok: true });
    }
    if (route === "mode") {
      if (state.step !== "mode" || !options.applyMode || applying)
        return json2(res, 409, { error: "not_waiting_for_mode" });
      const mode = body.mode;
      const span = typeof body.for === "string" ? body.for : "";
      if (mode !== "read-only" && mode !== "ask" && mode !== "on" || !(span in MODE_SPANS))
        return json2(res, 400, { error: "bad_mode" });
      applying = true;
      try {
        const result2 = await options.applyMode({ mode, forSeconds: MODE_SPANS[span] });
        if (!result2.ok) {
          state.error = result2.error;
          return json2(res, 409, { error: result2.error });
        }
        options.emit({ event: "mode", mode, ...result2.until ? { until: result2.until.toISOString() } : {} });
        finish(mode);
        return json2(res, 202, { ok: true });
      } finally {
        applying = false;
      }
    }
    if (route === "retry") {
      if (!creds || running || state.step !== "error")
        return json2(res, 409, { error: "nothing_to_retry" });
      runLogin();
      return json2(res, 202, { ok: true });
    }
    return json2(res, 404, { error: "not_found" });
  };
  const server = import_node_http2.createServer((req, res) => {
    handler(req, res).catch(() => json2(res, 500, { error: "internal" }));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, "127.0.0.1", () => resolve());
  });
  const { port } = server.address();
  origin = `http://127.0.0.1:${port}`;
  const url = `${origin}${base}`;
  options.emit({ event: "url", url });
  if (options.modeOnly)
    askMode();
  else
    options.emit({ event: "waiting_invite" });
  const close = () => {
    if (modeTimer)
      clearTimeout(modeTimer);
    abort.abort();
    server.closeAllConnections?.();
    server.close();
  };
  return { url, done, close };
}

// src/commands/onboard.ts
var import_node_child_process8 = require("node:child_process");
var HUMAN = {
  url: (e) => `Open this page to log in (it stays on this computer): ${e.url}`,
  waiting_invite: () => "Waiting for a login key or API keys on the page…",
  waiting_scan: () => "Waiting for the QR scan (Telegram → Settings → Devices → Link Desktop Device)…",
  need_password: () => "Waiting for the two-step verification password on the page…",
  logged_in: (e) => `Logged in as ${e.user.name}${e.user.username ? ` (@${e.user.username})` : ""}. Session saved.`,
  waiting_mode: () => "Waiting for the user to choose on the page what you may do: read-only, ask before each write, or write freely…",
  mode: (e) => `Write mode: ${e.mode}${e.until ? ` until ${new Date(e.until).toLocaleString()}` : ""}.`,
  done: (e) => e.user ? `Done: ${e.user.name}${e.user.username ? ` (@${e.user.username})` : ""}, write mode ${e.mode ?? "read-only"}.` : `Done: write mode ${e.mode ?? "unchanged"}.`,
  error: (e) => `Login failed: ${e.message}. The page offers a retry.`
};
function openBrowser(url) {
  const [cmd, ...args2] = process.platform === "darwin" ? ["open", url] : process.platform === "win32" ? ["rundll32", "url.dll,FileProtocolHandler", url] : ["xdg-open", url];
  try {
    import_node_child_process8.spawn(cmd, args2, { stdio: "ignore", detached: true, windowsHide: true }).on("error", () => {}).unref();
  } catch {}
}
var onboardCommand = new Command("onboard").description("Guided login for agents: opens a local page where you get a login key (or use your own keys), scan a QR code and enter your 2FA password; the agent never sees any of it").option("--json", "Print progress as JSON lines (events: url, waiting_invite, waiting_scan, need_password, logged_in, waiting_mode, mode, done, error)").option("--no-open", "Don't open the browser, just print the URL").option("--timeout <minutes>", "Give up after this many minutes", "15").option("--broker <url>", "Login service URL (default: built-in, or TG_BROKER_URL)").option("--test-dc", "Log in on Telegram's test servers (for development; use with TG_PROFILE)").action(async (opts) => {
  let timer;
  const emit = (e) => {
    console.log(opts.json ? JSON.stringify(e) : HUMAN[e.event](e));
    if (e.event === "logged_in" && timer)
      clearTimeout(timer);
  };
  if (isConfigured() && getSessionString()) {
    console.log(opts.json ? JSON.stringify({ event: "already_logged_in" }) : 'Already logged in. Check with "telegram whoami"; "telegram logout" first to switch accounts.');
    return;
  }
  const minutes = Number(opts.timeout);
  if (!(minutes > 0)) {
    console.error(`Invalid --timeout "${opts.timeout}"`);
    process.exit(2);
  }
  if (process.env.SSH_CONNECTION) {
    console.error("Note: over SSH the page on 127.0.0.1 is only reachable on this machine. Forward the port " + '(ssh -L <port>:127.0.0.1:<port>) or run "telegram auth --qr" in a terminal here instead.');
  }
  const session = await startOnboarding({
    driver: qrLoginDriver(!!opts.testDc),
    redeemInvite: (token) => fetchInviteCredentials(token, opts.broker),
    save: (s, creds, invite) => saveLogin(s, creds, invite, !!opts.testDc),
    emit,
    site: process.env.TG_ONBOARD_SITE || ONBOARD_SITE,
    applyMode: (choice) => applyModeChoice(choice),
    defaultMode: "ask"
  });
  if (opts.open)
    openBrowser(session.url);
  timer = setTimeout(() => {
    console.log(opts.json ? JSON.stringify({ event: "timeout" }) : `Timed out after ${minutes} min; run "telegram onboard" again.`);
    session.close();
    process.exit(1);
  }, minutes * 60000);
  const onSignal = () => {
    session.close();
    process.exit(130);
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  await session.done;
  clearTimeout(timer);
  await new Promise((r) => setTimeout(r, 2500));
  session.close();
  process.exit(0);
});

// src/commands/write-access.ts
var UNPROTECTED_NOTE = "No secret store on this machine: the mode is kept in a plain file in the profile, which an agent could edit. " + "It guards against mistakes, not against a hostile agent.";
var writeAccessCommand = new Command("write-access").description("Manage write access: read-only, ask (the user approves each write in the chat; set after onboarding) or on (no questions; needs the user's confirmation)").argument("[action]", "ask, on, off, or omit to show status").option("--for <duration>", 'With "ask" or "on": back to read-only automatically after 30m / 2h / 1d / 1w').option("--no-open", "Without a terminal or dialog: print the page URL instead of opening a browser").action(async (action, options) => {
  if (action === "ask") {
    const result2 = await applyModeChoice({ mode: "ask", forSeconds: options.for ? parseForDuration(options.for) : undefined });
    if (!result2.ok) {
      console.error(colors_default.red(`Write access unchanged (${result2.error}).`));
      process.exit(1);
    }
    console.log(colors_default.green(`Write access: ${currentModeLine()}.`));
    console.log(colors_default.gray("Before every send, show the user the exact action and wait for their yes in the chat."));
    if (!isWriteModeProtected())
      console.log(colors_default.gray(UNPROTECTED_NOTE));
  } else if (action === "on") {
    const forSeconds = options.for ? parseForDuration(options.for) : undefined;
    let result2;
    if (hasHumanChannel()) {
      if (!await confirmByHuman(modeQuestion(action, forSeconds))) {
        console.error(colors_default.yellow("Not confirmed by the user. Write access stays as it was."));
        process.exit(1);
      }
      result2 = await applyModeChoice({ mode: action, forSeconds }, { alreadyConfirmed: true });
    } else if (mayTrustUnconfirmedChoice()) {
      result2 = await chooseOnPage(options.open);
    } else {
      console.error(colors_default.red("No terminal or dialog to confirm on. Run this command yourself in a terminal."));
      process.exit(1);
    }
    if (!result2.ok) {
      console.error(colors_default.red(`Write access unchanged (${result2.error}).`));
      process.exit(1);
    }
    console.log(colors_default.green(`Write access: ${currentModeLine()}.`));
    if (!isWriteModeProtected())
      console.log(colors_default.gray(UNPROTECTED_NOTE));
  } else if (action === "off") {
    await applyModeChoice({ mode: "read-only" });
    console.log(colors_default.yellow("Write access disabled (read-only mode)."));
  } else if (!action) {
    const state = parseWriteState(getWriteValue());
    const line = `Write access: ${currentModeLine()}`;
    console.log(state.mode === "read-only" ? colors_default.yellow(line) : colors_default.green(line));
    if (!isWriteModeProtected())
      console.log(colors_default.gray(UNPROTECTED_NOTE));
    if (state.mode === "read-only") {
      console.log(colors_default.gray("To allow writes: telegram write-access ask (the user approves each one in the chat) | on [--for 1h] (no questions, the user confirms)"));
    }
  } else {
    console.error(colors_default.red(`Unknown action: ${action}`));
    console.error(colors_default.gray("Usage: telegram write-access [ask|on|off] [--for 1h]"));
    process.exit(1);
  }
});
async function chooseOnPage(open) {
  let picked = { ok: false, error: "not_confirmed" };
  const session = await startOnboarding({
    modeOnly: true,
    driver: { login: () => Promise.reject(new Error("not a login")) },
    redeemInvite: () => Promise.reject(new Error("not a login")),
    save: () => {},
    site: process.env.TG_ONBOARD_SITE || ONBOARD_SITE,
    emit: (e) => {
      if (e.event === "url") {
        console.log(`Ask the user to open this page and choose what you may do: ${e.url}`);
        console.log("It is on 127.0.0.1 of this computer, so it opens in this computer's browser (on a cloud agent: the one the user watches), not in a browser on the user's own machine. Waiting up to 10 minutes…");
        if (open)
          openBrowser(e.url);
      }
    },
    applyMode: async (choice) => picked = await applyModeChoice(choice)
  });
  const result2 = await session.done;
  await new Promise((r) => setTimeout(r, 2500));
  session.close();
  return result2.mode ? picked : { ok: false, error: "not_confirmed" };
}
// src/commands/download.ts
var downloadCommand = new Command("download").description("Download media (photo/document) from a message").argument("<chat>", "Chat name, username (@user), or ID").argument("<messageId>", "Message ID (see #id in read output)").option("-o, --output <dir>", "Output directory", "./telegram-media").option("--json", "Output as JSON").action(async (chat, messageIdArg, options) => {
  const messageId = parseInt(messageIdArg, 10);
  if (Number.isNaN(messageId)) {
    console.error(colors_default.red(`Invalid message id: ${messageIdArg}`));
    process.exit(1);
  }
  const spinner2 = spinner(`Downloading media from message #${messageId}...`).start();
  try {
    const client = await getClient();
    const result2 = await downloadMessageMedia(client, chat, messageId, options.output);
    if (!result2) {
      spinner2.fail("Message has no downloadable media");
      await disconnectClient();
      process.exit(1);
    }
    spinner2.succeed(colors_default.green("Media downloaded"));
    if (options.json) {
      console.log(formatJson({
        messageId,
        filePath: result2.filePath,
        media: result2.media
      }));
    } else {
      console.log(colors_default.bold(formatMediaLabel(result2.media)));
      console.log(colors_default.gray(`Saved to: ${result2.filePath}`));
    }
    await disconnectClient();
    process.exit(0);
  } catch (error) {
    spinner2.fail("Failed to download media");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/send-file.ts
var import_fs4 = require("fs");
var import_path3 = require("path");
var sendFileCommand = new Command("send-file").description("Send a photo or document to a chat").argument("<target>", "Chat name, username (@user), or ID").argument("<path>", "Path to file to send").option("-c, --caption <text>", 'Optional caption ("-" reads it from stdin)').option("--html", "Parse the caption as HTML").option("--markdown", "Parse the caption as Markdown").option("--silent", "Send without a notification sound").option("--topic <id>", "Post into this forum topic").option("--as-document", "Send images as uncompressed documents").option("--reply-to <id>", "Reply to a specific message ID").option("--json", "Output as JSON").action(async (target, filePath, options) => {
  assertWriteEnabled();
  if (options.caption)
    options.caption = readTextArg(options.caption);
  const absPath = import_path3.resolve(filePath);
  if (!import_fs4.existsSync(absPath)) {
    console.error(colors_default.red(`File not found: ${absPath}`));
    process.exit(1);
  }
  const stat = import_fs4.statSync(absPath);
  if (!stat.isFile()) {
    console.error(colors_default.red(`Not a regular file: ${absPath}`));
    process.exit(1);
  }
  const spinner2 = spinner(`Uploading "${absPath}" to "${target}"...`).start();
  try {
    const client = await getClient();
    const result2 = await sendFileMessage(client, target, absPath, {
      caption: options.caption,
      asDocument: options.asDocument,
      replyToMsgId: options.replyTo ? parseInt(options.replyTo, 10) : undefined,
      parseMode: options.html ? "html" : options.markdown ? "md" : undefined,
      silent: options.silent,
      topic: options.topic ? parseInt(options.topic, 10) : undefined
    });
    auditLog({
      timestamp: new Date().toISOString(),
      command: "send-file",
      target,
      message: `file:${absPath}${options.caption ? ` caption:${options.caption}` : ""}`,
      result: { success: true, messageId: result2.id }
    });
    spinner2.succeed(colors_default.green("File sent"));
    if (options.json) {
      console.log(formatJson({
        id: result2.id,
        date: result2.date ? new Date(result2.date * 1000).toISOString() : null,
        file: absPath,
        caption: options.caption ?? null
      }));
    } else {
      console.log(colors_default.gray(`Message ID: ${result2.id}`));
    }
    await disconnectClient();
    process.exit(0);
  } catch (error) {
    auditLog({
      timestamp: new Date().toISOString(),
      command: "send-file",
      target,
      message: `file:${absPath}`,
      result: { success: false, error: error instanceof Error ? error.message : String(error) }
    });
    spinner2.fail("Failed to send file");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/buttons.ts
var buttonsCommand = new Command("buttons").description("List the buttons attached to a bot message").argument("<chat>", "Chat name, username (@user), or ID").argument("<messageId>", "Message ID (the #number shown by `tg read`)").option("--json", "Output as JSON").action(async (chat, messageId, options) => {
  const id = parseInt(messageId, 10);
  if (!Number.isInteger(id)) {
    console.error("Message ID must be a number");
    process.exit(1);
  }
  const spinner2 = spinner(`Reading buttons on #${id}...`).start();
  try {
    const client = await getClient();
    const result2 = await getMessageButtons(client, chat, id);
    spinner2.stop();
    if (options.json) {
      console.log(formatJson(result2));
    } else if (!result2.layout) {
      console.log(colors_default.gray(`Message #${result2.messageId} in "${result2.chatTitle}" has no buttons.`));
    } else {
      if (result2.text)
        console.log(result2.text + `
`);
      console.log(formatButtonLayout(result2.layout, ""));
      console.log(colors_default.gray(`
Press one with: tg click "${chat}" ${result2.messageId} <index|text>`));
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to read buttons");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/click.ts
var clickCommand = new Command("click").description("Press a button on a bot message (inline callback, reply keyboard, etc.)").argument("<chat>", "Chat name, username (@user), or ID").argument("<messageId>", "Message ID (the #number shown by `tg read`)").argument("[button]", "Button to press: its 1-based index or its label text").option("--data <payload>", "Press the callback button whose raw payload is this base64 string").option("--password <pw>", "Account 2FA password, for buttons that require it").option("--no-wait", "Do not wait for / fetch the bot response after clicking").option("--json", "Output as JSON").action(async (chat, messageId, button, options) => {
  assertWriteEnabled();
  const id = parseInt(messageId, 10);
  if (!Number.isInteger(id)) {
    console.error("Message ID must be a number");
    process.exit(1);
  }
  const selector = {};
  if (options.data) {
    selector.dataBase64 = options.data;
  } else if (button != null) {
    if (/^\d+$/.test(button))
      selector.index = parseInt(button, 10);
    else
      selector.text = button;
  } else {
    console.error("Specify a button by index/text, or use --data <base64>");
    process.exit(1);
  }
  const spinner2 = spinner(`Pressing button on #${id}...`).start();
  const auditTarget = options.data ? `data:${options.data}` : String(button);
  try {
    const client = await getClient();
    const outcome = await clickButton(client, chat, id, selector, {
      password: options.password,
      waitMs: options.wait === false ? 0 : undefined
    });
    auditLog({
      timestamp: new Date().toISOString(),
      command: "click",
      target: chat,
      message: `#${id} → [${outcome.button.index}] ${outcome.button.text}`,
      result: { success: true, messageId: outcome.sentMessageId }
    });
    spinner2.stop();
    if (options.json) {
      console.log(formatJson(outcome));
    } else {
      console.log(formatClickOutcome(outcome));
    }
    await disconnectClient();
  } catch (error) {
    auditLog({
      timestamp: new Date().toISOString(),
      command: "click",
      target: chat,
      message: `#${id} → ${auditTarget}`,
      result: { success: false, error: error instanceof Error ? error.message : String(error) }
    });
    spinner2.fail("Failed to press button");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/react.ts
var reactCommand = new Command("react").description("React to a message with an emoji (or remove your reaction)").argument("<chat>", "Chat name, username (@user), or ID").argument("<messageId>", "Message ID (the #number shown by `tg read`)").argument("[emoji]", "Emoji reaction, e.g. \uD83D\uDC4D (omit together with --remove to clear it)").option("--big", "Play the big / animated reaction effect").option("--remove", "Remove your reaction from the message").option("--json", "Output as JSON").action(async (chat, messageId, emoji, options) => {
  assertWriteEnabled();
  const id = parseInt(messageId, 10);
  if (!Number.isInteger(id)) {
    console.error("Message ID must be a number");
    process.exit(1);
  }
  if (!emoji && !options.remove) {
    console.error("Provide an emoji to react with, or use --remove to clear your reaction");
    process.exit(1);
  }
  const spinner2 = spinner(options.remove ? `Removing reaction on #${id}...` : `Reacting ${emoji} to #${id}...`).start();
  try {
    const client = await getClient();
    const result2 = await reactToMessage(client, chat, id, emoji, { big: options.big, remove: options.remove });
    auditLog({
      timestamp: new Date().toISOString(),
      command: "react",
      target: chat,
      message: `#${id} ${result2.removed ? "(removed)" : result2.emoji}`,
      result: { success: true }
    });
    spinner2.stop();
    if (options.json) {
      console.log(formatJson({ chat: result2.chatTitle, messageId: id, ...result2 }));
    } else if (result2.removed) {
      console.log(colors_default.green(`✓ Removed your reaction on #${id} in "${result2.chatTitle}"`));
    } else {
      console.log(colors_default.green(`✓ Reacted ${result2.emoji} to #${id} in "${result2.chatTitle}"`));
    }
    await disconnectClient();
  } catch (error) {
    auditLog({
      timestamp: new Date().toISOString(),
      command: "react",
      target: chat,
      message: `#${id} ${emoji ?? "(remove)"}`,
      result: { success: false, error: error instanceof Error ? error.message : String(error) }
    });
    spinner2.fail("Failed to react");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/forward.ts
var forwardCommand = new Command("forward").description("Forward one or more messages to another chat").argument("<fromChat>", "Source chat name, username (@user), or ID").argument("<messageIds>", "Message ID, or comma-separated IDs (e.g. 123 or 123,124,125)").argument("<toChat>", "Destination chat name, username (@user), or ID").option("--silent", "Forward without a notification sound").option("--drop-author", 'Hide the original sender (no "forwarded from" header)').option("--json", "Output as JSON").action(async (fromChat, messageIds, toChat, options) => {
  assertWriteEnabled();
  const ids = messageIds.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isInteger(n));
  if (ids.length === 0) {
    console.error("Provide at least one numeric message ID");
    process.exit(1);
  }
  const spinner2 = spinner(`Forwarding ${ids.length} message(s) from "${fromChat}" to "${toChat}"...`).start();
  try {
    const client = await getClient();
    const result2 = await forwardMessages(client, fromChat, ids, toChat, {
      silent: options.silent,
      dropAuthor: options.dropAuthor
    });
    auditLog({
      timestamp: new Date().toISOString(),
      command: "forward",
      target: toChat,
      message: `${ids.length} from ${fromChat} [${ids.join(",")}]`,
      result: { success: true }
    });
    spinner2.stop();
    if (options.json) {
      console.log(formatJson({ ...result2, messageIds: ids }));
    } else {
      console.log(colors_default.green(`✓ Forwarded ${result2.count} message(s) from "${result2.fromTitle}" to "${result2.toTitle}"`));
    }
    await disconnectClient();
  } catch (error) {
    auditLog({
      timestamp: new Date().toISOString(),
      command: "forward",
      target: toChat,
      message: `from ${fromChat} [${ids.join(",")}]`,
      result: { success: false, error: error instanceof Error ? error.message : String(error) }
    });
    spinner2.fail("Failed to forward");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/pin.ts
var pinCommand = new Command("pin").description("Pin a message in a chat").argument("<chat>", "Chat name, username (@user), or ID").argument("<messageId>", "Message ID (the #number shown by `tg read`)").option("--notify", "Notify chat members about the pin (default: silent)").option("--one-side", "In a private chat, pin only on your side").option("--json", "Output as JSON").action(async (chat, messageId, options) => {
  assertWriteEnabled();
  const id = parseInt(messageId, 10);
  if (!Number.isInteger(id)) {
    console.error("Message ID must be a number");
    process.exit(1);
  }
  const spinner2 = spinner(`Pinning #${id} in "${chat}"...`).start();
  try {
    const client = await getClient();
    const result2 = await pinChatMessage(client, chat, id, { notify: options.notify, pmOneSide: options.oneSide });
    auditLog({ timestamp: new Date().toISOString(), command: "pin", target: chat, message: `#${id}`, result: { success: true } });
    spinner2.stop();
    if (options.json) {
      console.log(formatJson({ chat: result2.chatTitle, messageId: id, pinned: true }));
    } else {
      console.log(colors_default.green(`✓ Pinned #${id} in "${result2.chatTitle}"`));
    }
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "pin", target: chat, message: `#${id}`, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to pin");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
var unpinCommand = new Command("unpin").description("Unpin a message (or all pinned messages) in a chat").argument("<chat>", "Chat name, username (@user), or ID").argument("[messageId]", "Message ID to unpin; omit to unpin all messages").option("--json", "Output as JSON").action(async (chat, messageId, options) => {
  assertWriteEnabled();
  let id;
  if (messageId != null) {
    id = parseInt(messageId, 10);
    if (!Number.isInteger(id)) {
      console.error("Message ID must be a number");
      process.exit(1);
    }
  }
  const spinner2 = spinner(id == null ? `Unpinning all in "${chat}"...` : `Unpinning #${id} in "${chat}"...`).start();
  try {
    const client = await getClient();
    const result2 = await unpinChatMessage(client, chat, id);
    auditLog({ timestamp: new Date().toISOString(), command: "unpin", target: chat, message: id == null ? "(all)" : `#${id}`, result: { success: true } });
    spinner2.stop();
    if (options.json) {
      console.log(formatJson({ chat: result2.chatTitle, messageId: id ?? null, unpinnedAll: result2.all }));
    } else if (result2.all) {
      console.log(colors_default.green(`✓ Unpinned all messages in "${result2.chatTitle}"`));
    } else {
      console.log(colors_default.green(`✓ Unpinned #${id} in "${result2.chatTitle}"`));
    }
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "unpin", target: chat, message: id == null ? "(all)" : `#${id}`, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to unpin");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/edit.ts
var editCommand = new Command("edit").description("Edit one of your own messages").argument("<chat>", "Chat name, username (@user), or ID").argument("<messageId>", "Message ID to edit").argument("<text>", 'New message text, or "-" to read it from stdin').option("--markdown", "Parse the new text as Markdown").option("--html", "Parse the new text as HTML").option("--json", "Output as JSON").action(async (chat, messageId, textArg, options) => {
  assertWriteEnabled();
  const text2 = readTextArg(textArg);
  const id = parseInt(messageId, 10);
  if (!Number.isInteger(id)) {
    console.error("Message ID must be a number");
    process.exit(1);
  }
  const parseMode = options.html ? "html" : options.markdown ? "md" : undefined;
  const spinner2 = spinner(`Editing #${id}...`).start();
  try {
    const client = await getClient();
    const result2 = await editMessageText(client, chat, id, text2, { parseMode });
    auditLog({ timestamp: new Date().toISOString(), command: "edit", target: chat, message: `#${id}`, result: { success: true, messageId: id } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ chat: result2.chatTitle, messageId: result2.id, edited: true }));
    else
      console.log(colors_default.green(`✓ Edited #${id} in "${result2.chatTitle}"`));
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "edit", target: chat, message: `#${id}`, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to edit");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/delete.ts
var deleteCommand = new Command("delete").description("Delete one or more messages").argument("<chat>", "Chat name, username (@user), or ID").argument("<messageIds>", "Message ID, or comma-separated IDs (e.g. 123 or 123,124)").option("--just-me", "Delete only for you (do not revoke for everyone)").option("--json", "Output as JSON").action(async (chat, messageIds, options) => {
  assertWriteEnabled();
  const ids = messageIds.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isInteger(n));
  if (ids.length === 0) {
    console.error("Provide at least one numeric message ID");
    process.exit(1);
  }
  const revoke = !options.justMe;
  const spinner2 = spinner(`Deleting ${ids.length} message(s)...`).start();
  try {
    const client = await getClient();
    const result2 = await deleteChatMessages(client, chat, ids, revoke);
    auditLog({ timestamp: new Date().toISOString(), command: "delete", target: chat, message: `[${ids.join(",")}] revoke=${revoke}`, result: { success: true } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ chat: result2.chatTitle, deleted: ids, revoke }));
    else
      console.log(colors_default.green(`✓ Deleted ${result2.count} message(s) in "${result2.chatTitle}"${revoke ? " (for everyone)" : " (just for you)"}`));
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "delete", target: chat, message: `[${ids.join(",")}]`, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to delete");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/mark-read.ts
var markReadCommand = new Command("mark-read").description("Mark a chat as read (clear its unread badge)").argument("<chat>", "Chat name, username (@user), or ID").option("--json", "Output as JSON").action(async (chat, options) => {
  assertWriteEnabled();
  const spinner2 = spinner(`Marking "${chat}" as read...`).start();
  try {
    const client = await getClient();
    const result2 = await markChatRead(client, chat);
    auditLog({ timestamp: new Date().toISOString(), command: "mark-read", target: chat, result: { success: true } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ chat: result2.chatTitle, read: true }));
    else
      console.log(colors_default.green(`✓ Marked "${result2.chatTitle}" as read`));
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "mark-read", target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to mark read");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/pinned.ts
var pinnedCommand = new Command("pinned").description("List pinned messages in a chat").argument("<chat>", "Chat name, username (@user), or ID").option("-n, --limit <number>", "Max pinned messages to fetch", "20").option("--json", "Output as JSON").option("--markdown", "Output as Markdown").action(async (chat, options) => {
  const spinner2 = spinner(`Fetching pinned messages from "${chat}"...`).start();
  try {
    const client = await getClient();
    const { chatTitle, messages } = await getPinnedMessages(client, chat, parseInt(options.limit, 10));
    spinner2.stop();
    const format = getOutputFormat(options);
    if (format === "json")
      console.log(formatJson({ chatTitle, messages }));
    else if (format === "markdown")
      console.log(formatMessagesMarkdown(messages, `\uD83D\uDCCC ${chatTitle}`));
    else
      console.log(formatMessages(messages, `\uD83D\uDCCC ${chatTitle} (pinned)`));
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to fetch pinned messages");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/poll.ts
var pollCommand = new Command("poll").description("Send a poll to a chat").argument("<chat>", "Chat name, username (@user), or ID").argument("<question>", "Poll question").argument("<options...>", "Answer options (2 or more)").option("--multiple", "Allow selecting multiple answers").option("--quiz", "Quiz mode (requires --correct)").option("--correct <n>", "Index (1-based) of the correct answer for quiz mode").option("--public", "Non-anonymous poll (voters are visible)").option("--json", "Output as JSON").action(async (chat, question, answers, options) => {
  assertWriteEnabled();
  if (answers.length < 2) {
    console.error("A poll needs at least 2 options");
    process.exit(1);
  }
  const correct = options.correct != null ? parseInt(options.correct, 10) - 1 : undefined;
  if (options.quiz && (correct == null || correct < 0 || correct >= answers.length)) {
    console.error("Quiz mode needs a valid --correct <1-based index>");
    process.exit(1);
  }
  const spinner2 = spinner(`Sending poll to "${chat}"...`).start();
  try {
    const client = await getClient();
    const result2 = await sendPoll(client, chat, question, answers, {
      multiple: options.multiple,
      quiz: options.quiz,
      correct,
      anonymous: options.public ? false : undefined
    });
    auditLog({ timestamp: new Date().toISOString(), command: "poll", target: chat, message: question, result: { success: true, messageId: result2.id } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ chat: result2.chatTitle, messageId: result2.id, question, options: answers }));
    else
      console.log(colors_default.green(`✓ Poll sent to "${result2.chatTitle}"${result2.id ? ` (#${result2.id})` : ""}`));
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "poll", target: chat, message: question, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to send poll");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
var voteCommand = new Command("vote").description("Vote in a poll").argument("<chat>", "Chat name, username (@user), or ID").argument("<messageId>", "Poll message ID").argument("<options...>", "Option number(s) to vote for, 1-based (e.g. 2, or 1 3 for multiple)").option("--json", "Output as JSON").action(async (chat, messageId, optionNums, options) => {
  assertWriteEnabled();
  const id = parseInt(messageId, 10);
  if (!Number.isInteger(id)) {
    console.error("Message ID must be a number");
    process.exit(1);
  }
  const indexes = optionNums.map((s) => parseInt(s, 10) - 1).filter((n) => n >= 0);
  if (indexes.length === 0) {
    console.error("Provide at least one 1-based option number");
    process.exit(1);
  }
  const spinner2 = spinner(`Voting in poll #${id}...`).start();
  try {
    const client = await getClient();
    const result2 = await votePoll(client, chat, id, indexes);
    auditLog({ timestamp: new Date().toISOString(), command: "vote", target: chat, message: `#${id} [${indexes.map((i) => i + 1).join(",")}]`, result: { success: true } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ chat: result2.chatTitle, messageId: id, voted: indexes.map((i) => i + 1) }));
    else
      console.log(colors_default.green(`✓ Voted in poll #${id} in "${result2.chatTitle}"`));
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "vote", target: chat, message: `#${id}`, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to vote");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/reactions.ts
var reactionsCommand = new Command("reactions").description("List who reacted to a message and with what").argument("<chat>", "Chat name, username (@user), or ID").argument("<messageId>", "Message ID").option("-n, --limit <number>", "Max reactions to fetch", "50").option("--json", "Output as JSON").action(async (chat, messageId, options) => {
  const id = parseInt(messageId, 10);
  if (!Number.isInteger(id)) {
    console.error("Message ID must be a number");
    process.exit(1);
  }
  const spinner2 = spinner(`Fetching reactions on #${id}...`).start();
  try {
    const client = await getClient();
    const result2 = await getReactionsList(client, chat, id, parseInt(options.limit, 10));
    spinner2.stop();
    if (options.json) {
      console.log(formatJson(result2));
    } else if (result2.reactions.length === 0) {
      console.log(colors_default.gray(`No reactions on #${id} in "${result2.chatTitle}".`));
    } else {
      console.log(colors_default.bold(`Reactions on #${id} in "${result2.chatTitle}":
`));
      for (const r of result2.reactions) {
        console.log(`  ${r.emoji}  ${colors_default.cyan(r.user)}`);
      }
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to fetch reactions");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/block.ts
function makeBlockCommand(name, blocked) {
  return new Command(name).description(blocked ? "Block a user" : "Unblock a user").argument("<user>", "Username (@user), name, or ID").option("--json", "Output as JSON").action(async (user, options) => {
    assertWriteEnabled();
    const spinner2 = spinner(`${blocked ? "Blocking" : "Unblocking"} "${user}"...`).start();
    try {
      const client = await getClient();
      const result2 = await setBlocked(client, user, blocked);
      auditLog({ timestamp: new Date().toISOString(), command: name, target: user, result: { success: true } });
      spinner2.stop();
      if (options.json)
        console.log(formatJson({ user: result2.name, blocked }));
      else
        console.log(colors_default.green(`✓ ${blocked ? "Blocked" : "Unblocked"} "${result2.name}"`));
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: name, target: user, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner2.fail(`Failed to ${name}`);
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
}
var blockCommand = makeBlockCommand("block", true);
var unblockCommand = makeBlockCommand("unblock", false);
// src/commands/contact-manage.ts
var addContactCommand = new Command("add-contact").description("Add a user to your contacts").argument("<user>", "Username (@user) or ID").argument("<firstName>", "First name for the contact").argument("[lastName]", "Last name (optional)").option("--json", "Output as JSON").action(async (user, firstName, lastName, options) => {
  assertWriteEnabled();
  const spinner2 = spinner(`Adding contact "${firstName}"...`).start();
  try {
    const client = await getClient();
    const result2 = await addContact(client, user, firstName, lastName || "");
    auditLog({ timestamp: new Date().toISOString(), command: "add-contact", target: user, result: { success: true } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ contact: result2.name, added: true }));
    else
      console.log(colors_default.green(`✓ Added contact "${result2.name}"`));
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "add-contact", target: user, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to add contact");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
var delContactCommand = new Command("del-contact").description("Remove a user from your contacts").argument("<user>", "Username (@user), name, or ID").option("--json", "Output as JSON").action(async (user, options) => {
  assertWriteEnabled();
  const spinner2 = spinner(`Removing contact "${user}"...`).start();
  try {
    const client = await getClient();
    const result2 = await deleteContact(client, user);
    auditLog({ timestamp: new Date().toISOString(), command: "del-contact", target: user, result: { success: true } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ contact: result2.name, removed: true }));
    else
      console.log(colors_default.green(`✓ Removed contact "${result2.name}"`));
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "del-contact", target: user, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to remove contact");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/membership.ts
var joinCommand = new Command("join").description("Join a channel/group by @username or invite link").argument("<target>", "@username, t.me link, or invite link (t.me/+hash)").option("--json", "Output as JSON").action(async (target, options) => {
  assertWriteEnabled();
  const spinner2 = spinner(`Joining "${target}"...`).start();
  try {
    const client = await getClient();
    const result2 = await joinChat(client, target);
    auditLog({ timestamp: new Date().toISOString(), command: "join", target, result: { success: true } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ joined: result2.title }));
    else
      console.log(colors_default.green(`✓ Joined "${result2.title}"`));
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "join", target, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to join");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
var leaveCommand = new Command("leave").description("Leave a group or channel").argument("<chat>", "Chat name, username (@user), or ID").option("--json", "Output as JSON").action(async (chat, options) => {
  assertWriteEnabled();
  const spinner2 = spinner(`Leaving "${chat}"...`).start();
  try {
    const client = await getClient();
    const result2 = await leaveChat(client, chat);
    auditLog({ timestamp: new Date().toISOString(), command: "leave", target: chat, result: { success: true } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ left: result2.title }));
    else
      console.log(colors_default.green(`✓ Left "${result2.title}"`));
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "leave", target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to leave");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
var inviteLinkCommand = new Command("invite-link").description("Export (or generate) the invite link for a chat").argument("<chat>", "Chat name, username (@user), or ID").option("--json", "Output as JSON").action(async (chat, options) => {
  assertWriteEnabled();
  const spinner2 = spinner(`Getting invite link for "${chat}"...`).start();
  try {
    const client = await getClient();
    const result2 = await exportInviteLink(client, chat);
    auditLog({ timestamp: new Date().toISOString(), command: "invite-link", target: chat, result: { success: true } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ chat: result2.title, link: result2.link }));
    else
      console.log(`${colors_default.bold(result2.title)}: ${colors_default.blue(result2.link)}`);
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "invite-link", target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to get invite link");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
function makeArchiveCommand(name, archived) {
  return new Command(name).description(archived ? "Archive a chat" : "Unarchive a chat").argument("<chat>", "Chat name, username (@user), or ID").option("--json", "Output as JSON").action(async (chat, options) => {
    assertWriteEnabled();
    const spinner2 = spinner(`${archived ? "Archiving" : "Unarchiving"} "${chat}"...`).start();
    try {
      const client = await getClient();
      const result2 = await setArchived(client, chat, archived);
      auditLog({ timestamp: new Date().toISOString(), command: name, target: chat, result: { success: true } });
      spinner2.stop();
      if (options.json)
        console.log(formatJson({ chat: result2.title, archived }));
      else
        console.log(colors_default.green(`✓ ${archived ? "Archived" : "Unarchived"} "${result2.title}"`));
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: name, target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner2.fail(`Failed to ${name}`);
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
}
var archiveCommand = makeArchiveCommand("archive", true);
var unarchiveCommand = makeArchiveCommand("unarchive", false);
// src/commands/create.ts
var createGroupCommand = new Command("create-group").description("Create a new group with members").argument("<title>", "Group title").argument("<users...>", "Users to add (@username or ID), at least one").option("--json", "Output as JSON").action(async (title, users, options) => {
  assertWriteEnabled();
  const spinner2 = spinner(`Creating group "${title}"...`).start();
  try {
    const client = await getClient();
    const result2 = await createGroup(client, title, users);
    auditLog({ timestamp: new Date().toISOString(), command: "create-group", target: title, result: { success: true } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ title: result2.title, id: result2.id }));
    else
      console.log(colors_default.green(`✓ Created group "${result2.title}"${result2.id ? ` (id ${result2.id})` : ""}`));
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "create-group", target: title, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to create group");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
var createChannelCommand = new Command("create-channel").description("Create a new channel or supergroup").argument("<title>", "Channel/supergroup title").option("-a, --about <text>", "Description", "").option("--broadcast", "Create a broadcast channel (default: supergroup)").option("--json", "Output as JSON").action(async (title, options) => {
  assertWriteEnabled();
  const spinner2 = spinner(`Creating ${options.broadcast ? "channel" : "supergroup"} "${title}"...`).start();
  try {
    const client = await getClient();
    const result2 = await createChannel(client, title, options.about, { broadcast: options.broadcast });
    auditLog({ timestamp: new Date().toISOString(), command: "create-channel", target: title, result: { success: true } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ title: result2.title, id: result2.id, broadcast: !!options.broadcast }));
    else
      console.log(colors_default.green(`✓ Created "${result2.title}"${result2.id ? ` (id ${result2.id})` : ""}`));
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "create-channel", target: title, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to create channel");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/typing.ts
var ACTIONS = ["typing", "photo", "video", "audio", "document", "cancel"];
var typingCommand = new Command("typing").description('Show a "typing…" (or uploading) status in a chat').argument("<chat>", "Chat name, username (@user), or ID").argument("[action]", `One of: ${ACTIONS.join(", ")}`, "typing").option("--json", "Output as JSON").action(async (chat, action, options) => {
  assertWriteEnabled();
  if (!ACTIONS.includes(action)) {
    console.error(`Action must be one of: ${ACTIONS.join(", ")}`);
    process.exit(1);
  }
  const spinner2 = spinner(`Sending "${action}" status to "${chat}"...`).start();
  try {
    const client = await getClient();
    const result2 = await sendTyping(client, chat, action);
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ chat: result2.title, action }));
    else
      console.log(colors_default.green(`✓ Sent "${action}" status to "${result2.title}"`));
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to send status");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/profile.ts
var import_fs5 = require("fs");
var import_path4 = require("path");
var setNameCommand = new Command("set-name").description("Update your own first (and optional last) name").argument("<firstName>", "New first name").argument("[lastName]", "New last name (optional)").option("--json", "Output as JSON").action(async (firstName, lastName, options) => {
  assertWriteEnabled();
  const spinner2 = spinner("Updating name...").start();
  try {
    const client = await getClient();
    await updateProfile(client, { firstName, lastName: lastName ?? "" });
    auditLog({ timestamp: new Date().toISOString(), command: "set-name", target: "me", result: { success: true } });
    spinner2.stop();
    const name = [firstName, lastName].filter(Boolean).join(" ");
    if (options.json)
      console.log(formatJson({ firstName, lastName: lastName ?? "" }));
    else
      console.log(colors_default.green(`✓ Name updated to "${name}"`));
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to update name");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
var setBioCommand = new Command("set-bio").description("Update your own bio / about text").argument("<text>", "New bio text").option("--json", "Output as JSON").action(async (text2, options) => {
  assertWriteEnabled();
  const spinner2 = spinner("Updating bio...").start();
  try {
    const client = await getClient();
    await updateProfile(client, { about: text2 });
    auditLog({ timestamp: new Date().toISOString(), command: "set-bio", target: "me", result: { success: true } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ about: text2 }));
    else
      console.log(colors_default.green("✓ Bio updated"));
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to update bio");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
var setUsernameCommand = new Command("set-username").description("Update your own @username").argument("<username>", "New username (without @)").option("--json", "Output as JSON").action(async (username, options) => {
  assertWriteEnabled();
  const clean = username.replace(/^@/, "");
  const spinner2 = spinner(`Setting username to @${clean}...`).start();
  try {
    const client = await getClient();
    await updateUsername(client, clean);
    auditLog({ timestamp: new Date().toISOString(), command: "set-username", target: clean, result: { success: true } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ username: clean }));
    else
      console.log(colors_default.green(`✓ Username set to @${clean}`));
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to set username");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
var setAvatarCommand = new Command("set-avatar").description("Set your own profile photo from an image file").argument("<path>", "Path to an image file").option("--json", "Output as JSON").action(async (path2, options) => {
  assertWriteEnabled();
  const filePath = import_path4.resolve(path2);
  if (!import_fs5.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const spinner2 = spinner("Uploading profile photo...").start();
  try {
    const client = await getClient();
    await setProfilePhoto(client, filePath);
    auditLog({ timestamp: new Date().toISOString(), command: "set-avatar", target: filePath, result: { success: true } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ avatar: filePath, updated: true }));
    else
      console.log(colors_default.green("✓ Profile photo updated"));
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to set profile photo");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/avatar.ts
var import_path5 = require("path");
var avatarCommand = new Command("avatar").description("Download a user's or chat's profile photo").argument("<chat>", "Chat name, username (@user), or ID").option("-o, --output <dir>", "Output directory", ".").option("--json", "Output as JSON").action(async (chat, options) => {
  const outputDir = import_path5.resolve(options.output);
  const spinner2 = spinner(`Downloading avatar for "${chat}"...`).start();
  try {
    const client = await getClient();
    const result2 = await downloadAvatar(client, chat, outputDir);
    spinner2.stop();
    if (!result2.filePath) {
      console.log(colors_default.gray(`"${result2.title}" has no profile photo (or it is not accessible).`));
    } else if (options.json) {
      console.log(formatJson({ chat: result2.title, filePath: result2.filePath }));
    } else {
      console.log(colors_default.green(`✓ Saved avatar of "${result2.title}" → ${result2.filePath}`));
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to download avatar");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/inline.ts
var inlineCommand = new Command("inline").description('Query an inline bot (like typing "@bot query" in Telegram)').argument("<bot>", "Inline bot username (@bot)").argument("<query>", "The inline query text").option("-n, --limit <number>", "Max results to show", "20").option("--json", "Output as JSON").action(async (bot, query, options) => {
  const spinner2 = spinner(`Querying ${bot} "${query}"...`).start();
  try {
    const client = await getClient();
    const result2 = await queryInlineBot(client, bot, query, parseInt(options.limit, 10));
    spinner2.stop();
    if (options.json) {
      console.log(formatJson(result2));
    } else if (result2.results.length === 0) {
      console.log(colors_default.gray("No inline results."));
    } else {
      console.log(colors_default.bold(`${result2.results.length} inline result(s):
`));
      for (const r of result2.results) {
        const title = r.title || colors_default.gray("(untitled)");
        const desc = r.description ? colors_default.gray(` — ${r.description}`) : "";
        console.log(`  ${colors_default.cyan(title)}${desc} ${colors_default.gray(`[${r.type}]`)}`);
      }
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to query inline bot");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/stories.ts
var storiesCommand = new Command("stories").description("List a user's currently active stories").argument("<user>", "Username (@user), name, or ID").option("--json", "Output as JSON").action(async (user, options) => {
  const spinner2 = spinner(`Fetching stories for "${user}"...`).start();
  try {
    const client = await getClient();
    const result2 = await getUserStories(client, user);
    spinner2.stop();
    if (options.json) {
      console.log(formatJson(result2));
    } else if (result2.stories.length === 0) {
      console.log(colors_default.gray(`"${result2.name}" has no active stories.`));
    } else {
      console.log(colors_default.bold(`${result2.stories.length} active story/stories from "${result2.name}":
`));
      for (const s of result2.stories) {
        const cap2 = s.caption ? ` — ${s.caption}` : "";
        console.log(`  ${colors_default.gray(s.date.toLocaleString())}  #${s.id}${cap2}`);
      }
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to fetch stories");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/watch.ts
var import_teleproto5 = __toESM(require_teleproto(), 1);
var import_events = __toESM(require_events(), 1);
var watchCommand = new Command("watch").description("Stream new incoming messages in real time (until timeout / limit / Ctrl-C)").argument("[chat]", "Restrict to one chat (name, @user, or ID). Omit to watch everything.").option("-t, --timeout <seconds>", "Stop after N seconds").option("-n, --limit <number>", "Stop after N messages").option("--full", "Include full per-message stats (views, forwards, reactions, flags, media detail)").option("--stats", "Alias for --full").option("--json", "Emit each message as a JSON line").action(async (chat, options) => {
  const full = Boolean(options.full || options.stats);
  const timeoutSec = options.timeout ? parseInt(options.timeout, 10) : undefined;
  const limit = options.limit ? parseInt(options.limit, 10) : undefined;
  const spinner2 = spinner("Connecting...").start();
  try {
    const client = await getClient();
    let chatFilter;
    if (chat) {
      const entity = await resolveChat(client, chat);
      chatFilter = [entity.id.toString()];
    }
    spinner2.stop();
    console.error(colors_default.gray(`Watching${chat ? ` "${chat}"` : " all chats"}${timeoutSec ? ` for ${timeoutSec}s` : ""}${limit ? `, up to ${limit} message(s)` : ""}. Press Ctrl-C to stop.
`));
    let count = 0;
    await new Promise((resolvePromise) => {
      let timer;
      const finish = () => {
        if (timer)
          clearTimeout(timer);
        client.removeEventHandler(handler, event);
        resolvePromise();
      };
      const event = new import_events.NewMessage(chatFilter ? { chats: chatFilter } : {});
      const handler = async (e) => {
        const msg = e.message;
        if (!(msg instanceof import_teleproto5.Api.Message))
          return;
        count += 1;
        let sender = "Unknown";
        try {
          const s = await msg.getSender();
          if (s instanceof import_teleproto5.Api.User)
            sender = s.firstName || s.username || s.id.toString();
          else if (s instanceof import_teleproto5.Api.Channel || s instanceof import_teleproto5.Api.Chat)
            sender = s.title;
        } catch {}
        const stats = full ? buildMessageFull(msg) : undefined;
        if (options.json) {
          console.log(JSON.stringify({ id: msg.id, chatId: msg.chatId?.toString(), sender, text: messageText(msg), date: new Date(msg.date * 1000).toISOString(), ...stats ? { full: stats } : {} }));
        } else {
          const time = new Date(msg.date * 1000).toLocaleTimeString();
          const suffix2 = stats ? colors_default.gray(formatStatsSuffix(stats)) : "";
          console.log(`${colors_default.gray(time)} ${colors_default.cyan(sender)}: ${messageText(msg) || colors_default.gray("(no text)")}${suffix2} ${colors_default.gray(`#${msg.id}`)}`);
        }
        if (limit && count >= limit)
          finish();
      };
      client.addEventHandler(handler, event);
      if (timeoutSec)
        timer = setTimeout(finish, timeoutSec * 1000);
    });
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Watch failed");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/info.ts
function fail(spinner2, what, error) {
  spinner2.fail(what);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
var infoCommand = new Command("info").description("Show details of a chat, group, channel, user or bot (members, about, linked chat, forum)").argument("<chat>", 'Chat name, @username, numeric ID, or "me"').option("--json", "Output as JSON").action(async (chat, options) => {
  const spinner2 = spinner(`Fetching info for "${chat}"...`).start();
  try {
    const client = await getClient();
    const info = await getChatInfo(client, chat);
    spinner2.stop();
    if (options.json) {
      console.log(formatJson(info));
    } else {
      for (const [k, v] of Object.entries(info)) {
        if (v !== undefined && v !== "")
          console.log(`${k}: ${String(v).replace(/\n/g, " ")}`);
      }
    }
    await disconnectClient();
  } catch (error) {
    fail(spinner2, "Failed to fetch chat info", error);
  }
});
var topicsCommand = new Command("topics").description("List forum topics of a forum supergroup (use the ID with read/send --topic)").argument("<chat>", "Forum supergroup name, @username or ID").option("-q, --query <text>", "Only topics whose title matches").option("-n, --limit <number>", "Maximum topics", "100").option("--json", "Output as JSON").action(async (chat, options) => {
  const spinner2 = spinner(`Fetching topics of "${chat}"...`).start();
  try {
    const client = await getClient();
    const res = await getForumTopics(client, chat, { limit: parseInt(options.limit), query: options.query });
    spinner2.stop();
    if (options.json) {
      console.log(formatJson(res));
    } else {
      console.log(`# ${res.chatTitle}`);
      for (const t of res.topics) {
        const flags = [t.pinned ? "pinned" : "", t.closed ? "closed" : ""].filter(Boolean).join(",");
        console.log(`${t.id}${flags ? " " + flags : ""}${t.unread ? ` unread=${t.unread}` : ""} ${t.title}`);
      }
    }
    await disconnectClient();
  } catch (error) {
    fail(spinner2, "Failed to fetch topics", error);
  }
});
var linkCommand = new Command("link").description("Get the t.me link to a message in a channel or supergroup").argument("<chat>", "Channel/supergroup name, @username or ID").argument("<messageId>", "Message ID").option("--thread", "Link to the message inside its comments thread").option("--json", "Output as JSON").action(async (chat, messageId, options) => {
  const spinner2 = spinner("Exporting link...").start();
  try {
    const client = await getClient();
    const link = await getMessageLink(client, chat, parseInt(messageId), { thread: options.thread });
    spinner2.stop();
    console.log(options.json ? formatJson({ link }) : link);
    await disconnectClient();
  } catch (error) {
    fail(spinner2, "Failed to get link", error);
  }
});
// src/commands/contacts.ts
var contactsCommand = new Command("contacts").description("List your contacts").option("-q, --query <text>", "Only contacts whose name, @username or phone matches").option("-n, --limit <number>", "Maximum contacts to show", "200").option("--json", "Output as JSON").action(async (options) => {
  const spinner2 = spinner("Fetching contacts...").start();
  try {
    const client = await getClient();
    const rows = (await listContacts(client, options.query)).slice(0, parseInt(options.limit));
    spinner2.stop();
    if (options.json) {
      console.log(formatJson(rows));
    } else {
      for (const r of rows) {
        console.log(`${r.id} ${r.name}${r.username ? ` @${r.username}` : ""}${r.phone ? ` +${r.phone}` : ""}${r.mutual ? " mutual" : ""}`);
      }
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to fetch contacts");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/update.ts
var updateCommand = new Command("update").description("Better-TG-CLI inside the Claude plugin is updated by Claude Code").option("--check", "Only report whether a newer version exists").option("--json", "Output as JSON (with --check)").action(() => {
  console.error("This copy of telegram is the one bundled with the Claude plugin, and Claude Code updates it with the plugin (/plugin). To use the CLI on its own, install it as the README says.");
  process.exit(1);
});
// src/skill-install.ts
var import_node_fs11 = require("node:fs");
var import_node_os7 = require("node:os");
var import_node_path12 = require("node:path");

// src/skill-files.ts
var import_node_fs10 = require("node:fs");
var import_node_path11 = require("node:path");
function pluginSkill() {
  const dir = import_node_path11.join(import_node_path11.dirname(process.argv[1] ?? ""), "..", "skills", "better-tg-cli");
  try {
    return Object.fromEntries(import_node_fs10.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((f) => [f, import_node_fs10.readFileSync(import_node_path11.join(dir, f), "utf8")]));
  } catch {
    return {};
  }
}
var SKILL_FILES = pluginSkill();

// src/skill-install.ts
var SKILL_NAME = "better-tg-cli";
var envDir = (env, key, fallback) => env[key]?.trim() || fallback;
function knownAgents(home = import_node_os7.homedir(), env = process.env) {
  const config = envDir(env, "XDG_CONFIG_HOME", import_node_path12.join(home, ".config"));
  const claude = envDir(env, "CLAUDE_CONFIG_DIR", import_node_path12.join(home, ".claude"));
  const codex = envDir(env, "CODEX_HOME", import_node_path12.join(home, ".codex"));
  const grok = envDir(env, "GROK_HOME", import_node_path12.join(home, ".grok"));
  const agent = (id, name, dir, skillsDir = import_node_path12.join(dir, "skills")) => ({ id, name, home: dir, skillsDir });
  return [
    agent("claude-code", "Claude Code", claude),
    agent("codex", "Codex", codex),
    agent("cursor", "Cursor", import_node_path12.join(home, ".cursor")),
    agent("gemini-cli", "Gemini CLI", import_node_path12.join(home, ".gemini")),
    agent("github-copilot", "GitHub Copilot", import_node_path12.join(home, ".copilot")),
    agent("grok", "Grok Build", grok),
    agent("opencode", "OpenCode", import_node_path12.join(config, "opencode")),
    agent("goose", "Goose", import_node_path12.join(config, "goose")),
    agent("droid", "Droid (Factory)", import_node_path12.join(home, ".factory")),
    agent("windsurf", "Windsurf", import_node_path12.join(home, ".codeium", "windsurf")),
    agent("pi", "Pi", import_node_path12.join(home, ".pi", "agent"))
  ];
}
function lstat(path2) {
  try {
    return import_node_fs11.lstatSync(path2);
  } catch {
    return;
  }
}
function isOurFolder(path2) {
  try {
    return /^name:\s*better-tg-cli\s*$/m.test(import_node_fs11.readFileSync(import_node_path12.join(path2, "SKILL.md"), "utf8"));
  } catch {
    return false;
  }
}
function skillState(path2) {
  const st = lstat(path2);
  if (!st)
    return { kind: "missing" };
  if (st.isSymbolicLink())
    return { kind: "linked", target: import_node_fs11.readlinkSync(path2) };
  if (!st.isDirectory() || !isOurFolder(path2))
    return { kind: "foreign" };
  const same = Object.entries(SKILL_FILES).every(([file, content]) => {
    try {
      return import_node_fs11.readFileSync(import_node_path12.join(path2, file), "utf8") === content;
    } catch {
      return false;
    }
  });
  return { kind: same ? "installed" : "outdated" };
}
function agentStatus(agent) {
  const path2 = import_node_path12.join(agent.skillsDir, SKILL_NAME);
  return { agent, detected: import_node_fs11.existsSync(agent.home), path: path2, state: skillState(path2) };
}
function selectAgents(ids, agents) {
  if (!ids?.length)
    return agents.filter((a) => import_node_fs11.existsSync(a.home));
  const unknown = ids.filter((id) => !agents.some((a) => a.id === id));
  if (unknown.length) {
    throw new Error(`Unknown agent: ${unknown.join(", ")}. Known: ${agents.map((a) => a.id).join(", ")}`);
  }
  return agents.filter((a) => ids.includes(a.id));
}
function installSkill(agent, options = {}) {
  const path2 = import_node_path12.join(agent.skillsDir, SKILL_NAME);
  const state = skillState(path2);
  if (state.kind === "installed")
    return { agent, path: path2, action: "unchanged" };
  if (state.kind === "linked") {
    if (!options.force)
      return { agent, path: path2, action: "skipped", reason: `symlink to ${state.target}; --force replaces the link with a copy` };
    import_node_fs11.unlinkSync(path2);
  }
  if (state.kind === "foreign")
    return { agent, path: path2, action: "skipped", reason: "something else lives there; not touching it" };
  import_node_fs11.mkdirSync(path2, { recursive: true });
  for (const [file, content] of Object.entries(SKILL_FILES))
    import_node_fs11.writeFileSync(import_node_path12.join(path2, file), content);
  return { agent, path: path2, action: state.kind === "outdated" ? "updated" : "installed" };
}
function uninstallSkill(agent, options = {}) {
  const path2 = import_node_path12.join(agent.skillsDir, SKILL_NAME);
  const state = skillState(path2);
  if (state.kind === "missing")
    return { agent, path: path2, action: "absent" };
  if (state.kind === "linked") {
    if (!options.force)
      return { agent, path: path2, action: "skipped", reason: `symlink to ${state.target}; --force removes the link` };
    import_node_fs11.unlinkSync(path2);
    return { agent, path: path2, action: "removed" };
  }
  if (state.kind === "foreign")
    return { agent, path: path2, action: "skipped", reason: "not a better-tg-cli skill folder; not touching it" };
  import_node_fs11.rmSync(path2, { recursive: true, force: true });
  return { agent, path: path2, action: "removed" };
}

// src/commands/skill.ts
var OTHER_AGENTS = "Other agents: npx skills add TheVilfer/better-tg-cli";
function pick(ids) {
  try {
    return selectAgents(ids, knownAgents());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}
var install = new Command("install").description("Install the better-tg-cli skill for coding agents (default: every agent found on this machine)").option("-a, --agent <ids...>", "Only these agents (see `telegram skill status`)").option("--force", "Replace a symlinked skill folder with a copy (the link target is never touched)").option("--json", "Output as JSON").action((options) => {
  const agents = pick(options.agent);
  if (!agents.length) {
    console.error(`No supported agents found. ${OTHER_AGENTS}`);
    process.exit(1);
  }
  const results = agents.map((a) => installSkill(a, { force: options.force }));
  if (options.json) {
    console.log(formatJson(results.map((r) => ({ agent: r.agent.id, path: r.path, action: r.action, reason: r.reason }))));
    return;
  }
  for (const r of results) {
    console.log(`${r.agent.name.padEnd(16)} ${r.action}${r.reason ? ` (${r.reason})` : ""}  ${r.path}`);
  }
  console.log(`
Restart running agents to pick it up. ${OTHER_AGENTS}`);
});
var status = new Command("status").description("Show where the skill is installed, linked or outdated for each supported agent").option("--json", "Output as JSON").action((options) => {
  const rows = knownAgents().map(agentStatus);
  if (options.json) {
    console.log(formatJson(rows.map((r) => ({ agent: r.agent.id, name: r.agent.name, detected: r.detected, path: r.path, ...r.state }))));
    return;
  }
  for (const r of rows) {
    const state = r.state.kind === "linked" ? `linked → ${r.state.target}` : r.state.kind;
    console.log(`${r.agent.id.padEnd(15)} ${(r.detected ? state : `${state}, agent not found`).padEnd(28)} ${r.path}`);
  }
});
var uninstall = new Command("uninstall").description("Remove the skill from coding agents (default: every agent found on this machine)").option("-a, --agent <ids...>", "Only these agents").option("--force", "Also remove symlinked skill folders (the link only)").option("--json", "Output as JSON").action((options) => {
  const results = pick(options.agent).map((a) => uninstallSkill(a, { force: options.force }));
  if (options.json) {
    console.log(formatJson(results.map((r) => ({ agent: r.agent.id, path: r.path, action: r.action, reason: r.reason }))));
    return;
  }
  for (const r of results) {
    console.log(`${r.agent.name.padEnd(16)} ${r.action}${r.reason ? ` (${r.reason})` : ""}  ${r.path}`);
  }
});
var skillCommand = new Command("skill").description("Install the agent skill into Claude Code, Codex, Cursor, Gemini CLI and other coding agents").addCommand(install).addCommand(status).addCommand(uninstall);
// src/commands/api.ts
init_api_methods();

// src/api-run.ts
init_api_methods();
async function runApiMethod(canonical, params, options = {}) {
  const auditCommand = options.auditCommand ?? "api";
  const refusal = apiRefusalReason(canonical, params);
  if (refusal) {
    console.error(colors_default.red(refusal));
    process.exit(1);
  }
  const isWrite = !isApiReadMethod(canonical);
  if (isWrite)
    assertWriteEnabled();
  const spinner2 = spinner(`Calling ${canonical}...`).start();
  try {
    const client = await getClient();
    const result2 = await invokeApi(client, canonical, params);
    spinner2.stop();
    if (isWrite) {
      auditLog({ timestamp: new Date().toISOString(), command: auditCommand, target: canonical, result: { success: true } });
    }
    console.log(serializeApiResult(result2));
    await disconnectClient();
  } catch (error) {
    if (isWrite) {
      auditLog({ timestamp: new Date().toISOString(), command: auditCommand, target: canonical, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    }
    spinner2.fail(`${canonical} failed`);
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// src/commands/api.ts
var apiCommand = new Command("api").description("Call any raw Telegram TL method (full API reachability; output is JSON)").argument("<method>", 'TL method, e.g. "messages.GetHistory", "help.GetConfig" (case-insensitive)').option("-p, --params <json>", 'Request parameters as a JSON object; "-" reads JSON from stdin', "{}").option("--write", "Acknowledge this is a write (optional; writes still need write access)").addHelpText("after", [
  "",
  "Peer/byte fields:",
  '  {"_chat": "<id|@user|title|me>"}  resolve a chat as other commands do',
  '  {"_base64": "…"} / {"_hex": "…"}  raw bytes',
  "Other entity-like fields also accept a bare @username or ID (resolved on send).",
  "",
  "Read methods (Get*/Check*/Search*/Resolve*) run without write access; everything else is a",
  "write and needs `telegram write-access on`. Paying, account deletion, session termination,",
  "2FA changes and sharing your location are always refused.",
  "",
  "Every method also has a typed top-level command: `telegram <namespace> <method>` (e.g.",
  "`telegram messages get-all-drafts`). Use `api` for scripted JSON params, the typed command",
  "for a command line. Run `telegram <namespace> --help` to list a namespace.",
  "",
  "Examples:",
  "  telegram api help.GetConfig",
  "  telegram api messages.GetAllDrafts",
  `  telegram api channels.GetAdminLog --params '{"channel":{"_chat":"My Group"},"limit":20,"q":""}'`
].join(`
`)).action(async (method, options) => {
  let parsed;
  let canonical;
  try {
    const resolved = resolveApiMethod(method);
    canonical = resolved.className;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
  const raw = options.params === "-" ? readStdinOnce() : options.params;
  try {
    parsed = raw.trim() ? JSON.parse(raw) : {};
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("params must be a JSON object");
    }
  } catch (error) {
    console.error(`Invalid --params JSON: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
  await runApiMethod(canonical, parsed, { auditCommand: "api" });
});
// src/commands/drafts.ts
var draftsCommand = new Command("drafts").description("List saved but unsent message drafts across chats").option("--json", "Output as JSON").action(async (options) => {
  const spinner2 = spinner("Fetching drafts...").start();
  try {
    const client = await getClient();
    const drafts = await getDrafts(client);
    spinner2.stop();
    if (getOutputFormat(options) === "json") {
      console.log(formatJson({ drafts }));
    } else if (!drafts.length) {
      console.log(colors_default.gray("No drafts."));
    } else {
      for (const d of drafts) {
        console.log(`${colors_default.cyan(d.chatTitle)}${d.replyToMsgId ? colors_default.gray(` ↩#${d.replyToMsgId}`) : ""}`);
        console.log(`  ${d.text}`);
      }
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to fetch drafts");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/admin-log.ts
var adminLogCommand = new Command("admin-log").description("Recent admin actions in a supergroup or channel (the 'recent actions' log)").argument("<chat>", "Chat name, username (@user), or ID").option("-n, --limit <number>", "Max entries to fetch", "50").option("-q, --query <text>", "Only entries mentioning this text").option("--json", "Output as JSON").action(async (chat, options) => {
  const spinner2 = spinner(`Fetching admin log for "${chat}"...`).start();
  try {
    const client = await getClient();
    const { chatTitle, entries } = await getAdminLog(client, chat, { limit: parseInt(options.limit, 10), query: options.query });
    spinner2.stop();
    if (getOutputFormat(options) === "json") {
      console.log(formatJson({ chatTitle, entries }));
    } else if (!entries.length) {
      console.log(colors_default.gray(`No admin-log entries for "${chatTitle}".`));
    } else {
      console.log(colors_default.bold(`Admin log — ${chatTitle}`));
      for (const e of entries) {
        const when = e.date.toLocaleString();
        console.log(`${colors_default.gray(when)}  ${colors_default.cyan(e.user)}  ${e.action}${e.detail ? colors_default.gray(`  ${e.detail}`) : ""}`);
      }
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to fetch admin log");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/profile-photos.ts
var profilePhotosCommand = new Command("profile-photos").description("List a user's profile photos (use `avatar` to download one)").argument("<user>", 'User name, username (@user), ID, or "me"').option("-n, --limit <number>", "Max photos to list", "50").option("--json", "Output as JSON").action(async (user, options) => {
  const spinner2 = spinner(`Fetching profile photos for "${user}"...`).start();
  try {
    const client = await getClient();
    const { title, count, photos } = await getProfilePhotos(client, user, { limit: parseInt(options.limit, 10) });
    spinner2.stop();
    if (getOutputFormat(options) === "json") {
      console.log(formatJson({ user: title, count, photos }));
    } else if (!photos.length) {
      console.log(colors_default.gray(`"${title}" has no profile photos.`));
    } else {
      console.log(colors_default.bold(`${title} — ${count} profile photo${count === 1 ? "" : "s"}`));
      for (const p of photos) {
        console.log(`  ${colors_default.gray(p.date.toLocaleDateString())}  id ${p.id}${p.dcId ? colors_default.gray(` (dc${p.dcId})`) : ""}`);
      }
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to fetch profile photos");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/dialog.ts
function makePinCommand(name, pinned) {
  return new Command(name).description(pinned ? "Pin a chat to the top of the dialog list" : "Unpin a chat from the top of the dialog list").argument("<chat>", "Chat name, username (@user), or ID").option("--json", "Output as JSON").action(async (chat, options) => {
    assertWriteEnabled();
    const spinner2 = spinner(`${pinned ? "Pinning" : "Unpinning"} "${chat}"...`).start();
    try {
      const client = await getClient();
      const { title } = await toggleDialogPin(client, chat, pinned);
      auditLog({ timestamp: new Date().toISOString(), command: name, target: chat, result: { success: true } });
      spinner2.stop();
      if (options.json)
        console.log(formatJson({ chat: title, pinned }));
      else
        console.log(colors_default.green(`✓ ${pinned ? "Pinned" : "Unpinned"} "${title}"`));
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: name, target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner2.fail(`Failed to ${pinned ? "pin" : "unpin"} chat`);
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
}
var pinChatCommand = makePinCommand("pin-chat", true);
var unpinChatCommand = makePinCommand("unpin-chat", false);
var markUnreadCommand = new Command("mark-unread").description("Mark a chat as unread (or clear that with --read)").argument("<chat>", "Chat name, username (@user), or ID").option("--read", "Clear the unread mark instead of setting it").option("--json", "Output as JSON").action(async (chat, options) => {
  assertWriteEnabled();
  const unread = !options.read;
  const spinner2 = spinner(`Marking "${chat}" ${unread ? "unread" : "read"}...`).start();
  try {
    const client = await getClient();
    const { title } = await markDialogUnread(client, chat, unread);
    auditLog({ timestamp: new Date().toISOString(), command: "mark-unread", target: chat, result: { success: true } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ chat: title, unread }));
    else
      console.log(colors_default.green(`✓ Marked "${title}" ${unread ? "unread" : "read"}`));
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "mark-unread", target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to mark the chat");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
var deleteDialogCommand = new Command("delete-dialog").description("Delete a conversation: clears a private/basic-group history, or leaves a supergroup/channel").argument("<chat>", "Chat name, username (@user), or ID").option("--revoke", "In a private chat, also delete the messages for the other person").option("--json", "Output as JSON").action(async (chat, options) => {
  assertWriteEnabled();
  const spinner2 = spinner(`Deleting dialog "${chat}"...`).start();
  try {
    const client = await getClient();
    const { title, left } = await deleteDialog(client, chat, { revoke: options.revoke });
    auditLog({ timestamp: new Date().toISOString(), command: "delete-dialog", target: chat, result: { success: true } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson({ chat: title, left, revoked: options.revoke || undefined }));
    else
      console.log(colors_default.green(`✓ ${left ? "Left" : "Deleted the conversation with"} "${title}"`));
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "delete-dialog", target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to delete the dialog");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/permissions.ts
var permissionsCommand = new Command("permissions").description("Show a member's rights in a group/channel, or the chat's default permissions").argument("<chat>", "Supergroup or channel name, username (@chat), or ID").argument("[user]", "User to inspect; omit for the chat default permissions").option("--json", "Output as JSON").action(async (chat, user, options) => {
  const spinner2 = spinner(`Fetching permissions for "${chat}"...`).start();
  try {
    const client = await getClient();
    const info = await getPermissions(client, chat, user);
    spinner2.stop();
    if (getOutputFormat(options) === "json") {
      console.log(formatJson(info));
    } else {
      const who = info.user ? `${info.user} in "${info.chatTitle}"` : `"${info.chatTitle}" default`;
      console.log(`${colors_default.bold(who)}: ${colors_default.cyan(info.status)}`);
      if (info.adminRights?.length)
        console.log(`  admin: ${info.adminRights.join(", ")}`);
      if (info.restrictions?.length)
        console.log(`  denied: ${info.restrictions.join(", ")}`);
      else if (info.status === "default")
        console.log(colors_default.gray("  no restrictions (members may do everything)"));
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to fetch permissions");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/stats.ts
function abbrev(n) {
  if (n < 1000)
    return String(n);
  if (n < 1e6)
    return `${(n / 1000).toFixed(n >= 1e4 ? 0 : 1)}k`;
  return `${(n / 1e6).toFixed(1)}M`;
}
function val(v) {
  if (!v)
    return "—";
  const delta = v.previous !== undefined && v.previous !== v.current ? colors_default.gray(` (was ${abbrev(v.previous)})`) : "";
  return `${abbrev(v.current)}${delta}`;
}
function graphsLine(graphs) {
  if (!graphs?.length)
    return [];
  const ok = graphs.filter((g) => !g.error).map((g) => g.name);
  const err = graphs.filter((g) => g.error).map((g) => `${g.name}:${g.error}`);
  const lines = [colors_default.gray(`  graphs: ${ok.join(", ") || "none"}`)];
  if (err.length)
    lines.push(colors_default.gray(`  graph errors: ${err.join("; ")}`));
  return lines;
}
function printMessageStats(s, which) {
  console.log(colors_default.bold(`${s.chatTitle} — ${which}`));
  if (s.views !== undefined)
    console.log(`  views: ${abbrev(s.views)}`);
  if (s.forwards !== undefined)
    console.log(`  forwards: ${s.forwards}`);
  if (s.publicForwardsCount !== undefined)
    console.log(`  public forwards: ${s.publicForwardsCount}`);
  if (s.reactions?.length)
    console.log(`  reactions: ${s.reactions.map((r) => `${r.emoji ?? (r.paid ? "⭐" : "\uD83E\uDDE9")}${r.count}`).join(" ")}`);
  for (const f of s.publicForwards ?? []) {
    console.log(colors_default.gray(`    ↪ ${f.chatTitle ?? f.chatId}${f.msgId ? `#${f.msgId}` : f.storyId ? ` story ${f.storyId}` : ""}${f.views ? ` · ${abbrev(f.views)} views` : ""}`));
  }
  for (const l of graphsLine(s.graphs))
    console.log(l);
  if (s.note)
    console.log(colors_default.gray(`  ${s.note}`));
}
function printChatStats(s) {
  const flags = [s.verified && "verified", s.scam && "scam", s.fake && "fake", s.restricted && "restricted"].filter(Boolean).join(", ");
  console.log(`${colors_default.bold(s.title)}${s.username ? colors_default.gray(` @${s.username}`) : ""} ${colors_default.gray(`[${s.type}]`)}${flags ? colors_default.yellow(` (${flags})`) : ""}`);
  if (s.about)
    console.log(colors_default.gray(`  ${s.about}`));
  const counts = [];
  if (s.participantsCount !== undefined)
    counts.push(`${abbrev(s.participantsCount)} members`);
  if (s.onlineCount)
    counts.push(`${s.onlineCount} online`);
  if (s.adminsCount !== undefined)
    counts.push(`${s.adminsCount} admins`);
  if (s.kickedCount)
    counts.push(`${s.kickedCount} kicked`);
  if (s.bannedCount)
    counts.push(`${s.bannedCount} banned`);
  if (counts.length)
    console.log(`  ${counts.join(" · ")}`);
  if (s.slowModeSeconds)
    console.log(colors_default.gray(`  slow mode: ${s.slowModeSeconds}s`));
  if (s.linkedChatId)
    console.log(colors_default.gray(`  linked chat: ${s.linkedChatId}`));
  if (s.created)
    console.log(colors_default.gray(`  created: ${new Date(s.created).toLocaleDateString()}`));
  if (s.restrictionReasons?.length)
    console.log(colors_default.yellow(`  restrictions: ${s.restrictionReasons.join("; ")}`));
  const a = s.activity;
  if (!a)
    return;
  if ("error" in a) {
    console.log(colors_default.gray(`  activity: ${a.error}`));
    return;
  }
  console.log(colors_default.bold(`  — activity (${a.kind})` + (a.period ? ` ${a.period.minDate.slice(0, 10)}…${a.period.maxDate.slice(0, 10)}` : "")));
  if (a.kind === "broadcast") {
    console.log(`    followers ${val(a.followers)} · views/post ${val(a.viewsPerPost)} · shares/post ${val(a.sharesPerPost)} · reactions/post ${val(a.reactionsPerPost)}`);
    if (a.enabledNotificationsPct !== undefined)
      console.log(`    enabled notifications: ${a.enabledNotificationsPct}%`);
    for (const p of a.recentPosts ?? [])
      console.log(colors_default.gray(`    post #${p.msgId ?? p.storyId}: ${abbrev(p.views)} views · ${p.forwards} fwd · ${p.reactions} reactions`));
  } else {
    console.log(`    members ${val(a.members)} · messages ${val(a.messages)} · viewers ${val(a.viewers)} · posters ${val(a.posters)}`);
    for (const p of a.topPosters ?? [])
      console.log(colors_default.gray(`    top poster ${p.name}: ${p.messages} msgs, ~${p.avgChars} chars`));
    for (const p of a.topAdmins ?? [])
      console.log(colors_default.gray(`    top admin ${p.name}: ${p.deleted} del, ${p.kicked} kick, ${p.banned} ban`));
    for (const p of a.topInviters ?? [])
      console.log(colors_default.gray(`    top inviter ${p.name}: ${p.invitations} invites`));
  }
  for (const l of graphsLine(a.graphs))
    console.log(l);
}
var statsCommand = new Command("stats").description("Full statistics for a channel/supergroup/group, or a single post (--message) / story (--story)").argument("<chat>", "Chat name, username (@chat), or ID").option("--message <id>", "Statistics for one message instead of the chat").option("--story <id>", "Statistics for one story instead of the chat").option("--graphs", "Include parsed graph series (growth, interactions, languages, …)").option("--limit <number>", "Max public forwards to list (with --message/--story)", "100").option("--json", "Output as JSON").action(async (chat, options) => {
  const spinner2 = spinner(`Fetching statistics for "${chat}"...`).start();
  try {
    const client = await getClient();
    const graphs = Boolean(options.graphs);
    const limit = parseInt(options.limit, 10) || 100;
    const json3 = getOutputFormat(options) === "json";
    const idOpt = (flag) => {
      const id = parseInt(options[flag], 10);
      if (!Number.isInteger(id) || id <= 0) {
        spinner2.stop();
        console.error(`--${flag} expects an ID`);
        process.exit(1);
      }
      return id;
    };
    if (options.message !== undefined) {
      const s = await getMessageStats(client, chat, idOpt("message"), { graphs, limit });
      spinner2.stop();
      if (json3)
        console.log(formatJson(s));
      else
        printMessageStats(s, `message #${s.messageId}`);
    } else if (options.story !== undefined) {
      const s = await getStoryStats(client, chat, idOpt("story"), { graphs, limit });
      spinner2.stop();
      if (json3)
        console.log(formatJson(s));
      else
        printMessageStats(s, `story ${s.storyId}`);
    } else {
      const s = await getChatStats(client, chat, { graphs });
      spinner2.stop();
      if (json3)
        console.log(formatJson(s));
      else
        printChatStats(s);
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to fetch statistics");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/scheduled.ts
var scheduledCommand = new Command("scheduled").description("List messages scheduled to send later in a chat (create them with `send --schedule`)").argument("<chat>", "Chat name, username (@user), or ID").option("--full", "Include full per-message stats").option("--stats", "Alias for --full").option("--json", "Output as JSON").option("--markdown", "Output as Markdown").action(async (chat, options) => {
  const spinner2 = spinner(`Fetching scheduled messages from "${chat}"...`).start();
  try {
    const client = await getClient();
    const { chatTitle, messages } = await getScheduledMessages(client, chat, { full: Boolean(options.full || options.stats) });
    spinner2.stop();
    switch (getOutputFormat(options)) {
      case "json":
        console.log(formatJson({ chatTitle, messages }));
        break;
      case "markdown":
        console.log(formatMessagesMarkdown(messages, `\uD83D\uDD52 ${chatTitle}`));
        break;
      default:
        if (!messages.length)
          console.log(colors_default.gray(`No scheduled messages in "${chatTitle}".`));
        else
          console.log(formatMessages(messages, `\uD83D\uDD52 ${chatTitle} (scheduled)`));
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to fetch scheduled messages");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/account-read.ts
var sessionsCommand = new Command("sessions").description("List active login sessions (devices) on the account").option("--json", "Output as JSON").action(async (options) => {
  const spinner2 = spinner("Fetching sessions...").start();
  try {
    const client = await getClient();
    const { ttlDays, sessions } = await getSessions(client);
    spinner2.stop();
    if (getOutputFormat(options) === "json") {
      console.log(formatJson({ ttlDays, sessions }));
    } else {
      console.log(colors_default.gray(`Inactive sessions auto-terminate after ${ttlDays} days.`));
      for (const s of sessions) {
        const tag = s.current ? colors_default.green(" (current)") : "";
        console.log(`${colors_default.bold(s.device || s.app)}${tag} — ${s.app} ${s.appVersion} on ${s.platform} ${s.system}`);
        console.log(colors_default.gray(`  ${[s.ip, s.country].filter(Boolean).join(" · ")}${s.lastActive ? ` · active ${new Date(s.lastActive).toLocaleString()}` : ""}`));
      }
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to fetch sessions");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
var starsCommand = new Command("stars").description("Show your Telegram Stars balance and recent transactions").option("-n, --limit <number>", "Max transactions to list", "20").option("--json", "Output as JSON").action(async (options) => {
  const spinner2 = spinner("Fetching Stars balance...").start();
  try {
    const client = await getClient();
    const { balance, transactions } = await getStars(client, { limit: parseInt(options.limit, 10) });
    spinner2.stop();
    if (getOutputFormat(options) === "json") {
      console.log(formatJson({ balance, transactions }));
    } else {
      console.log(`${colors_default.bold("⭐ Stars balance:")} ${balance}`);
      for (const t of transactions) {
        const sign2 = t.refund ? "+" : "-";
        console.log(colors_default.gray(`  ${sign2}${t.stars} ${t.title ?? t.id}${t.pending ? " (pending)" : ""}${t.date ? ` · ${new Date(t.date).toLocaleDateString()}` : ""}`));
      }
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to fetch Stars");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
var invitesCommand = new Command("invites").description("List a chat's invite links, or its pending join requests (--requests)").argument("<chat>", "Chat name, username (@chat), or ID").option("--revoked", "List revoked links instead of active ones").option("--requests", "List pending join requests instead of invite links").option("-n, --limit <number>", "Max items", "50").option("--json", "Output as JSON").action(async (chat, options) => {
  const limit = parseInt(options.limit, 10);
  const spinner2 = spinner(`Fetching invites for "${chat}"...`).start();
  try {
    const client = await getClient();
    if (options.requests) {
      const { chatTitle, count, requests } = await getJoinRequests(client, chat, { limit });
      spinner2.stop();
      if (getOutputFormat(options) === "json")
        console.log(formatJson({ chatTitle, count, requests }));
      else if (!requests.length)
        console.log(colors_default.gray(`No pending join requests for "${chatTitle}".`));
      else {
        console.log(colors_default.bold(`${count} join request(s) — ${chatTitle}`));
        for (const r of requests)
          console.log(`  ${colors_default.cyan(r.name)} ${colors_default.gray(r.userId)}${r.about ? ` — ${r.about}` : ""}`);
      }
    } else {
      const { chatTitle, count, invites } = await getInviteLinks(client, chat, { revoked: options.revoked, limit });
      spinner2.stop();
      if (getOutputFormat(options) === "json")
        console.log(formatJson({ chatTitle, count, invites }));
      else if (!invites.length)
        console.log(colors_default.gray(`No ${options.revoked ? "revoked " : ""}invite links for "${chatTitle}".`));
      else {
        console.log(colors_default.bold(`${count} invite link(s) — ${chatTitle}`));
        for (const i of invites) {
          const flags = [i.permanent && "permanent", i.revoked && "revoked", i.requestNeeded && "request-needed"].filter(Boolean).join(", ");
          const usage = i.usageLimit ? `${i.usage ?? 0}/${i.usageLimit}` : i.usage != null ? `${i.usage} used` : "";
          console.log(`  ${i.link}${flags ? colors_default.gray(` [${flags}]`) : ""}${usage ? colors_default.gray(` · ${usage}`) : ""}${i.requested ? colors_default.gray(` · ${i.requested} pending`) : ""}`);
        }
      }
    }
    await disconnectClient();
  } catch (error) {
    spinner2.fail("Failed to fetch invites");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/edit-permissions.ts
var DENY_MAP = {
  view: "viewMessages",
  send: "sendMessages",
  media: "sendMedia",
  stickers: "sendStickers",
  gifs: "sendGifs",
  games: "sendGames",
  inline: "sendInline",
  links: "embedLinks",
  polls: "sendPolls",
  changeinfo: "changeInfo",
  invite: "inviteUsers",
  pin: "pinMessages",
  topics: "manageTopics",
  photos: "sendPhotos",
  videos: "sendVideos",
  roundvideos: "sendRoundvideos",
  audio: "sendAudios",
  voice: "sendVoices",
  docs: "sendDocs",
  plain: "sendPlain",
  reactions: "sendReactions"
};
var editPermissionsCommand = new Command("edit-permissions").description("Set a chat's default permissions, or restrict one member (Telethon edit_permissions)").argument("<chat>", "Supergroup or channel name, username (@chat), or ID").argument("[user]", "Restrict this member; omit to change the chat default permissions").option("--mute", "Restrict to read-only (deny all sending)").option("--ban", "Remove the member entirely (deny viewing messages); per-user only").option("--lift", "Lift all restrictions (full permissions)").option("--deny <list>", `Comma-separated rights to deny: ${Object.keys(DENY_MAP).join(", ")}`).option("--until <duration>", "Temporary restriction (e.g. 1h, 1d, 1w); per-user only").option("--json", "Output as JSON").action(async (chat, user, options) => {
  assertWriteEnabled();
  const denied = new Set;
  if (options.mute)
    permissionPresets.MUTE_RIGHTS.forEach((r) => denied.add(r));
  if (options.ban)
    denied.add("viewMessages");
  if (options.deny) {
    for (const name of String(options.deny).split(",").map((s) => s.trim()).filter(Boolean)) {
      const key = DENY_MAP[name.toLowerCase()];
      if (!key) {
        console.error(`Unknown right "${name}". Use: ${Object.keys(DENY_MAP).join(", ")}`);
        process.exit(1);
      }
      denied.add(key);
    }
  }
  if (!options.lift && denied.size === 0) {
    console.error("Specify what to restrict (--mute, --ban, --deny <list>) or --lift to remove restrictions.");
    process.exit(1);
  }
  let untilDate = 0;
  if (options.until) {
    const { seconds, isForever } = parseDuration(options.until);
    untilDate = isForever ? 0 : Math.floor(Date.now() / 1000) + seconds;
  }
  const spinner2 = spinner(`Updating permissions in "${chat}"...`).start();
  try {
    const client = await getClient();
    const result2 = await setChatPermissions(client, chat, user, [...denied], untilDate);
    auditLog({ timestamp: new Date().toISOString(), command: "edit-permissions", target: chat, message: `${result2.target}: ${[...denied].join(",") || "(lifted)"}`, result: { success: true } });
    spinner2.stop();
    if (options.json) {
      console.log(formatJson(result2));
    } else if (!denied.size) {
      console.log(colors_default.green(`✓ Lifted restrictions on ${result2.target === "default" ? `"${result2.chatTitle}" (default)` : `${result2.target} in "${result2.chatTitle}"`}`));
    } else {
      const where = result2.target === "default" ? `"${result2.chatTitle}" default permissions` : `${result2.target} in "${result2.chatTitle}"`;
      console.log(colors_default.green(`✓ Restricted ${where}: denied ${[...denied].join(", ")}${result2.until ? ` until ${new Date(result2.until).toLocaleString()}` : ""}`));
    }
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command: "edit-permissions", target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed to update permissions");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
// src/commands/topic.ts
function parseTopicId(value) {
  const id = parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) {
    console.error("Topic ID must be a number");
    process.exit(1);
  }
  return id;
}
async function run3(command, chat, spinnerText, work, ok, options) {
  assertWriteEnabled();
  const spinner2 = spinner(spinnerText).start();
  try {
    const client = await getClient();
    const result2 = await work(client);
    auditLog({ timestamp: new Date().toISOString(), command, target: chat, result: { success: true } });
    spinner2.stop();
    if (options.json)
      console.log(formatJson(result2));
    else
      console.log(colors_default.green(ok(result2)));
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command, target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner2.fail("Failed");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
var topicCommand = new Command("topic").description("Manage forum topics (create, edit, close, reopen, pin). List them with `topics <chat>`.");
topicCommand.command("create").description("Create a forum topic").argument("<chat>", "Forum supergroup name, username (@chat), or ID").argument("<title>", "Topic title").option("--icon-color <int>", "Icon color (decimal RGB)").option("--icon-emoji <id>", "Custom-emoji document ID for the icon").option("--json", "Output as JSON").action((chat, title, options) => run3("topic create", chat, `Creating topic "${title}" in "${chat}"...`, (client) => createForumTopic(client, chat, title, { iconColor: options.iconColor ? parseInt(options.iconColor, 10) : undefined, iconEmojiId: options.iconEmoji }), () => `✓ Created topic "${title}" in "${chat}"`, options));
topicCommand.command("edit").description("Edit a topic title, icon, or closed/hidden state").argument("<chat>", "Forum supergroup name, username (@chat), or ID").argument("<topicId>", "Topic ID (from `telegram topics <chat>`)").option("--title <title>", "New title").option("--icon-emoji <id>", "New custom-emoji document ID").option("--hide", "Hide the topic (General topic only)").option("--show", "Unhide the topic").option("--json", "Output as JSON").action((chat, topicId, options) => {
  const id = parseTopicId(topicId);
  const hidden = options.hide ? true : options.show ? false : undefined;
  if (options.title === undefined && options.iconEmoji === undefined && hidden === undefined) {
    console.error("Nothing to change: pass --title, --icon-emoji, --hide or --show.");
    process.exit(1);
  }
  return run3("topic edit", chat, `Editing topic ${id} in "${chat}"...`, (client) => editForumTopic(client, chat, id, { title: options.title, iconEmojiId: options.iconEmoji, hidden }), () => `✓ Edited topic ${id} in "${chat}"`, options);
});
function makeToggle(name, verb, past) {
  return new Command(name).description(`${verb} a forum topic`).argument("<chat>", "Forum supergroup name, username (@chat), or ID").argument("<topicId>", "Topic ID (from `telegram topics <chat>`)").option("--json", "Output as JSON").action((chat, topicId, options) => {
    const id = parseTopicId(topicId);
    return run3(`topic ${name}`, chat, `${verb} topic ${id} in "${chat}"...`, (client) => name === "close" || name === "reopen" ? editForumTopic(client, chat, id, { closed: name === "close" }) : pinForumTopic(client, chat, id, name === "pin"), () => `✓ ${past} topic ${id} in "${chat}"`, options);
  });
}
topicCommand.addCommand(makeToggle("close", "Close", "Closed"));
topicCommand.addCommand(makeToggle("reopen", "Reopen", "Reopened"));
topicCommand.addCommand(makeToggle("pin", "Pin", "Pinned"));
topicCommand.addCommand(makeToggle("unpin", "Unpin", "Unpinned"));
// src/commands/generated.ts
var import_api_definitions = __toESM(require_api_definitions(), 1);
init_api_methods();

// src/generated/tl-docs.ts
var TL_DOCS = {
  "": `{"DestroyAuthKey":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/destroyAuthKey"},"DestroySession":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/destroySession"},"GetFutureSalts":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/getFutureSalts"},"InitConnection":{"d":"Initialize connection","p":{"flags":"Flags, see TL conditional fields","apiid":"Application identifier (see. App configuration)","devicemodel":"Device model","systemversion":"Operation system version","appversion":"Application version","systemlangcode":"Code for the language used on the device's OS, ISO 639-1 standard","langpack":"Platform identifier (i.e. android, tdesktop, etc).","langcode":"Either an ISO 639-1 language code or a language pack name obtained from a language pack link.","proxy":"Info about an MTProto proxy","params":"Additional initConnection parameters. For now, only the tz_offset field is supported, for specifying the timezone offset in seconds.","query":"The query itself"},"e":[["400","CONNECTION_LAYER_INVALID","Layer invalid."]]},"InvokeAfterMsg":{"d":"Invokes a query after successful completion of one of the previous queries.","p":{"msgid":"Message identifier on which a current query depends","query":"The query itself"}},"InvokeAfterMsgs":{"d":"Invokes a query after a successful completion of previous queries","p":{"msgids":"List of messages on which a current query depends","query":"The query itself"}},"InvokeWithApnsSecret":{"d":"Official clients only, invoke with Apple push verification.","p":{"nonce":"Nonce.","secret":"Secret.","query":"Query."}},"InvokeWithBusinessConnection":{"d":"Invoke a method using a Telegram Business Bot connection, see here » for more info, including a list of the methods that can be wrapped in this constructor.","p":{"connectionid":"Business connection ID.","query":"The actual query."}},"InvokeWithGooglePlayIntegrity":{"d":"Official clients only, invoke with Google Play Integrity token.","p":{"nonce":"Nonce.","token":"Token.","query":"Query."}},"InvokeWithLayer":{"d":"Invoke the specified query using the specified API layer","p":{"layer":"The layer to use","query":"The query"},"e":[["400","AUTH_BYTES_INVALID","The provided authorization is invalid."],["400","CDN_METHOD_INVALID","You can't call this method in a CDN DC."],["403","CHAT_WRITE_FORBIDDEN","You can't write in this chat."],["400","CONNECTION_API_ID_INVALID","The provided API id is invalid."]]},"InvokeWithMessagesRange":{"d":"Invoke with the given message range","p":{"range":"Message range","query":"Query"}},"InvokeWithReCaptcha":{"d":"Official clients only: re-execute a method call that required reCAPTCHA verification via a RECAPTCHA_CHECK_%s__%s, where the first placeholder is the action, and the second one is the reCAPTCHA key ID.","p":{"token":"reCAPTCHA token received after verification.","query":"The original method call."}},"InvokeWithTakeout":{"d":"Invoke a method within a takeout session, see here » for more info.","p":{"takeoutid":"Takeout session ID »","query":"Query"}},"InvokeWithoutUpdates":{"d":"Invoke a request without subscribing the used connection for updates (this is enabled by default for file queries).","p":{"query":"The query"}},"Ping":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/ping"},"PingDelayDisconnect":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/pingDelayDisconnect"},"ReqDHParams":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/reqDHParams"},"ReqPq":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/reqPq"},"ReqPqMulti":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/reqPqMulti"},"RpcDropAnswer":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/rpcDropAnswer"},"SetClientDHParams":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/setClientDHParams"}}`,
  account: `{"account.AcceptAuthorization":{"d":"Sends a Telegram Passport authorization form, effectively sharing data with the service","p":{"botid":"Bot ID","scope":"Telegram Passport element types requested by the service","publickey":"Service's public key","valuehashes":"Types of values sent and their hashes","credentials":"Encrypted values"},"e":[["400","BOT_INVALID","This is not a valid bot."],["400","PUBLIC_KEY_REQUIRED","A public key is required."]]},"account.CancelPasswordEmail":{"d":"Cancel the code that was sent to verify an email to use as 2FA recovery method.","e":[["400","EMAIL_HASH_EXPIRED","Email hash expired."]]},"account.ChangeAuthorizationSettings":{"d":"Change settings related to a session.","p":{"flags":"Flags, see TL conditional fields","confirmed":"If set, confirms a newly logged in session ».","hash":"Session ID from the authorization constructor, fetchable using account.getAuthorizations","encryptedrequestsdisabled":"Whether to enable or disable receiving encrypted chats: if the flag is not set, the previous setting is not changed","callrequestsdisabled":"Whether to enable or disable receiving calls: if the flag is not set, the previous setting is not changed"},"e":[["400","HASH_INVALID","The provided hash is invalid."]]},"account.ChangePhone":{"d":"Change the phone number of the current account","p":{"phonenumber":"New phone number","phonecodehash":"Phone code hash received when calling account.sendChangePhoneCode","phonecode":"Phone code received when calling account.sendChangePhoneCode"},"e":[["400","PHONE_CODE_EMPTY","phone_code is missing."],["400","PHONE_CODE_EXPIRED","The phone code you provided has expired."],["400","PHONE_CODE_INVALID","The provided phone code is invalid."],["406","PHONE_NUMBER_INVALID","The phone number is invalid."]]},"account.CheckUsername":{"d":"Validates a username and checks availability.","p":{"username":"usernameAccepted characters: A-z (case-insensitive), 0-9 and underscores.Length: 5-32 characters."},"e":[["400","USERNAME_INVALID","The provided username is not valid."],["400","USERNAME_OCCUPIED","The provided username is already occupied."],["400","USERNAME_PURCHASE_AVAILABLE","The specified username can be purchased on https://fragment.com."]]},"account.ClearRecentEmojiStatuses":{"d":"Clears list of recently used emoji statuses"},"account.ConfirmBotConnection":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/account.confirmBotConnection"},"account.ConfirmPasswordEmail":{"d":"Verify an email to use as 2FA recovery method.","p":{"code":"The phone code that was received after setting a recovery email"},"e":[["400","CODE_INVALID","Code invalid."],["400","EMAIL_HASH_EXPIRED","Email hash expired."]]},"account.ConfirmPhone":{"d":"Confirm a phone number to cancel account deletion, for more info click here »","p":{"phonecodehash":"Phone code hash, for more info click here »","phonecode":"SMS code, for more info click here »"},"e":[["400","CODE_HASH_INVALID","Code hash invalid."],["400","PHONE_CODE_EMPTY","phone_code is missing."]]},"account.CreateBusinessChatLink":{"d":"Create a business chat deep link ».","p":{"link":"Info about the link to create."},"e":[["400","CHATLINKS_TOO_MUCH","Too many business chat links were created, please delete some older links."],["400","DOCUMENT_INVALID","The specified document is invalid."],["403","PREMIUM_ACCOUNT_REQUIRED","A premium account is required to execute this action."]]},"account.CreateTheme":{"d":"Create a theme","p":{"flags":"Flags, see TL conditional fields","slug":"Unique theme ID used to generate theme deep links, can be empty to autogenerate a random ID.","title":"Theme name","document":"Theme file","settings":"Theme settings, multiple values can be provided for the different base themes (day/night mode, etc)."},"e":[["400","THEME_MIME_INVALID","The theme's MIME type is invalid."],["400","THEME_TITLE_INVALID","The specified theme title is invalid."]]},"account.DeclinePasswordReset":{"d":"Abort a pending 2FA password reset, see here for more info »","e":[["400","RESET_REQUEST_MISSING","No password reset is in progress."]]},"account.DeleteAccount":{"d":"Delete the user's account from the telegram servers.","p":{"flags":"Flags, see TL conditional fields","reason":"Why is the account being deleted, can be empty","password":"2FA password: this field can be omitted even for accounts with 2FA enabled: in this case account account deletion will be delayed by 7 days as…"},"e":[["420","2FA_CONFIRM_WAIT_%d","Since this account is active and protected by a 2FA password, we will delete it in 1 week…"],["400","PASSWORD_HASH_INVALID","The provided password hash is invalid."]]},"account.DeleteAutoSaveExceptions":{"d":"Clear all peer-specific autosave settings."},"account.DeleteBusinessChatLink":{"d":"Delete a business chat deep link ».","p":{"slug":"Slug of the link, obtained as specified here »."},"e":[["400","CHATLINK_SLUG_EMPTY","The specified slug is empty."],["400","CHATLINK_SLUG_EXPIRED","The specified business chat link has expired."]]},"account.DeletePasskey":{"d":"Delete a passkey associated to the current account, see here » for more info.","p":{"id":"Identifier of the passkey to delete, taken from passkey.id, usually obtained using account.getPasskeys."}},"account.DeleteSecureValue":{"d":"Delete stored Telegram Passport documents, for more info see the passport docs »","p":{"types":"Document types to delete"}},"account.DeleteWebBrowserSettingsExceptions":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/account.deleteWebBrowserSettingsExceptions"},"account.DisablePeerConnectedBot":{"d":"Permanently disconnect a specific chat from all business bots » (equivalent to specifying it in recipients.exclude_users during initial configuration with account.updateConnectedBot »); to reconnect of a chat disconnected using this method…","p":{"peer":"The chat to disconnect"},"e":[["400","BOT_ALREADY_DISABLED","The connected business bot was already disabled for the specified peer."],["400","BOT_NOT_CONNECTED_YET","No business bot is connected to the currently logged in user."],["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"account.EditBusinessChatLink":{"d":"Edit a created business chat deep link ».","p":{"slug":"Slug of the link, obtained as specified here ».","link":"New link information."},"e":[["400","CHATLINK_SLUG_EMPTY","The specified slug is empty."],["403","PREMIUM_ACCOUNT_REQUIRED","A premium account is required to execute this action."]]},"account.FinishTakeoutSession":{"d":"Terminate a takeout session, see here » for more info.","p":{"flags":"Flags, see TL conditional fields","success":"Data exported successfully"},"e":[["403","TAKEOUT_REQUIRED","A takeout session needs to be initialized first, see here » for more info."]]},"account.GetAccountTTL":{"d":"Get days to live of account"},"account.GetAllSecureValues":{"d":"Get all saved Telegram Passport documents, for more info see the passport docs »"},"account.GetAuthorizationForm":{"d":"Returns a Telegram Passport authorization form for sharing data with a service","p":{"botid":"User identifier of the service's bot","scope":"Telegram Passport element types requested by the service","publickey":"Service's public key"},"e":[["400","BOT_INVALID","This is not a valid bot."],["400","PUBLIC_KEY_REQUIRED","A public key is required."]]},"account.GetAuthorizations":{"d":"Get logged-in sessions"},"account.GetAutoDownloadSettings":{"d":"Get media autodownload settings"},"account.GetAutoSaveSettings":{"d":"Get autosave settings"},"account.GetBotBusinessConnection":{"d":"Bots may invoke this method to re-fetch the updateBotBusinessConnect constructor associated with a specific business connection_id, see here » for more info on connected business bots.","p":{"connectionid":"Business connection ID »."},"e":[["400","CONNECTION_ID_INVALID","The specified connection ID is invalid."]]},"account.GetBusinessChatLinks":{"d":"List all created business chat deep links »."},"account.GetChannelDefaultEmojiStatuses":{"d":"Get a list of default suggested channel emoji statuses.","p":{"hash":"Hash used for caching, for more info click here."}},"account.GetChannelRestrictedStatusEmojis":{"d":"Returns fetch the full list of custom emoji IDs » that cannot be used in channel emoji statuses ».","p":{"hash":"Hash used for caching, for more info click here."}},"account.GetChatThemes":{"d":"Get all available chat themes ».","p":{"hash":"Hash used for caching, for more info click here."}},"account.GetCollectibleEmojiStatuses":{"d":"Obtain a list of emoji statuses » for owned or hosted collectible gifts ».","p":{"hash":"Hash for pagination"}},"account.GetConnectedBots":{"d":"List all currently connected business bots »"},"account.GetContactSignUpNotification":{"d":"Whether the user will receive notifications when contacts sign up"},"account.GetContentSettings":{"d":"Get sensitive content settings"},"account.GetDefaultBackgroundEmojis":{"d":"Get a set of suggested custom emoji stickers that can be used in an accent color pattern.","p":{"hash":"Hash used for caching, for more info click here."}},"account.GetDefaultEmojiStatuses":{"d":"Get a list of default suggested emoji statuses","p":{"hash":"Hash used for caching, for more info click here."}},"account.GetDefaultGroupPhotoEmojis":{"d":"Get a set of suggested custom emoji stickers that can be used as group picture","p":{"hash":"Hash used for caching, for more info click here."}},"account.GetDefaultProfilePhotoEmojis":{"d":"Get a set of suggested custom emoji stickers that can be used as profile picture","p":{"hash":"Hash used for caching, for more info click here."}},"account.GetGlobalPrivacySettings":{"d":"Get global privacy settings"},"account.GetMultiWallPapers":{"d":"Get info about multiple wallpapers","p":{"wallpapers":"Wallpapers to fetch info about"},"e":[["400","WALLPAPER_INVALID","The specified wallpaper is invalid."]]},"account.GetNotifyExceptions":{"d":"Returns list of chats with non-default notification settings","p":{"flags":"Flags, see TL conditional fields","comparesound":"If set, chats with non-default sound will be returned","comparestories":"If set, chats with non-default notification settings for stories will be returned","peer":"If specified, only chats of the specified category will be returned"}},"account.GetNotifySettings":{"d":"Gets current notification settings for a given user/group, from all users/all groups.","p":{"peer":"Notification source"},"e":[["400","CHANNEL_INVALID","The provided channel is invalid."],["400","CHANNEL_PRIVATE","You haven't joined this channel/supergroup."],["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"account.GetPaidMessagesRevenue":{"d":"Get the number of stars we have received from the specified user thanks to paid messages »; the received amount will be equal to the sent amount multiplied by stars_paid_message_commission_permille divided by 1000.","p":{"flags":"Flags, see TL conditional fields","parentpeer":"If set, can contain the ID of a monoforum (channel direct messages) to obtain the number of stars the user has spent to send us direct messages via…","userid":"The user that paid to send us messages."},"e":[["400","PARENT_PEER_INVALID","The specified parent_peer is invalid."],["400","USER_ID_INVALID","The provided user ID is invalid."]]},"account.GetPasskeys":{"d":"List the passkeys associated to the current account that can be used to log in, see here » for more info on passkeys."},"account.GetPassword":{"d":"Obtain configuration for two-factor authorization with password"},"account.GetPasswordSettings":{"d":"Get private info associated to the password info (recovery email, telegram passport info & so on)","p":{"password":"The password (see SRP)"},"e":[["400","PASSWORD_HASH_INVALID","The provided password hash is invalid."]]},"account.GetPrivacy":{"d":"Get privacy settings of current account","p":{"key":"Peer category whose privacy settings should be fetched"},"e":[["400","PRIVACY_KEY_INVALID","The privacy key is invalid."]]},"account.GetReactionsNotifySettings":{"d":"Get the current reaction notification settings »."},"account.GetRecentEmojiStatuses":{"d":"Get recently used emoji statuses","p":{"hash":"Hash used for caching, for more info click here."}},"account.GetSavedMusicIds":{"d":"Fetch the full list of only the IDs of songs currently added to the profile, see here » for more info.","p":{"hash":"Hash generated » from the previously returned list of IDs."}},"account.GetSavedRingtones":{"d":"Fetch saved notification sounds","p":{"hash":"Hash used for caching, for more info click here."}},"account.GetSecureValue":{"d":"Get saved Telegram Passport document, for more info see the passport docs »","p":{"types":"Requested value types"}},"account.GetTheme":{"d":"Get theme information","p":{"format":"Theme format, a string that identifies the theming engines supported by the client","theme":"Theme"},"e":[["400","THEME_FORMAT_INVALID","Invalid theme format provided."],["400","THEME_INVALID","Invalid theme provided."],["400","THEME_SLUG_INVALID","The specified theme slug is invalid."]]},"account.GetThemes":{"d":"Get installed themes","p":{"format":"Theme format, a string that identifies the theming engines supported by the client","hash":"Hash used for caching, for more info click here."}},"account.GetTmpPassword":{"d":"Get temporary payment password","p":{"password":"SRP password parameters","period":"Time during which the temporary password will be valid, in seconds; should be between 60 and 86400"},"e":[["400","PASSWORD_HASH_INVALID","The provided password hash is invalid."],["400","SRP_A_INVALID","The specified inputCheckPasswordSRP.A value is invalid."],["400","TMP_PASSWORD_DISABLED","The temporary password is disabled."]]},"account.GetUniqueGiftChatThemes":{"d":"Obtain all chat themes » associated to owned or hosted collectible gifts ».","p":{"offset":"Offset for pagination, intially an empty string, then equal the value of the last returned account.chatThemes.next_offset (if set).","limit":"Maximum number of results to return, see pagination. Note that the server may return less than limit results, even if the actual number of remaining…","hash":"Hash from a previously returned account.chatThemes constructor, to avoid returning any result if the theme list hasn't changed."}},"account.GetWallPaper":{"d":"Get info about a certain wallpaper","p":{"wallpaper":"The wallpaper to get info about"},"e":[["400","WALLPAPER_INVALID","The specified wallpaper is invalid."]]},"account.GetWallPapers":{"d":"Returns a list of available wallpapers.","p":{"hash":"Hash used for caching, for more info click here."}},"account.GetWebAuthorizations":{"d":"Get web login widget authorizations"},"account.GetWebBrowserSettings":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/account.getWebBrowserSettings"},"account.InitPasskeyRegistration":{"d":"Initialize passkey registration for the current account, see here » for more info on the full flow.","e":[["403","ACCESS_DENIED","The account was deactivated, or is a bot/service account."],["406","FRESH_RESET_AUTHORISATION_FORBIDDEN","You can't logout other sessions if less than 24 hours have passed since you logged on the…"]]},"account.InitTakeoutSession":{"d":"Initialize a takeout session, see here » for more info.","p":{"flags":"Flags, see TL conditional fields","contacts":"Whether to export contacts","messageusers":"Whether to export messages in private chats","messagechats":"Whether to export messages in basic groups","messagemegagroups":"Whether to export messages in supergroups","messagechannels":"Whether to export messages in channels","files":"Whether to export files","filemaxsize":"Maximum size of files to export"},"e":[["420","TAKEOUT_INIT_DELAY_%d","Sorry, for security reasons, you will be able to begin downloading your data in %d…"]]},"account.InstallTheme":{"d":"Install a theme","p":{"flags":"Flags, see TL conditional fields","dark":"Whether to install the dark version","theme":"Theme to install","format":"Theme format, a string that identifies the theming engines supported by the client","basetheme":"Indicates a basic theme provided by all clients"}},"account.InstallWallPaper":{"d":"Install wallpaper","p":{"wallpaper":"Wallpaper to install","settings":"Wallpaper settings"},"e":[["400","WALLPAPER_INVALID","The specified wallpaper is invalid."]]},"account.InvalidateSignInCodes":{"d":"Invalidate the specified login codes, see here » for more info.","p":{"codes":"The login codes to invalidate."}},"account.RegisterDevice":{"d":"Register device to receive PUSH notifications","p":{"flags":"Flags, see TL conditional fields","nomuted":"Avoid receiving (silent and invisible background) notifications. Useful to save battery.","tokentype":"Device token type, see PUSH updates for the possible values.","token":"Device token, see PUSH updates for the possible values.","appsandbox":"If (boolTrue) is transmitted, a sandbox-certificate will be used during transmission.","secret":"For FCM and APNS VoIP, optional encryption key used to encrypt push notifications","otheruids":"List of user identifiers of other users currently using the client"},"e":[["400","TOKEN_EMPTY","The specified token is empty."],["400","TOKEN_INVALID","The provided token is invalid."],["400","TOKEN_TYPE_INVALID","The specified token type is invalid."],["400","WEBPUSH_AUTH_INVALID","The specified web push authentication secret is invalid."]]},"account.RegisterPasskey":{"d":"Complete passkey registration for the current account, see here » for more info on the full flow.","p":{"credential":"Registration result."},"e":[["400","CREDENTIAL_INVALID","The specified credential is invalid."],["400","PASSKEY_ORIGIN_MISMATCH","Third-party clients currently don't support passkeys even when changing the origin."]]},"account.ReorderUsernames":{"d":"Reorder usernames associated with the currently logged-in user.","p":{"order":"The new order for active usernames. All active usernames must be specified."},"e":[["400","ORDER_INVALID","The specified username order is invalid."],["400","USERNAME_NOT_MODIFIED","The username was not modified."]]},"account.ReportPeer":{"d":"Report a peer for violation of telegram's Terms of Service","p":{"peer":"The peer to report","reason":"The reason why this peer is being reported","message":"Comment for report moderation"},"e":[["400","CHANNEL_PRIVATE","You haven't joined this channel/supergroup."],["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"account.ReportProfilePhoto":{"d":"Report a profile photo of a dialog","p":{"peer":"The dialog","photoid":"Dialog photo ID","reason":"Report reason","message":"Comment for report moderation"},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"account.ResendPasswordEmail":{"d":"Resend the code to verify an email to use as 2FA recovery method.","e":[["400","EMAIL_HASH_EXPIRED","Email hash expired."]]},"account.ResetAuthorization":{"d":"Log out an active authorized session by its hash","p":{"hash":"Session hash"},"e":[["406","FRESH_RESET_AUTHORISATION_FORBIDDEN","You can't logout other sessions if less than 24 hours have passed since you logged on the…"],["400","HASH_INVALID","The provided hash is invalid."]]},"account.ResetNotifySettings":{"d":"Resets all notification settings from users and groups."},"account.ResetPassword":{"d":"Initiate a 2FA password reset: can only be used if the user is already logged-in, see here for more info »","e":[["400","PASSWORD_EMPTY","The provided password is empty."]]},"account.ResetWallPapers":{"d":"Delete all installed wallpapers, reverting to the default wallpaper set."},"account.ResetWebAuthorization":{"d":"Log out an active web telegram login session","p":{"hash":"Session hash"},"e":[["400","HASH_INVALID","The provided hash is invalid."]]},"account.ResetWebAuthorizations":{"d":"Reset all active web telegram login sessions"},"account.ResolveBusinessChatLink":{"d":"Resolve a business chat deep link ».","p":{"slug":"Slug of the link, obtained as specified here »."},"e":[["400","CHATLINK_SLUG_EMPTY","The specified slug is empty."],["400","CHATLINK_SLUG_EXPIRED","The specified business chat link has expired."]]},"account.SaveAutoDownloadSettings":{"d":"Change media autodownload settings","p":{"flags":"Flags, see TL conditional fields","low":"Whether to save media in the low data usage preset","high":"Whether to save media in the high data usage preset","settings":"Media autodownload settings"}},"account.SaveAutoSaveSettings":{"d":"Modify autosave settings","p":{"flags":"Flags, see TL conditional fields","users":"Whether the new settings should affect all private chats","chats":"Whether the new settings should affect all groups","broadcasts":"Whether the new settings should affect all channels","peer":"Whether the new settings should affect a specific peer","settings":"The new autosave settings"},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"account.SaveMusic":{"d":"Adds or removes a song from the current user's profile see here » for more info on the music tab of the profile page.","p":{"flags":"Flags, see TL conditional fields","unsave":"If set, removes the song.","id":"The song to add or remove; can be an already added song when reordering songs with after_id.","afterid":"If set, the song will be added after the passed song (must be already pinned on the profile)."},"e":[["400","DOCUMENT_INVALID","The specified document is invalid."]]},"account.SaveRingtone":{"d":"Save or remove saved notification sound.","p":{"id":"Notification sound uploaded using account.uploadRingtone","unsave":"Whether to add or delete the notification sound"},"e":[["400","RINGTONE_INVALID","The specified ringtone is invalid."]]},"account.SaveSecureValue":{"d":"Securely save Telegram Passport document, for more info see the passport docs »","p":{"value":"Secure value, for more info see the passport docs »","securesecretid":"Passport secret hash, for more info see the passport docs »"},"e":[["400","PASSWORD_REQUIRED","A 2FA password must be configured to use Telegram Passport."],["400","SECURE_SECRET_REQUIRED","A secure secret is required."]]},"account.SaveTheme":{"d":"Save a theme","p":{"theme":"Theme to save","unsave":"Unsave"},"e":[["400","THEME_INVALID","Invalid theme provided."]]},"account.SaveWallPaper":{"d":"Install/uninstall wallpaper","p":{"wallpaper":"Wallpaper to install or uninstall","unsave":"Uninstall wallpaper?","settings":"Wallpaper settings"},"e":[["400","WALLPAPER_INVALID","The specified wallpaper is invalid."]]},"account.SendChangePhoneCode":{"d":"Verify a new phone number to associate to the current account","p":{"phonenumber":"New phone number","settings":"Phone code settings"},"e":[["406","FRESH_CHANGE_PHONE_FORBIDDEN","You can't change phone number right after logging in, please wait at least 24 hours."],["400","PHONE_NUMBER_BANNED","The provided phone number is banned from telegram."],["406","PHONE_NUMBER_INVALID","The phone number is invalid."],["400","PHONE_NUMBER_OCCUPIED","The phone number is already in use."]]},"account.SendConfirmPhoneCode":{"d":"Send confirmation code to cancel account deletion, for more info click here »","p":{"hash":"The hash from the service notification, for more info click here »","settings":"Phone code settings"},"e":[["400","HASH_INVALID","The provided hash is invalid."]]},"account.SendVerifyEmailCode":{"d":"Send an email verification code.","p":{"purpose":"Verification purpose.","email":"The email where to send the code."},"e":[["400","EMAIL_INVALID","The specified email is invalid."],["400","EMAIL_NOT_ALLOWED","The specified email cannot be used to complete the operation."],["400","EMAIL_NOT_SETUP","In order to change the login email with emailVerifyPurposeLoginChange, an existing login…"],["400","PHONE_CODE_EMPTY","phone_code is missing."]]},"account.SendVerifyPhoneCode":{"d":"Send the verification phone code for telegram passport.","p":{"phonenumber":"The phone number to verify","settings":"Phone code settings"},"e":[["400","PHONE_NUMBER_INVALID","The phone number is invalid."]]},"account.SetAccountTTL":{"d":"Set account self-destruction period","p":{"ttl":"Time to live in days"},"e":[["400","TTL_DAYS_INVALID","The provided TTL is invalid."]]},"account.SetAuthorizationTTL":{"d":"Set time-to-live of current session","p":{"authorizationttldays":"Time-to-live of current session in days"},"e":[["406","FRESH_RESET_AUTHORISATION_FORBIDDEN","You can't logout other sessions if less than 24 hours have passed since you logged on the…"],["400","TTL_DAYS_INVALID","The provided TTL is invalid."]]},"account.SetContactSignUpNotification":{"d":"Toggle contact sign up notifications","p":{"silent":"Whether to disable contact sign up notifications"}},"account.SetContentSettings":{"d":"Set sensitive content settings (for viewing or hiding NSFW content)","p":{"flags":"Flags, see TL conditional fields","sensitiveenabled":"Enable NSFW content"},"e":[["403","SENSITIVE_CHANGE_FORBIDDEN","You can't change your sensitive content settings."]]},"account.SetGlobalPrivacySettings":{"d":"Set global privacy settings","p":{"settings":"Global privacy settings"},"e":[["400","AUTOARCHIVE_NOT_AVAILABLE","The autoarchive setting is not available at this time: please check the value of the…"],["403","BOT_ACCESS_FORBIDDEN","The specified method can be used over a business connection for some operations, but the…"],["400","BUSINESS_CONNECTION_INVALID","The connection_id passed to the wrapping invokeWithBusinessConnection call is invalid."],["403","PREMIUM_ACCOUNT_REQUIRED","A premium account is required to execute this action."]]},"account.SetMainProfileTab":{"d":"Changes the main profile tab of the current user, see here » for more info.","p":{"tab":"The tab to set as main tab."}},"account.SetPrivacy":{"d":"Change privacy settings of current account","p":{"key":"New privacy rule","rules":"Peers to which the privacy rule will apply."},"e":[["400","PRIVACY_KEY_INVALID","The privacy key is invalid."],["400","PRIVACY_TOO_LONG","Too many privacy rules were specified, the current limit is 1000."],["400","PRIVACY_VALUE_INVALID","The specified privacy rule combination is invalid."]]},"account.SetReactionsNotifySettings":{"d":"Change the reaction notification settings ».","p":{"settings":"New reaction notification settings."}},"account.ToggleConnectedBotPaused":{"d":"Pause or unpause a specific chat, temporarily disconnecting it from all business bots ».","p":{"peer":"The chat to pause","paused":"Whether to pause or unpause the chat"},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"account.ToggleNoPaidMessagesException":{"d":"Allow a user to send us messages without paying if paid messages » are enabled.","p":{"flags":"Flags, see TL conditional fields","refundcharged":"If set and require_payment is not set, refunds the amounts the user has already paid us to send us messages (directly or via a monoforum).","requirepayment":"If set, requires the user to pay in order to send us messages. Can only be set by monoforums, not users, i.e.","parentpeer":"If set, applies the setting within the monoforum aka direct messages » (pass the ID of the monoforum, not the ID of the associated channel).","userid":"The user to exempt or unexempt."},"e":[["400","PARENT_PEER_INVALID","The specified parent_peer is invalid."],["400","UNSUPPORTED","require_payment cannot be set by users, only by monoforums: users must instead use the…"],["400","USER_ID_INVALID","The provided user ID is invalid."]]},"account.ToggleSponsoredMessages":{"d":"Disable or re-enable Telegram ads for the current Premium account.","p":{"enabled":"Enable or disable ads."}},"account.ToggleUsername":{"d":"Activate or deactivate a purchased fragment.com username associated to the currently logged-in user.","p":{"username":"Username","active":"Whether to activate or deactivate it"},"e":[["400","USERNAMES_ACTIVE_TOO_MUCH","The maximum number of active usernames was reached."],["400","USERNAME_INVALID","The provided username is not valid."],["400","USERNAME_NOT_MODIFIED","The username was not modified."]]},"account.ToggleWebBrowserSettingsException":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/account.toggleWebBrowserSettingsException"},"account.UnregisterDevice":{"d":"Deletes a device by its token, stops sending PUSH-notifications to it.","p":{"tokentype":"Device token type, see PUSH updates for the possible values.","token":"Device token, see PUSH updates for the possible values.","otheruids":"List of user identifiers of other users currently using the client"},"e":[["400","TOKEN_INVALID","The provided token is invalid."]]},"account.UpdateBirthday":{"d":"Update our birthday, see here » for more info.","p":{"flags":"Flags, see TL conditional fields","birthday":"Birthday."},"e":[["400","BIRTHDAY_INVALID","An invalid age was specified, must be between 0 and 150 years."]]},"account.UpdateBusinessAwayMessage":{"d":"Set a list of Telegram Business away messages.","p":{"flags":"Flags, see TL conditional fields","message":"Away message configuration and contents."}},"account.UpdateBusinessGreetingMessage":{"d":"Set a list of Telegram Business greeting messages.","p":{"flags":"Flags, see TL conditional fields","message":"Greeting message configuration and contents."}},"account.UpdateBusinessIntro":{"d":"Set or remove the Telegram Business introduction ».","p":{"flags":"Flags, see TL conditional fields","intro":"Telegram Business introduction, to remove it call the method without setting this flag."}},"account.UpdateBusinessLocation":{"d":"Businesses » may advertise their location using this method, see here » for more info.","p":{"flags":"Flags, see TL conditional fields","geopoint":"Optional, contains a set of geographical coordinates.","address":"Mandatory when setting/updating the location, contains a textual description of the address (max 96 UTF-8 chars)."}},"account.UpdateBusinessWorkHours":{"d":"Specify a set of Telegram Business opening hours. This info will be contained in userFull.business_work_hours.","p":{"flags":"Flags, see TL conditional fields","businessworkhours":"Opening hours (optional, if not set removes all opening hours)."},"e":[["400","BUSINESS_WORK_HOURS_EMPTY","No work hours were specified."],["400","BUSINESS_WORK_HOURS_PERIOD_INVALID","The specified work hours are invalid, see here » for the exact requirements."],["400","TIMEZONE_INVALID","The specified timezone does not exist."]]},"account.UpdateColor":{"d":"Update the accent color and background custom emoji » of the current account.","p":{"flags":"Flags, see TL conditional fields","forprofile":"Whether to change the accent color emoji pattern of the profile page; otherwise, the accent color and emoji pattern of messages will be changed.","color":"ID of the accent color palette » to use (not RGB24, see here » for more info)."},"e":[["400","COLOR_INVALID","The specified color palette ID was invalid."],["400","DOCUMENT_INVALID","The specified document is invalid."],["403","PREMIUM_ACCOUNT_REQUIRED","A premium account is required to execute this action."]]},"account.UpdateConnectedBot":{"d":"Connect a business bot » to the current account, or to change the current connection settings.","p":{"flags":"Flags, see TL conditional fields","deleted":"Whether to fully disconnect the bot from the current account.","rights":"Business bot rights.","bot":"The bot to connect or disconnect","recipients":"Configuration for the business connection"},"e":[["400","BOT_BUSINESS_MISSING","The specified bot is not a business bot (the user.bot_business flag is not set)."],["400","BUSINESS_RECIPIENTS_EMPTY","You didn't set any flag in inputBusinessBotRecipients, thus the bot cannot work with any…"]]},"account.UpdateDeviceLocked":{"d":"When client-side passcode lock feature is enabled, will not show message texts in incoming PUSH notifications.","p":{"period":"Inactivity period after which to start hiding message texts in PUSH notifications."}},"account.UpdateEmojiStatus":{"d":"Set an emoji status","p":{"emojistatus":"Emoji status to set"},"e":[["400","COLLECTIBLE_INVALID","The specified collectible is invalid."],["400","DOCUMENT_INVALID","The specified document is invalid."],["403","PREMIUM_ACCOUNT_REQUIRED","A premium account is required to execute this action."]]},"account.UpdateNotifySettings":{"d":"Edits notification settings from a given user/group, from all users/all groups.","p":{"peer":"Notification source","settings":"Notification settings"},"e":[["400","CHANNEL_INVALID","The provided channel is invalid."],["400","CHANNEL_PRIVATE","You haven't joined this channel/supergroup."],["400","MSG_ID_INVALID","Invalid message ID provided."],["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"account.UpdatePasswordSettings":{"d":"Set a new 2FA password","p":{"password":"The old password (see SRP)","newsettings":"The new password (see SRP)"},"e":[["400","EMAIL_INVALID","The specified email is invalid."],["400","EMAIL_UNCONFIRMED","Email unconfirmed."],["400","EMAIL_UNCONFIRMED_%d","The provided email isn't confirmed, %d is the length of the verification code that was…"],["400","NEW_SALT_INVALID","The new salt is invalid."]]},"account.UpdatePersonalChannel":{"d":"Associate (or remove) a personal channel », that will be listed on our personal profile page ».","p":{"channel":"The channel, pass inputChannelEmpty to remove it."},"e":[["400","PUBLIC_BROADCAST_EXPECTED","channel only accepts a channel, but a supergroup was passed."]]},"account.UpdateProfile":{"d":"Updates user profile.","p":{"flags":"Flags, see TL conditional fields","firstname":"New user first name","lastname":"New user last name","about":"New bio"},"e":[["400","ABOUT_TOO_LONG","About string too long."],["400","BUSINESS_CONNECTION_INVALID","The connection_id passed to the wrapping invokeWithBusinessConnection call is invalid."],["400","FIRSTNAME_INVALID","The first name is invalid."]]},"account.UpdateStatus":{"d":"Updates online user status.","p":{"offline":"If (boolTrue) is transmitted, user status will change to (userStatusOffline)."}},"account.UpdateTheme":{"d":"Update theme","p":{"flags":"Flags, see TL conditional fields","format":"Theme format, a string that identifies the theming engines supported by the client","theme":"Theme to update","slug":"Unique theme ID","title":"Theme name","document":"Theme file","settings":"Theme settings"},"e":[["400","THEME_INVALID","Invalid theme provided."]]},"account.UpdateUsername":{"d":"Changes username for the current user.","p":{"username":"username or empty string if username is to be removedAccepted characters: a-z (case-insensitive), 0-9 and underscores.Length: 5-32 characters."},"e":[["400","USERNAME_INVALID","The provided username is not valid."],["400","USERNAME_NOT_MODIFIED","The username was not modified."],["400","USERNAME_OCCUPIED","The provided username is already occupied."],["400","USERNAME_PURCHASE_AVAILABLE","The specified username can be purchased on https://fragment.com."]]},"account.UpdateWebBrowserSettings":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/account.updateWebBrowserSettings"},"account.UploadRingtone":{"d":"Upload notification sound, use account.saveRingtone to convert it and add it to the list of saved notification sounds.","p":{"file":"Notification sound","filename":"File name","mimetype":"MIME type of file"},"e":[["400","RINGTONE_MIME_INVALID","The MIME type for the ringtone is invalid."]]},"account.UploadTheme":{"d":"Upload theme","p":{"flags":"Flags, see TL conditional fields","file":"Previously uploaded theme file with platform-specific colors for UI components, can be left unset when creating themes that only modify the wallpaper…","thumb":"Thumbnail","filename":"File name","mimetype":"MIME type, must be application/x-tgtheme-{format}, where format depends on the client"},"e":[["400","THEME_FILE_INVALID","Invalid theme file provided."],["400","THEME_MIME_INVALID","The theme's MIME type is invalid."]]},"account.UploadWallPaper":{"d":"Create and upload a new wallpaper","p":{"flags":"Flags, see TL conditional fields","forchat":"Set this flag when uploading wallpapers to be passed to messages.setChatWallPaper.","file":"The JPG/PNG wallpaper","mimetype":"MIME type of uploaded wallpaper","settings":"Wallpaper settings"},"e":[["400","WALLPAPER_FILE_INVALID","The specified wallpaper file is invalid."],["400","WALLPAPER_MIME_INVALID","The specified wallpaper MIME type is invalid."]]},"account.VerifyEmail":{"d":"Verify an email address.","p":{"purpose":"Verification purpose","verification":"Email verification code or token"},"e":[["400","CODE_INVALID","Code invalid."],["400","EMAIL_INVALID","The specified email is invalid."],["400","EMAIL_NOT_ALLOWED","The specified email cannot be used to complete the operation."],["400","EMAIL_VERIFY_EXPIRED","The verification email has expired."]]},"account.VerifyPhone":{"d":"Verify a phone number for telegram passport.","p":{"phonenumber":"Phone number","phonecodehash":"Phone code hash received from the call to account.sendVerifyPhoneCode","phonecode":"Code received after the call to account.sendVerifyPhoneCode"},"e":[["400","PHONE_CODE_EMPTY","phone_code is missing."],["400","PHONE_CODE_EXPIRED","The phone code you provided has expired."],["400","PHONE_NUMBER_INVALID","The phone number is invalid."]]}}`,
  aicompose: `{"aicompose.CreateTone":{"d":"Create a new custom AI composer tone ».","p":{"flags":"Flags, see TL conditional fields","displayauthor":"If set, the current user will be publicly credited as the author of the tone","emojiid":"Custom emoji ID of the tone's icon","title":"Human-readable tone name, up to aicompose_tone_title_length_max » UTF-8 characters long","prompt":"The prompt that describes how the AI should rephrase messages using this tone, up to aicompose_tone_prompt_length_max » UTF-8 characters long"},"e":[["400","AICOMPOSE_TONE_TITLE_INVALID","The specified tone title is invalid."]]},"aicompose.DeleteTone":{"d":"Permanently delete a custom AI composer tone » created by the current user.","p":{"tone":"The tone to delete"},"e":[["400","AICOMPOSE_TONE_INVALID","The specified tone is invalid."]]},"aicompose.GetTone":{"d":"Fetch information about a single AI composer tone », for example to resolve a shared tone deep link.","p":{"tone":"The tone to fetch"},"e":[["400","AICOMPOSE_TONE_INVALID","The specified tone is invalid."]]},"aicompose.GetToneExample":{"d":"Fetch an example showing how an AI composer tone » rephrases a sample message, used as a preview in the tone picker.","p":{"tone":"The tone to preview","num":"0-based index of the example to fetch, to cycle through the available examples (there are aicompose_tone_examples_num » examples per tone)"},"e":[["400","AICOMPOSE_TONE_INVALID","The specified tone is invalid."]]},"aicompose.GetTones":{"d":"Fetch the list of saved AI composer tones » of the current user.","p":{"hash":"Hash from a previously cached aicompose.tones.hash to avoid refetching the list if it hasn't changed; initially 0."}},"aicompose.SaveTone":{"d":"Install or uninstall an AI composer tone », adding it to or removing it from the list of saved tones of the current user.","p":{"tone":"The tone to save or unsave","unsave":"If false, installs (saves) the tone; if true, uninstalls (unsaves) it"},"e":[["400","AICOMPOSE_TONE_INVALID","The specified tone is invalid."]]},"aicompose.UpdateTone":{"d":"Edit a custom AI composer tone » previously created by the current user. Only the fields whose flag is set will be modified.","p":{"flags":"Flags, see TL conditional fields","tone":"The tone to edit","displayauthor":"If set, changes whether the current user is publicly credited as the author of the tone (ternary value, can be not set, set and true, set and false).","emojiid":"If set, the new custom emoji ID of the tone's icon","title":"If set, the new human-readable tone name, up to aicompose_tone_title_length_max » UTF-8 characters long","prompt":"If set, the new prompt that describes how the AI should rephrase messages using this tone, up to aicompose_tone_prompt_length_max » UTF-8 characters…"},"e":[["400","AICOMPOSE_TONE_INVALID","The specified tone is invalid."]]}}`,
  auth: '{"auth.AcceptLoginToken":{"d":"Accept QR code login token, logging in the app that generated it.","p":{"token":"Login token embedded in QR code, for more info, see login via QR code."},"e":[["400","AUTH_TOKEN_ALREADY_ACCEPTED","The specified auth token was already accepted."],["400","AUTH_TOKEN_EXCEPTION","An error occurred while importing the auth token."],["400","AUTH_TOKEN_EXPIRED","The authorization token has expired."],["400","AUTH_TOKEN_INVALIDX","The specified auth token is invalid."]]},"auth.BindTempAuthKey":{"d":"Binds a temporary authorization key temp_auth_key_id to the permanent authorization key perm_auth_key_id.","p":{"permauthkeyid":"Permanent auth_key_id to bind to","nonce":"Random long from Binding message contents","expiresat":"Unix timestamp to invalidate temporary key, see Binding message contents","encryptedmessage":"See Generating encrypted_message"},"e":[["400","ENCRYPTED_MESSAGE_INVALID","Encrypted message invalid."],["400","EXPIRES_AT_INVALID","The specified expires_at timestamp is invalid."],["400","TEMP_AUTH_KEY_ALREADY_BOUND","The passed temporary key is already bound to another perm_auth_key_id."],["400","TEMP_AUTH_KEY_EMPTY","No temporary auth key provided."]]},"auth.CancelCode":{"d":"Cancel the login verification code","p":{"phonenumber":"Phone number","phonecodehash":"Phone code hash from auth.sendCode"},"e":[["400","PHONE_CODE_EXPIRED","The phone code you provided has expired."],["406","PHONE_NUMBER_INVALID","The phone number is invalid."]]},"auth.CheckPaidAuth":{"d":"Checks the status of a login payment.","p":{"phonenumber":"Phone number","phonecodehash":"The phone code hash obtained from auth.sendCode","formid":"The payment form ID passed to payments.sendPaymentForm."},"e":[["400","PHONE_NUMBER_INVALID","The phone number is invalid."]]},"auth.CheckPassword":{"d":"Try logging to an account protected by a 2FA password.","p":{"password":"The account\'s password (see SRP)"},"e":[["500","AUTH_KEY_UNSYNCHRONIZED","Internal error, please repeat the method call."],["400","PASSWORD_HASH_INVALID","The provided password hash is invalid."],["400","SRP_ID_INVALID","Invalid SRP ID provided."],["400","SRP_PASSWORD_CHANGED","Password has changed."]]},"auth.CheckRecoveryPassword":{"d":"Check if the 2FA recovery code sent using auth.requestPasswordRecovery is valid, before passing it to auth.recoverPassword.","p":{"code":"Code received via email"},"e":[["400","CODE_EMPTY","The provided code is empty."],["400","PASSWORD_RECOVERY_EXPIRED","The recovery code has expired."]]},"auth.DropTempAuthKeys":{"d":"Delete all temporary authorization keys except for the ones specified","p":{"exceptauthkeys":"The auth keys that shouldn\'t be dropped."}},"auth.ExportAuthorization":{"d":"Returns data for copying authorization to another data-center.","p":{"dcid":"Number of a target data-center"},"e":[["400","DC_ID_INVALID","The provided DC ID is invalid."]]},"auth.ExportLoginToken":{"d":"Generate a login token, for login via QR code. The generated login token should be encoded using base64url, then shown as a tg://login?token=base64encodedtoken deep link » in the QR code.","p":{"apiid":"Application identifier (see. App configuration)","apihash":"Application identifier hash (see. App configuration)","exceptids":"List of already logged-in user IDs, to prevent logging in twice with the same user"},"e":[["400","API_ID_INVALID","API ID invalid."],["400","API_ID_PUBLISHED_FLOOD","This API id was published somewhere, you can\'t use it now."],["500","AUTH_RESTART","Restart the authorization process."]]},"auth.FinishFirebasePnvLogin":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/auth.finishFirebasePnvLogin"},"auth.FinishPasskeyLogin":{"d":"Complete login with a passkey over an unauthenticated connection, see here » for more info.","p":{"flags":"Flags, see TL conditional fields","credential":"Passkey assertion result.","fromdcid":"DC ID used for the initial auth.initPasskeyLogin request; set only if the user\'s DC is different from the DC used for the initial…","fromauthkeyid":"Auth key ID for the connection to from_dc_id (use the permanent auth key ID if PFS is enabled); set only if the user\'s DC is different from the DC…"},"e":[["500","AUTH_RESTART","Restart the authorization process."],["400","CREDENTIAL_INVALID","The specified credential is invalid."],["400","PASSKEY_ORIGIN_MISMATCH","Third-party clients currently don\'t support passkeys even when changing the origin."]]},"auth.FirebasePnvSignUp":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/auth.firebasePnvSignUp"},"auth.ImportAuthorization":{"d":"Logs in a user using a key transmitted from his native data-center.","p":{"id":"User ID","bytes":"Authorization key"},"e":[["400","AUTH_BYTES_INVALID","The provided authorization is invalid."],["400","USER_ID_INVALID","The provided user ID is invalid."]]},"auth.ImportBotAuthorization":{"d":"Login as a bot","p":{"flags":"Reserved for future use","apiid":"Application identifier (see. App configuration)","apihash":"Application identifier hash (see. App configuration)","botauthtoken":"Bot token (see bots)"},"e":[["400","ACCESS_TOKEN_EXPIRED","Access token expired."],["400","ACCESS_TOKEN_INVALID","Access token invalid."],["400","API_ID_INVALID","API ID invalid."],["400","API_ID_PUBLISHED_FLOOD","This API id was published somewhere, you can\'t use it now."]]},"auth.ImportLoginToken":{"d":"Login using a redirected login token, generated in case of DC mismatch during QR code login.","p":{"token":"Login token"},"e":[["400","AUTH_TOKEN_ALREADY_ACCEPTED","The specified auth token was already accepted."],["400","AUTH_TOKEN_EXPIRED","The authorization token has expired."],["400","AUTH_TOKEN_INVALID","The specified auth token is invalid."],["400","AUTH_TOKEN_INVALIDX","The specified auth token is invalid."]]},"auth.ImportWebTokenAuthorization":{"d":"Login by importing an authorization token","p":{"apiid":"API ID","apihash":"API hash","webauthtoken":"The authorization token"},"e":[["400","API_ID_INVALID","API ID invalid."],["400","WEBAUTH_TOKEN_EXPIRED","The specified auth token has expired."]]},"auth.InitFirebasePnvLogin":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/auth.initFirebasePnvLogin"},"auth.InitPasskeyLogin":{"d":"Initialize login with a passkey over an unauthenticated connection, see here » for more info.","p":{"apiid":"Application identifier (see App configuration)","apihash":"Application identifier hash (see App configuration)"},"e":[["400","API_ID_INVALID","API ID invalid."],["500","AUTH_RESTART","Restart the authorization process."]]},"auth.LogOut":{"d":"Logs out the user."},"auth.RecoverPassword":{"d":"Reset the 2FA password using the recovery code sent using auth.requestPasswordRecovery.","p":{"flags":"Flags, see TL conditional fields","code":"Code received via email","newsettings":"New password"},"e":[["400","CODE_EMPTY","The provided code is empty."],["400","NEW_SETTINGS_INVALID","The new password settings are invalid."]]},"auth.ReportMissingCode":{"d":"Official apps only, reports that the SMS authentication code wasn\'t delivered.","p":{"phonenumber":"Phone number where we were supposed to receive the code","phonecodehash":"The phone code hash obtained from auth.sendCode","mnc":"MNC of the current network operator."},"e":[["400","PHONE_NUMBER_INVALID","The phone number is invalid."]]},"auth.RequestFirebaseSms":{"d":"Request an SMS code via Firebase.","p":{"flags":"Flags, see TL conditional fields","phonenumber":"Phone number","phonecodehash":"Phone code hash returned by auth.sendCode","safetynettoken":"On Android, a JWS object obtained as described in the auth documentation »","playintegritytoken":"On Android, an object obtained as described in the auth documentation »","iospushsecret":"Secret token received via an apple push notification"},"e":[["400","PHONE_CODE_EMPTY","phone_code is missing."],["400","PHONE_NUMBER_INVALID","The phone number is invalid."]]},"auth.RequestPasswordRecovery":{"d":"Request recovery code of a 2FA password, only for accounts with a recovery email configured.","e":[["400","PASSWORD_EMPTY","The provided password is empty."],["400","PASSWORD_RECOVERY_NA","No email was set, can\'t recover password via email."]]},"auth.ResendCode":{"d":"Resend the login code via another medium, the phone code type is determined by the return value of the previous auth.sendCode/auth.resendCode: see login for more info.","p":{"flags":"Flags, see TL conditional fields","phonenumber":"The phone number","phonecodehash":"The phone code hash obtained from auth.sendCode","reason":"Official clients only, used if the device integrity verification failed, and no secret could be obtained to invoke auth.requestFirebaseSms: in this…"},"e":[["400","EMAIL_INSTALL_MISSING","Attempting to send a code to the recovery email, but no email is configured."],["400","PHONE_CODE_EMPTY","phone_code is missing."],["400","PHONE_CODE_EXPIRED","The phone code you provided has expired."],["400","PHONE_CODE_HASH_EMPTY","phone_code_hash is missing."]]},"auth.ResetAuthorizations":{"d":"Terminates all user\'s authorized sessions except for the current one.","e":[["406","FRESH_RESET_AUTHORISATION_FORBIDDEN","You can\'t logout other sessions if less than 24 hours have passed since you logged on the…"]]},"auth.ResetLoginEmail":{"d":"Reset the login email ».","p":{"phonenumber":"Phone number of the account","phonecodehash":"Phone code hash, obtained as described in the documentation »"},"e":[["400","EMAIL_INSTALL_MISSING","Attempting to send a code to the recovery email, but no email is configured."],["400","PHONE_NUMBER_INVALID","The phone number is invalid."],["400","TASK_ALREADY_EXISTS","An email reset was already requested."]]},"auth.SendCode":{"d":"Send the verification code for login","p":{"phonenumber":"Phone number in international format","apiid":"Application identifier (see App configuration)","apihash":"Application secret hash (see App configuration)","settings":"Settings for the code type to send"},"e":[["400","API_ID_INVALID","API ID invalid."],["400","API_ID_PUBLISHED_FLOOD","This API id was published somewhere, you can\'t use it now."],["500","AUTH_RESTART","Restart the authorization process."],["500","AUTH_RESTART_%d","Internal error (debug info %d), please repeat the method call."]]},"auth.SignIn":{"d":"Signs in a user with a validated phone number.","p":{"flags":"Flags, see TL conditional fields","phonenumber":"Phone number in the international format","phonecodehash":"SMS-message ID, obtained from auth.sendCode","phonecode":"Valid numerical code from the SMS-message","emailverification":"Email verification code or token"},"e":[["500","AUTH_RESTART","Restart the authorization process."],["400","PHONE_CODE_EMPTY","phone_code is missing."],["400","PHONE_CODE_EXPIRED","The phone code you provided has expired."],["400","PHONE_CODE_INVALID","The provided phone code is invalid."]]},"auth.SignUp":{"d":"Registers a validated phone number in the system.","p":{"flags":"Flags, see TL conditional fields","nojoinednotifications":"If set, users on Telegram that have already added phone_number to their contacts will not receive signup notifications about this user.","phonenumber":"Phone number in the international format","phonecodehash":"SMS-message ID","firstname":"New user first name","lastname":"New user last name"},"e":[["400","FIRSTNAME_INVALID","The first name is invalid."],["400","LASTNAME_INVALID","The last name is invalid."],["400","PHONE_CODE_EMPTY","phone_code is missing."],["400","PHONE_CODE_EXPIRED","The phone code you provided has expired."]]}}',
  bots: '{"bots.AddPreviewMedia":{"d":"Add a main mini app preview, see here » for more info.","p":{"bot":"The bot that owns the Main Mini App.","langcode":"ISO 639-1 language code, indicating the localization of the preview to add.","media":"The photo/video preview, uploaded using messages.uploadMedia."},"e":[["400","BOT_INVALID","This is not a valid bot."]]},"bots.AllowSendMessage":{"d":"Allow the specified bot to send us messages","p":{"bot":"The bot"},"e":[["400","BOT_INVALID","This is not a valid bot."]]},"bots.AnswerWebhookJSONQuery":{"d":"Answers a custom query; for bots only","p":{"queryid":"Identifier of a custom query","data":"JSON-serialized answer to the query"},"e":[["400","DATA_JSON_INVALID","The provided JSON data is invalid."],["400","QUERY_ID_INVALID","The query ID is invalid."],["400","USER_BOT_REQUIRED","This method can only be called by a bot."]]},"bots.CanSendMessage":{"d":"Check whether the specified bot can send us messages","p":{"bot":"The bot"},"e":[["400","BOT_INVALID","This is not a valid bot."]]},"bots.CheckDownloadFileParams":{"d":"Check if a mini app can request the download of a specific file: called when handling web_app_request_file_download events »","p":{"bot":"The bot that owns the mini app that requested the download","filename":"The filename from the web_app_request_file_download event »","url":"The url from the web_app_request_file_download event »"},"e":[["400","BOT_INVALID","This is not a valid bot."]]},"bots.CheckUsername":{"d":"Check whether a username is available and valid for use when creating a managed bot ».","p":{"username":"Username to check; only letters, digits and underscores are allowed, must end in bot, and the full username must be 5–32 characters long"},"e":[["400","USERNAME_INVALID","The provided username is not valid."],["400","USERNAME_OCCUPIED","The provided username is already occupied."],["400","USERNAME_SUFFIX_MISSING","The required bot suffix is missing from the passed username."]]},"bots.CreateBot":{"d":"Create a managed bot » owned by the current user and controlled by the specified manager bot.","p":{"flags":"Flags, see TL conditional fields","viadeeplink":"Set only if the creation prompt was opened from a managed bot creation request deep link »","name":"Display name of the bot, 1–64 characters","username":"Username for the bot, as validated by bots.checkUsername","managerid":"The manager bot that will control the created bot; must have the user.bot_can_manage_bots flag set"},"e":[["400","BOT_CREATE_LIMIT_EXCEEDED","The current user already owns the maximum allowed number of owned bots, as specified by…"],["400","MANAGER_INVALID","The specified manager bot is invalid."],["400","MANAGER_PERMISSION_MISSING","The specified manager bot does not have the user.bot_can_manage_bots flag set."],["400","NAME_INVALID","The specified bot name is invalid."]]},"bots.DeletePreviewMedia":{"d":"Delete a main mini app preview, see here » for more info.","p":{"bot":"The bot that owns the Main Mini App.","langcode":"ISO 639-1 language code, indicating the localization of the preview to delete.","media":"The photo/video preview to delete, previously fetched as specified here »."},"e":[["400","BOT_INVALID","This is not a valid bot."]]},"bots.EditAccessSettings":{"d":"Edit the access restriction settings » of a managed bot; can only be called by the manager bot.","p":{"flags":"Flags, see TL conditional fields","restricted":"If set, restricts access to the managed bot to only the owner and the users in add_users","bot":"The managed bot whose access settings to edit","addusers":"Additional users (max 10, excluding the owner) allowed to access the managed bot when restricted is set"},"e":[["400","BOT_INVALID","This is not a valid bot."],["400","USER_BOT_REQUIRED","This method can only be called by a bot."]]},"bots.EditPreviewMedia":{"d":"Edit a main mini app preview, see here » for more info.","p":{"bot":"The bot that owns the Main Mini App.","langcode":"ISO 639-1 language code, indicating the localization of the preview to edit.","media":"The photo/video preview to replace, previously fetched as specified here ».","newmedia":"The new photo/video preview, uploaded using messages.uploadMedia."},"e":[["400","BOT_INVALID","This is not a valid bot."]]},"bots.ExportBotToken":{"d":"Export the bot token of a managed bot »; can only be called by the manager bot.","p":{"bot":"The managed bot to export the token for","revoke":"If boolTrue, revoke the current token and generate a new one"},"e":[["400","BOT_INVALID","This is not a valid bot."],["400","USER_BOT_REQUIRED","This method can only be called by a bot."]]},"bots.GetAccessSettings":{"d":"Get the access restriction settings » of a managed bot; can only be called by the manager bot.","p":{"bot":"The managed bot whose access settings to retrieve"},"e":[["400","BOT_INVALID","This is not a valid bot."],["400","USER_BOT_REQUIRED","This method can only be called by a bot."]]},"bots.GetAdminedBots":{"d":"Get a list of bots owned by the current user"},"bots.GetBotCommands":{"d":"Obtain a list of bot commands for the specified bot scope and language code","p":{"scope":"Command scope","langcode":"Language code"},"e":[["400","USER_BOT_REQUIRED","This method can only be called by a bot."]]},"bots.GetBotInfo":{"d":"Get localized name, about text and description of a bot (or of the current account, if called by a bot).","p":{"flags":"Flags, see TL conditional fields","bot":"If called by a user, must contain the peer of a bot we own.","langcode":"Language code, if left empty this method will return the fallback about text and description."},"e":[["400","BOT_INVALID","This is not a valid bot."],["400","LANG_CODE_INVALID","The specified language code is invalid."],["400","USER_BOT_INVALID","User accounts must provide the bot method parameter when calling this method."]]},"bots.GetBotMenuButton":{"d":"Gets the menu button action for a given user or for all users, previously set using bots.setBotMenuButton; users can see this information in the botInfo constructor.","p":{"userid":"User ID or empty for the default menu button."},"e":[["400","USER_BOT_REQUIRED","This method can only be called by a bot."]]},"bots.GetBotRecommendations":{"d":"Obtain a list of similarly themed bots, selected based on similarities in their subscriber bases, see here » for more info.","p":{"bot":"The method will return bots related to the passed bot."},"e":[["400","BOT_INVALID","This is not a valid bot."]]},"bots.GetPopularAppBots":{"d":"Fetch popular Main Mini Apps, to be used in the apps tab of global search ».","p":{"offset":"Offset for pagination, initially an empty string, then re-use the next_offset returned by the previous query.","limit":"Maximum number of results to return, see pagination"}},"bots.GetPreviewInfo":{"d":"Bot owners only, fetch main mini app preview information, see here » for more info.","p":{"bot":"The bot that owns the Main Mini App.","langcode":"Fetch previews for the specified ISO 639-1 language code."},"e":[["400","BOT_INVALID","This is not a valid bot."]]},"bots.GetPreviewMedias":{"d":"Fetch main mini app previews, see here » for more info.","p":{"bot":"The bot that owns the Main Mini App."},"e":[["400","BOT_INVALID","This is not a valid bot."]]},"bots.GetRequestedWebViewButton":{"d":"Fetch the peer request button a bot prepared for a Mini App with bots.requestWebViewButton, invoked when the Mini App emits a web_app_request_chat event, see here » for more info.","p":{"bot":"The bot that owns the Mini App","webappreqid":"The Mini App request ID, taken from the web_app_request_chat event\'s req_id"},"e":[["400","BOT_ID_INVALID","The specified bot ID is invalid."],["400","WEBAPP_REQ_ID_INVALID","The specified webapp_req_id is invalid."]]},"bots.InvokeWebViewCustomMethod":{"d":"Send a custom request from a mini bot app, triggered by a web_app_invoke_custom_method event ».","p":{"bot":"Identifier of the bot associated to the mini bot app","custommethod":"Identifier of the custom method to invoke","params":"Method parameters"},"e":[["400","BOT_INVALID","This is not a valid bot."],["400","DATA_JSON_INVALID","The provided JSON data is invalid."],["400","METHOD_INVALID","The specified method is invalid."]]},"bots.ReorderPreviewMedias":{"d":"Reorder a main mini app previews, see here » for more info.","p":{"bot":"The bot that owns the Main Mini App.","langcode":"ISO 639-1 language code, indicating the localization of the previews to reorder.","order":"New order of the previews."},"e":[["400","BOT_INVALID","This is not a valid bot."]]},"bots.ReorderUsernames":{"d":"Reorder usernames associated to a bot we own.","p":{"bot":"The bot","order":"The new order for active usernames. All active usernames must be specified."},"e":[["400","BOT_INVALID","This is not a valid bot."],["400","USERNAME_NOT_MODIFIED","The username was not modified."]]},"bots.RequestWebViewButton":{"d":"Bots may use this method to prepare a peer request button for a Mini App, see here » for more info.","p":{"userid":"The user that will use the prepared button in the Mini App","button":"The button to prepare, an inputKeyboardButtonRequestPeer of any RequestPeerType"},"e":[["400","BUTTON_INVALID","The specified button is invalid."],["400","USER_BOT_REQUIRED","This method can only be called by a bot."],["400","USER_ID_INVALID","The provided user ID is invalid."]]},"bots.ResetBotCommands":{"d":"Clear bot commands for the specified bot scope and language code","p":{"scope":"Command scope","langcode":"Language code"},"e":[["400","LANG_CODE_INVALID","The specified language code is invalid."],["400","USER_BOT_REQUIRED","This method can only be called by a bot."]]},"bots.SendCustomRequest":{"d":"Sends a custom request; for bots only","p":{"custommethod":"The method name","params":"JSON-serialized method parameters"},"e":[["400","DATA_JSON_INVALID","The provided JSON data is invalid."],["400","METHOD_INVALID","The specified method is invalid."],["400","USER_BOT_REQUIRED","This method can only be called by a bot."]]},"bots.SetBotBroadcastDefaultAdminRights":{"d":"Set the default suggested admin rights for bots being added as admins to channels, see here for more info on how to handle them ».","p":{"adminrights":"Admin rights"},"e":[["400","RIGHTS_NOT_MODIFIED","The new admin rights are equal to the old rights, no change was made."],["400","USER_BOT_REQUIRED","This method can only be called by a bot."]]},"bots.SetBotCommands":{"d":"Set bot command list","p":{"scope":"Command scope","langcode":"Language code","commands":"Bot commands"},"e":[["400","BOT_COMMAND_DESCRIPTION_INVALID","The specified command description is invalid."],["400","BOT_COMMAND_INVALID","The specified command is invalid."],["400","LANG_CODE_INVALID","The specified language code is invalid."],["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"bots.SetBotGroupDefaultAdminRights":{"d":"Set the default suggested admin rights for bots being added as admins to groups, see here for more info on how to handle them ».","p":{"adminrights":"Admin rights"},"e":[["400","RIGHTS_NOT_MODIFIED","The new admin rights are equal to the old rights, no change was made."],["400","USER_BOT_REQUIRED","This method can only be called by a bot."]]},"bots.SetBotInfo":{"d":"Set localized name, about text and description of a bot (or of the current account, if called by a bot).","p":{"flags":"Flags, see TL conditional fields","bot":"If called by a user, must contain the peer of a bot we own.","langcode":"Language code, if left empty update the fallback about text and description","name":"New bot name","about":"New about text","description":"New description"},"e":[["400","BOT_INVALID","This is not a valid bot."],["400","USER_BOT_INVALID","User accounts must provide the bot method parameter when calling this method."]]},"bots.SetBotMenuButton":{"d":"Sets the menu button action » for a given user or for all users","p":{"userid":"User ID","button":"Bot menu button action"},"e":[["400","BUTTON_INVALID","The specified button is invalid."],["400","BUTTON_TEXT_INVALID","The specified button text is invalid."],["400","BUTTON_URL_INVALID","Button URL invalid."],["400","USER_BOT_REQUIRED","This method can only be called by a bot."]]},"bots.SetCustomVerification":{"d":"Verify a user or chat on behalf of an organization ».","p":{"flags":"Flags, see TL conditional fields","enabled":"If set, adds the verification; otherwise removes verification.","bot":"Must not be set if invoked by a bot, must be set to the ID of an owned bot if invoked by a user.","peer":"The peer to verify","customdescription":"Custom description for the verification, the UTF-8 length limit for this field is contained in bot_verification_description_length_limit »."},"e":[["400","BOT_INVALID","This is not a valid bot."],["403","BOT_VERIFIER_FORBIDDEN","This bot cannot assign verification icons."],["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"bots.SetJoinChatResults":{"d":"No official description (may be new in layer 229). See https://core.telegram.org/method/bots.setJoinChatResults"},"bots.ToggleUserEmojiStatusPermission":{"d":"Allow or prevent a bot from changing our emoji status »","p":{"bot":"The bot","enabled":"Whether to allow or prevent the bot from changing our emoji status"},"e":[["400","BOT_INVALID","This is not a valid bot."]]},"bots.ToggleUsername":{"d":"Activate or deactivate a purchased fragment.com username associated to a bot we own.","p":{"bot":"The bot","username":"Username","active":"Whether to activate or deactivate it"},"e":[["400","BOT_INVALID","This is not a valid bot."],["400","USERNAME_NOT_MODIFIED","The username was not modified."]]},"bots.UpdateStarRefProgram":{"d":"Create, edit or delete the affiliate program of a bot we own","p":{"flags":"Flags, see TL conditional fields","bot":"The bot","commissionpermille":"The permille commission rate: it indicates the share of Telegram Stars received by affiliates for every transaction made by users they referred…","durationmonths":"Indicates the duration of the affiliate program; if not set, there is no expiration date."},"e":[["400","BOT_INVALID","This is not a valid bot."],["400","STARREF_AWAITING_END","The previous referral program was terminated less than 24 hours ago: further changes can…"],["400","STARREF_PERMILLE_INVALID","The specified commission_permille is invalid: the minimum and maximum values for this…"],["400","STARREF_PERMILLE_TOO_LOW","The specified commission_permille is too low: the minimum and maximum values for this…"]]},"bots.UpdateUserEmojiStatus":{"d":"Change the emoji status of a user (invoked by bots, see here » for more info on the full flow)","p":{"userid":"The user whose emoji status should be changed","emojistatus":"The emoji status"},"e":[["400","USER_BOT_REQUIRED","This method can only be called by a bot."],["400","USER_ID_INVALID","The provided user ID is invalid."],["403","USER_PERMISSION_DENIED","The user hasn\'t granted or has revoked the bot\'s access to change their emoji status…"]]}}',
