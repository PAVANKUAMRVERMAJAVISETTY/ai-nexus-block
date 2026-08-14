# Nexus IDE Project Export Contract

Project file format:

type ProjectFile = {
    path: string;
    content: string;
};

Example:

[
    {
        "path": "package.json",
        "content": "{ ... }"
    },
    {
        "path": "app/page.tsx",
        "content": "..."
    }
]

ZIP generation must:
- preserve relative paths
- create folders automatically
- never allow path traversal
- reject paths containing ../
- reject absolute file paths
- generate project-name.zip
- run on the client where practical

Implementation target:
JSZip + file-saver

This feature remains independent from the AI provider layer.
