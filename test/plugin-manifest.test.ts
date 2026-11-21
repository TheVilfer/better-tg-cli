import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertSupported,
  UnsupportedSchemaError,
  validate,
} from "../src/plugins/json-schema.js";
import { MANIFEST_SCHEMAS } from "../src/plugins/manifest-schemas.js";
import {
  checkManifest,
  fileListProblems,
  headingSlug,
  markdownSection,
  pathProblem,
  schemaUrl,
  skillProblems,
  SPEC_VERSION,
} from "../src/plugins/manifest.js";
import type { Manifest } from "../src/plugins/manifest.js";
import {
  compareVersions,
  InvalidRangeError,
  parseVersion,
  satisfies,
} from "../src/plugins/semver.js";

const FIXTURE = "test/fixtures/plugins/tone-of-voice";
const schemaFile = JSON.parse(
  readFileSync(`schemas/tg-plugin/${SPEC_VERSION}.json`, "utf-8")
) as Record<string, unknown>;
const base = (): Manifest =>
  JSON.parse(
    readFileSync(join(FIXTURE, "tg-plugin.json"), "utf-8")
  ) as Manifest;
const bytes = (m: unknown) => new TextEncoder().encode(JSON.stringify(m));
const check = (m: unknown, cli = "0.40.0") => checkManifest(bytes(m), cli);
/** The manifest schema alone (no rule beyond it), as an author's editor would apply it. */
const bySchema = (m: unknown) => validate(schemaFile, m);

describe("the published manifest schema", () => {
  it("is JSON Schema 2020-12 at the URL a manifest names, and the CLI embeds exactly this file", () => {
    expect(schemaFile.$schema).toBe(
      "https://json-schema.org/draft/2020-12/schema"
    );
    expect(schemaFile.$id).toBe(schemaUrl(SPEC_VERSION));
    const dates = readdirSync("schemas/tg-plugin")
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
    expect(Object.keys(MANIFEST_SCHEMAS).sort()).toEqual(dates);
    for (const d of dates) {
      expect(MANIFEST_SCHEMAS[d]).toEqual(
        JSON.parse(readFileSync(`schemas/tg-plugin/${d}.json`, "utf-8"))
      );
    }
  });

  it("uses only keywords the validator implements (an unknown one would make the fixture tests vacuous)", () => {
    expect(() => assertSupported(schemaFile)).not.toThrow();
    expect(() =>
      assertSupported({ type: "object", dependentRequired: { a: ["b"] } })
    ).toThrow(UnsupportedSchemaError);
    expect(() =>
      assertSupported({ $ref: "https://example.com/s.json" })
    ).toThrow(/local \$ref/);
    expect(() =>
      assertSupported({ properties: { a: { unevaluatedProperties: false } } })
    ).toThrow(/unevaluatedProperties/);
  });

  it("accepts the fixture plugins", () => {
    expect(bySchema(base())).toEqual([]);
    for (const dir of readdirSync("test/fixtures/plugins")) {
      const m = JSON.parse(
        readFileSync(
          join("test/fixtures/plugins", dir, "tg-plugin.json"),
          "utf-8"
        )
      );
      expect(bySchema(m), dir).toEqual([]);
    }
  });

  it("rejects bad manifests on its own (negative fixtures)", () => {
    const bad: [string, (m: Record<string, any>) => void, RegExp][] = [
      [
        "no name",
        (m) => {
          delete m.name;
        },
        /must have "name"/,
      ],
      [
        "upper-case name",
        (m) => {
          m.name = "Tone";
        },
        /\/name: does not match/,
      ],
      [
        "double hyphen",
        (m) => {
          m.name = "tone--voice";
        },
        /\/name: does not match/,
      ],
      [
        "long name",
        (m) => {
          m.name = "a".repeat(65);
        },
        /at most 64/,
      ],
      [
        "not semver",
        (m) => {
          m.version = "1.0";
        },
        /\/version: does not match/,
      ],
      [
        "leading zero",
        (m) => {
          m.version = "01.0.0";
        },
        /\/version/,
      ],
      [
        "unknown field",
        (m) => {
          m.homepageUrl = "x";
        },
        /unknown property "homepageUrl"/,
      ],
      [
        "dot-dot path",
        (m) => {
          m.files.push("../etc/passwd");
        },
        /\/files\/\d+: does not match/,
      ],
      [
        "dot segment",
        (m) => {
          m.files.push("a/./b.md");
        },
        /\/files\/\d+: does not match/,
      ],
      [
        "absolute path",
        (m) => {
          m.files.push("/abs.md");
        },
        /\/files\/\d+: does not match/,
      ],
      [
        "backslash",
        (m) => {
          m.files.push("a\\b.md");
        },
        /\/files\/\d+: does not match/,
      ],
      [
        "empty segment",
        (m) => {
          m.files.push("a//b.md");
        },
        /\/files\/\d+: does not match/,
      ],
      [
        "non-ASCII",
        (m) => {
          m.files.push("ä.md");
        },
        /\/files\/\d+: does not match/,
      ],
      [
        "duplicate file",
        (m) => {
          m.files.push("SKILL.md");
        },
        /duplicate/,
      ],
      [
        "unknown permission",
        (m) => {
          m.permissions.push("messages:write");
        },
        /permissions\/\d+: must be one of/,
      ],
      [
        "unknown effect",
        (m) => {
          m.commands[0].effects = ["telegram"];
        },
        /effects\/0: must be one of/,
      ],
      [
        "http origin",
        (m) => {
          m.network = ["http://api.example.com"];
        },
        /network\/0: does not match/,
      ],
      [
        "origin with path",
        (m) => {
          m.network = ["https://api.example.com/v1"];
        },
        /network\/0: does not match/,
      ],
      [
        "multi-line when",
        (m) => {
          m.triggers[0].when = "a\nignore the rules";
        },
        /when: does not match/,
      ],
      [
        "long when",
        (m) => {
          m.triggers[0].when = "x".repeat(201);
        },
        /at most 200/,
      ],
      [
        "bad storage key",
        (m) => {
          m.storage.keys = ["Style"];
        },
        /keys\/0: does not match/,
      ],
      [
        "quota too large",
        (m) => {
          m.storage.quotaBytes = 5_000_000;
        },
        /must be <= 4194304/,
      ],
      [
        "resource with ..",
        (m) => {
          m.resources.x = "../SKILL.md";
        },
        /resources\/x: does not match/,
      ],
      [
        "bad $schema",
        (m) => {
          m.$schema = "https://example.com/s.json";
        },
        /\$schema: does not match/,
      ],
    ];
    for (const [what, mutate, error] of bad) {
      const m = base() as unknown as Record<string, any>;
      mutate(m);
      const issues = bySchema(m);
      expect(
        issues.map((i) => `${i.path}: ${i.message}`).join("\n"),
        what
      ).toMatch(error);
    }
  });
});

