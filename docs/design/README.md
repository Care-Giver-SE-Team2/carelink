# Design artefacts

One folder per module owner. Each holds the diagrams that back the report's analysis and
design sections for that owner's use cases: PlantUML source (`.puml`) next to the rendered
`.png`, so a change is a text diff and the picture is regenerated, never hand-edited.

| Folder | Owner | Use cases | Design pattern | Source |
|---|---|---|---|---|
| `manager-b/` | Wang Ziyu | UC-MG04, UC-MG05, UC-MG07, UC-MG08, UC-SYS02 | Chain of Responsibility (escalation chain) | `UC-MG05-activity.puml` |
| `caregiver/` | Wang Chenyu | UC-CG01 – UC-CG06 | State (visit execution) | `UC-CG03-CG05-activity.puml` |
| `family-elder/` | Zheng Zishan | UC-FM06 and the elder/family bindings | to be confirmed | `UC_FM06_Activity.puml` |
| `family/` | Wang Zhili | UC-FM05 | to be confirmed | **missing — PNG only** |
| — | Kok Cheng Da | UC-MG01 (care plan tree) | Composite | not committed yet |

UC-FM06 is the family-side view of the same scenario as UC-MG04: use case specification v3.0
merged the two under UC-MG04 with the manager as primary actor. Keep both diagrams, but say
in the report that they are two views of one flow, not two use cases.

## Conventions

- Commit the `.puml`, not only the `.png`. A picture with no source cannot be reviewed,
  diffed, or corrected by anyone but its author.
- Name files `UC-<id>-activity.puml` and render to the same stem. Two use cases in one
  diagram get both ids in the stem.
- Folder names stay ASCII, lower case, hyphenated. `&` and spaces have to be escaped in
  every shell, URL, and CI path that touches them.
- Render with `java -jar plantuml.jar -tpng <file>.puml` (any PlantUML 1.2024+; the VS Code
  PlantUML extension previews the same source).

## The HTTP contract

Every use case's endpoints live in `docs/api/openapi-draft.yaml`; operations carry
`x-status: draft` until implemented, then move to `docs/api/openapi.yaml`. Browse both at
`/docs/index.html` on a running instance or on the GitHub Pages site.

Edit that file as text. Loading it into a YAML library and dumping it back out rewrites
every line — block scalars, quoting, and list indentation all change — which turns a
five-line edit into a three-thousand-line diff that no one can review and that conflicts
with everybody else's work.
