# Design artefacts

One folder per module owner. Each holds the diagrams that back the report's analysis and
design sections for that owner's use cases: PlantUML source (`.puml`) next to the rendered
`.png`, so a change is a text diff and the picture is regenerated, never hand-edited.

| Folder | Owner | Use cases |
|---|---|---|
| `manager-b/` | Wang Ziyu | UC-MG04, UC-MG05, UC-MG07, UC-MG08, UC-SYS02 — escalation chain (Chain of Responsibility) |

Render: `java -jar plantuml.jar -tpng <file>.puml` (any PlantUML 1.2024+; the VS Code
PlantUML extension previews the same source).

The HTTP contract for every use case lives in `docs/api/openapi-draft.yaml` (operations
carry `x-status: draft` until implemented, then move to `openapi.yaml`); browse both at
`/docs/index.html` on a running instance or on the GitHub Pages site.