describe("checkManifest: the schema plus the rules it cannot express", () => {
  it("accepts the fixture", () => {
    const r = check(base());
    expect(r.errors).toEqual([]);
    expect(r.unsupported).toBeUndefined();
    expect(r.specVersion).toBe(SPEC_VERSION);
  });

  it("a newer spec version is plugin_unsupported with a hint to update, an unknown $schema is invalid", () => {
    expect(
      check({ ...base(), $schema: schemaUrl("2099-01-01") }).unsupported
    ).toMatch(/newer than this CLI supports.*telegram update/);
    expect(
      check({ ...base(), $schema: schemaUrl("2020-01-01") }).unsupported
    ).toMatch(/no longer supports/);
    expect(check({ ...base(), $schema: undefined }).errors[0]).toMatch(
      /"\$schema" must be/
    );
  });

  it('engines: the range is matched against the pinned CLI version; bad syntax is an error, never "satisfied"', () => {
    const m = base();
    m.engines = { "better-tg-cli": ">=0.41.0" };
    expect(check(m, "0.40.0").unsupported).toMatch(
      /needs better-tg-cli >=0\.41\.0; this is 0\.40\.0/
    );
    expect(check(m, "0.41.0").unsupported).toBeUndefined();
    // A candidate of the next version matches only a range naming a prerelease
    expect(check(m, "0.41.0-rc.1").unsupported).toBeDefined();
    m.engines = { "better-tg-cli": ">=0.41.0-rc.0" };
    expect(check(m, "0.41.0-rc.1").unsupported).toBeUndefined();
    m.engines = { "better-tg-cli": ">=0.40 <banana" };
    expect(check(m).errors.join(",")).toMatch(
      /engines\.better-tg-cli: Invalid version "banana"/
    );
  });

  it("Windows-reserved names, a dot at the end, case-insensitive duplicates and file/folder clashes", () => {
    const add = (...files: string[]) => {
      const m = base();
      m.files.push(...files);
      return check(m).errors.join("\n");
    };
    expect(add("CON.md")).toMatch(
      /"CON\.md" uses "CON\.md", a name Windows reserves/
    );
    expect(add("docs/aux")).toMatch(/Windows reserves/);
    expect(add("lpt1.txt")).toMatch(/Windows reserves/);
    expect(add("notes.")).toMatch(/ending in a dot/);
    expect(add("skill.md")).toMatch(
      /"skill\.md" and "SKILL\.md" differ only in case/
    );
    expect(add("Templates/x.md")).toMatch(
      /folders "Templates" and "templates" differ only in case/
    );
    expect(add("onboarding.md/x.md")).toMatch(
      /"onboarding\.md" is a file and also a folder/
    );
  });

  it("pathProblem and fileListProblems agree with the schema pattern and add the rest", () => {
    for (const p of ["SKILL.md", "templates/style.md", "a-b_c.1/x"]) {
      expect(pathProblem(p), p).toBeUndefined();
    }
    for (const p of [
      "",
      "..",
      ".",
      "a/../b",
      "./a",
      "a/",
      "/a",
      "a\\b",
      "nul",
      "x/Com3.js",
      "a".repeat(201),
    ]) {
      expect(pathProblem(p), p).toBeDefined();
    }
    expect(fileListProblems(["A.md", "a.md"])).toHaveLength(1);
  });

  it("references between fields: required files, main, resources, triggers, onboarding, effects and permissions, secrets", () => {
    const errs = (mutate: (m: Manifest) => void) => {
      const m = base();
      mutate(m);
      return check(m).errors.join("\n");
    };
    expect(
      errs((m) => {
        m.files = m.files.filter((f) => f !== "SKILL.md");
      })
    ).toMatch(/files must include SKILL\.md/);
    expect(
      errs((m) => {
        m.files = m.files.filter((f) => f !== "code/plugin.js");
      })
    ).toMatch(/main "code\/plugin\.js" is not in files/);
    expect(
      errs((m) => {
        m.resources!.extra = "missing.md";
      })
    ).toMatch(/resources\.extra: "missing\.md" is not in files/);
    expect(
      errs((m) => {
        m.resources!.extra = "code/plugin.js#x";
      })
    ).toMatch(/#section works only in a Markdown file/);
    expect(
      errs((m) => {
        m.triggers![0].resource = "nope";
      })
    ).toMatch(/triggers\.compose: resource "nope"/);
    expect(
      errs((m) => {
        m.triggers!.push({ ...m.triggers![0] });
      })
    ).toMatch(/id "compose" is used twice/);
    expect(
      errs((m) => {
        m.onboarding!.doneWhen.storage = "other";
      })
    ).toMatch(/doneWhen\.storage: "other" is not in storage\.keys/);
    expect(
      errs((m) => {
        m.commands![0].effects = ["network"];
      })
    ).toMatch(/effect "network" needs the permission "network"/);
    expect(
      errs((m) => {
        m.permissions!.push("network");
      })
    ).toMatch(/"network" needs at least one origin/);
    expect(
      errs((m) => {
        m.network = ["https://api.example.com"];
      })
    ).toMatch(/network lists origins, but permissions lack "network"/);
    expect(
      errs((m) => {
        m.permissions!.push("network");
        m.network = ["https://api.example.com"];
        m.secrets = [
          {
            name: "key",
            description: "API key",
            inject: {
              origin: "https://other.example.com",
              header: "Authorization",
              format: "Bearer {value}",
            },
          },
        ];
      })
    ).toMatch(
      /secrets\.key: origin https:\/\/other\.example\.com is not in network/
    );
    expect(
      errs((m) => {
        delete m.main;
      })
    ).toMatch(/commands need "main"/);
  });

  it("network origins, secret injection and settings defaults (P3): only what the host can keep safe", () => {
    const errs = (mutate: (m: Manifest) => void) => {
      const m = base();
      m.permissions!.push("network");
      m.network = ["https://api.example.com"];
      mutate(m);
      return check(m).errors.join("\n");
    };
    const secret = (inject: Record<string, unknown>) => (m: Manifest) => {
      m.secrets = [
        {
          name: "key",
          description: "API key",
          inject: {
            origin: "https://api.example.com",
            header: "Authorization",
            format: "Bearer {value}",
            ...inject,
          } as never,
        },
      ];
    };
    expect(errs(() => {})).toBe("");
    // Origins: a host name, not an IP (also in decimal), not local, canonical
    for (const o of [
      "https://2130706433",
      "https://127.0.0.1",
      "https://localhost",
      "https://printer.local",
      "https://intranet",
      "https://10.0.0.1:8443",
    ]) {
      expect(
        errs((m) => {
          m.network = [o];
        }),
        o
      ).toMatch(/network(\/0: does not match|: ")/);
    }
    // Secret header: not one the host sets itself; Authorization and custom headers are fine
    for (const h of [
      "Host",
      "Cookie",
      "Content-Length",
      "Transfer-Encoding",
      "Connection",
      "Proxy-Authorization",
      "Proxy-Foo",
      "TE",
    ]) {
      expect(errs(secret({ header: h })), h).toMatch(
        /inject\.header "[^"]+" is a header the host sets itself/
      );
    }
    expect(errs(secret({ header: "X-Api-Key" }))).toBe("");
    // Format: printable, one line, {value} in it
    expect(errs(secret({ format: "Bearer {value}\r\nX-Evil: 1" }))).toMatch(
      /format: does not match/
    );
    expect(errs(secret({ format: "Bearer" }))).toMatch(
      /format: does not match/
    );
    // Two secrets in the same header of the same origin
    expect(
      errs((m) => {
        secret({})(m);
        m.secrets!.push({
          name: "key2",
          description: "x",
          inject: {
            origin: "https://api.example.com",
            header: "authorization",
            format: "{value}",
          },
        });
      })
    ).toMatch(
      /key2: another secret already goes to https:\/\/api\.example\.com as authorization/
    );
    // Settings: the default must be a valid value; keywords fit the type
    const setting = (d: Record<string, unknown>) => (m: Manifest) => {
      m.settings = { s: { type: "string", description: "x", ...d } as never };
    };
    expect(errs(setting({ enum: ["a", "b"], default: "c" }))).toMatch(
      /settings\.s: the default "c" is not a valid value/
    );
    expect(
      errs(setting({ type: "integer", minimum: 1, maximum: 5, default: 9 }))
    ).toMatch(/the default 9 is not a valid value/);
    expect(errs(setting({ type: "integer", default: "x" }))).toMatch(
      /the default "x" is not a valid value/
    );
    expect(errs(setting({ minimum: 1 }))).toMatch(
      /minimum\/maximum need type integer or number/
    );
    expect(errs(setting({ type: "integer", maxLength: 3 }))).toMatch(
      /minLength\/maxLength need type string/
    );
    expect(errs(setting({ type: "integer", enum: ["a"] }))).toMatch(
      /enum value "a" is not of type integer/
    );
    expect(errs(setting({ maxLength: 3, default: "abc" }))).toBe("");
  });

  it("command schemas are self-contained: no external $ref, no other $schema, no $id; the input is an object", () => {
    const errs = (input: Record<string, unknown>) => {
      const m = base();
      m.commands![0].input = input;
      return check(m).errors.join("\n");
    };
    expect(
      errs({
        type: "object",
        properties: { a: { $ref: "https://example.com/a.json" } },
      })
    ).toMatch(
      /\$ref "https:\/\/example\.com\/a\.json" at \/properties\/a is external/
    );
    expect(
      errs({
        type: "object",
        $schema: "http://json-schema.org/draft-07/schema#",
      })
    ).toMatch(/\$schema at \/ must be/);
    expect(errs({ type: "object", $id: "urn:x" })).toMatch(
      /\$id at \/ is not allowed/
    );
    expect(errs({ type: "array" })).toMatch(
      /root must be \{"type": "object"\}/
    );
    expect(
      errs({
        type: "object",
        $defs: { a: { type: "string" } },
        properties: { a: { $ref: "#/$defs/a" } },
      })
    ).toBe("");
  });

  it("a manifest that is too large or not JSON", () => {
    expect(checkManifest(new Uint8Array(70_000), "0.40.0").errors[0]).toMatch(
      /larger than 65536/
    );
    expect(
      checkManifest(new TextEncoder().encode("{"), "0.40.0").errors[0]
    ).toMatch(/not valid UTF-8 JSON/);
    expect(
      checkManifest(new Uint8Array([0x7b, 0xff, 0x7d]), "0.40.0").errors[0]
    ).toMatch(/not valid UTF-8 JSON/);
  });
});

describe("SKILL.md and Markdown sections", () => {
  it("frontmatter name must be the plugin name and the description present", () => {
    expect(
      skillProblems(
        "---\nname: tone-of-voice\ndescription: Writes.\n---\n# x",
        "tone-of-voice"
      )
    ).toEqual([]);
    expect(
      skillProblems(
        "---\nname: \"tone-of-voice\"\ndescription: 'Writes.'\n---\n",
        "tone-of-voice"
      )
    ).toEqual([]);
    expect(
      skillProblems(
        "---\nname: other\ndescription: x\n---\n",
        "tone-of-voice"
      )[0]
    ).toMatch(/must be "tone-of-voice" \(the plugin name\), not "other"/);
    expect(
      skillProblems("---\nname: tone-of-voice\n---\n", "tone-of-voice")[0]
    ).toMatch(/needs a description/);
    expect(skillProblems("# no frontmatter", "tone-of-voice")[0]).toMatch(
      /must start with a YAML frontmatter/
    );
  });

  it("a section runs to the next heading of the same or a higher level, ignoring code fences", () => {
    const md =
      "# T\n\n## Compose\n\nStep 1\n\n### Detail\n\nmore\n\n```\n## fenced\n```\n\n## Next\n\nother";
    expect(markdownSection(md, "compose")).toBe(
      "## Compose\n\nStep 1\n\n### Detail\n\nmore\n\n```\n## fenced\n```"
    );
    expect(markdownSection(md, "fenced")).toBeUndefined();
    expect(markdownSection(md, "next")).toBe("## Next\n\nother");
    expect(headingSlug("Write a Reply: Step 2!")).toBe("write-a-reply-step-2");
  });
});

describe("semver ranges (node-semver syntax)", () => {
  const yes: [string, string][] = [
    ["0.41.0", ">=0.41.0"],
    ["1.2.3", "^1.2.0"],
    ["1.9.0", "^1.2"],
    ["0.2.5", "^0.2.3"],
    ["0.0.3", "^0.0.3"],
    ["1.2.9", "~1.2.3"],
    ["1.4.0", "1.x"],
    ["1.2.7", "1.2.*"],
    ["3.0.0", "*"],
    ["2.0.0", "1.0.0 - 2.0.0"],
    ["2.3.9", "1.2 - 2.3"],
    ["0.5.0", "<0.1.0 || >=0.5.0"],
    ["1.2.3", "=1.2.3"],
    ["1.2.3", "v1.2.3"],
    ["1.2.0", ">= 1.2 < 1.3"],
    ["1.0.0-rc.2", ">=1.0.0-rc.1"],
    ["1.2.0", ">1.1"],
  ];
  const no: [string, string][] = [
    ["0.40.0", ">=0.41.0"],
    ["2.0.0", "^1.2.0"],
    ["0.3.0", "^0.2.3"],
    ["0.0.4", "^0.0.3"],
    ["1.3.0", "~1.2.3"],
    ["2.4.0", "1.2 - 2.3"],
    ["0.41.0-rc.1", ">=0.40.0"],
    ["1.1.5", ">1.1"],
    ["1.3.0", "<=1.2"],
    ["1.2.0", "<1.2"],
    ["1.0.0-rc.1", ">=1.0.0-rc.2"],
    ["2.0.0-rc.1", ">=1.0.0-rc.1"],
  ];

  it.each(yes)("%s satisfies %s", (v, r) => expect(satisfies(v, r)).toBe(true));

  it.each(no)("%s does not satisfy %s", (v, r) =>
    expect(satisfies(v, r)).toBe(false)
  );

  it("syntax it does not implement throws instead of matching", () => {
    for (const r of [
      ">=x.1",
      "1.x.3",
      "banana",
      ">=1.0.0 - 2",
      "~=1.0",
      "1.2.3.4",
      "^^1",
    ]) {
      expect(() => satisfies("1.0.0", r), r).toThrow(InvalidRangeError);
    }
  });

  it("orders prereleases as SemVer 2.0 says", () => {
    const order = [
      "1.0.0-alpha",
      "1.0.0-alpha.1",
      "1.0.0-alpha.beta",
      "1.0.0-beta",
      "1.0.0-beta.2",
      "1.0.0-beta.11",
      "1.0.0-rc.1",
      "1.0.0",
    ];
    for (let i = 1; i < order.length; i++) {
      expect(
        compareVersions(parseVersion(order[i - 1])!, parseVersion(order[i])!),
        order[i]
      ).toBe(-1);
    }
  });
});
