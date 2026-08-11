/**
 * Starter project templates for the Nexus IDE.
 *
 * Templates are plain data: a list of project-relative paths and their initial
 * contents. They are materialized through the same validated file-creation path
 * as user and AI writes, so a template can never introduce an unsafe path.
 */

import type { IdePackageManager } from '@/types/ide';

export interface IdeTemplateFile {
  path: string;
  content: string;
}

export interface IdeTemplate {
  id: string;
  label: string;
  description: string;
  category: 'frontend' | 'backend' | 'fullstack' | 'ai' | 'data' | 'tool';
  framework: string;
  primaryLanguage: string;
  packageManager: IdePackageManager;
  /** What a student should expect to learn from this template. */
  learn: string[];
  files: IdeTemplateFile[];
}

const README = (name: string, body: string) => `# ${name}

${body}

## Getting started

This project lives in your Nexus IDE workspace. To run commands
(\`install\`, \`build\`, \`test\`), pair a **Nexus Local Development Agent** from the
Terminal panel — commands execute on your own machine, never on the server.

## Structure

See the Explorer panel on the left. Ask the Nexus AI Assistant
"Explain this project architecture" for a guided tour.
`;

export const ideTemplates: IdeTemplate[] = [
  {
    id: 'blank',
    label: 'Blank Project',
    description: 'An empty workspace with just a README. Bring your own structure.',
    category: 'tool',
    framework: 'None',
    primaryLanguage: 'markdown',
    packageManager: 'none',
    learn: ['Project structure', 'File organization'],
    files: [
      { path: 'README.md', content: README('Blank Project', 'An empty Nexus IDE workspace.') },
    ],
  },

  {
    id: 'nextjs_fullstack',
    label: 'Full Stack — Next.js',
    description: 'App Router pages, an API route, and a typed lib layer.',
    category: 'fullstack',
    framework: 'Next.js',
    primaryLanguage: 'typescript',
    packageManager: 'npm',
    learn: [
      'Next.js App Router and file-based routing',
      'Server vs client components',
      'API route handlers',
      'TypeScript module boundaries',
    ],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: 'nexus-fullstack-app',
            version: '0.1.0',
            private: true,
            scripts: {
              dev: 'next dev',
              build: 'next build',
              start: 'next start',
              lint: 'next lint',
              typecheck: 'tsc --noEmit',
            },
            dependencies: { next: '^14.2.0', react: '^18.3.1', 'react-dom': '^18.3.1' },
            devDependencies: {
              typescript: '^5.4.0',
              '@types/react': '^18.3.0',
              '@types/node': '^20.12.0',
            },
          },
          null,
          2
        ),
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2020',
              lib: ['dom', 'dom.iterable', 'esnext'],
              strict: true,
              noEmit: true,
              esModuleInterop: true,
              module: 'esnext',
              moduleResolution: 'bundler',
              jsx: 'preserve',
              incremental: true,
              paths: { '@/*': ['./*'] },
            },
            include: ['**/*.ts', '**/*.tsx'],
            exclude: ['node_modules'],
          },
          null,
          2
        ),
      },
      {
        path: 'app/layout.tsx',
        content: `export const metadata = {
  title: 'Nexus Full Stack App',
  description: 'Created in the Nexus IDE',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
      },
      {
        path: 'app/page.tsx',
        content: `import { getGreeting } from '@/lib/greeting';

export default function HomePage() {
  return (
    <main style={{ padding: 32, fontFamily: 'system-ui' }}>
      <h1>{getGreeting('developer')}</h1>
      <p>Edit app/page.tsx to get started.</p>
    </main>
  );
}
`,
      },
      {
        path: 'app/api/health/route.ts',
        content: `import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
`,
      },
      {
        path: 'lib/greeting.ts',
        content: `export function getGreeting(name: string): string {
  return \`Hello, \${name}!\`;
}
`,
      },
      { path: '.env.example', content: 'NEXT_PUBLIC_APP_NAME=Nexus Full Stack App\n' },
      { path: '.gitignore', content: 'node_modules\n.next\n.env.local\n' },
      {
        path: 'README.md',
        content: README('Nexus Full Stack App', 'A Next.js App Router project with an API route and a typed lib layer.'),
      },
    ],
  },

  {
    id: 'react_frontend',
    label: 'Frontend — React + Vite',
    description: 'A component-driven single page app with a clean entry point.',
    category: 'frontend',
    framework: 'React',
    primaryLanguage: 'typescript',
    packageManager: 'npm',
    learn: ['Component composition', 'React state and props', 'Vite build tooling'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: 'nexus-react-app',
            version: '0.1.0',
            private: true,
            type: 'module',
            scripts: { dev: 'vite', build: 'tsc && vite build', preview: 'vite preview', typecheck: 'tsc --noEmit' },
            dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' },
            devDependencies: {
              vite: '^5.2.0',
              typescript: '^5.4.0',
              '@vitejs/plugin-react': '^4.2.0',
              '@types/react': '^18.3.0',
              '@types/react-dom': '^18.3.0',
            },
          },
          null,
          2
        ),
      },
      {
        path: 'index.html',
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nexus React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
      },
      {
        path: 'src/main.tsx',
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
      },
      {
        path: 'src/App.tsx',
        content: `import { useState } from 'react';

export function App() {
  const [count, setCount] = useState(0);

  return (
    <main style={{ padding: 32, fontFamily: 'system-ui' }}>
      <h1>Nexus React App</h1>
      <button onClick={() => setCount((c) => c + 1)}>Clicked {count} times</button>
    </main>
  );
}
`,
      },
      { path: '.gitignore', content: 'node_modules\ndist\n' },
      { path: 'README.md', content: README('Nexus React App', 'A Vite + React + TypeScript single page app.') },
    ],
  },

  {
    id: 'node_api',
    label: 'Backend — Node API',
    description: 'An Express-style HTTP API with routes, a service layer, and tests.',
    category: 'backend',
    framework: 'Express',
    primaryLanguage: 'typescript',
    packageManager: 'npm',
    learn: ['HTTP routing', 'Layered architecture', 'Environment configuration', 'API testing'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: 'nexus-node-api',
            version: '0.1.0',
            private: true,
            scripts: {
              dev: 'node --watch src/server.js',
              start: 'node src/server.js',
              test: 'node --test',
            },
            dependencies: { express: '^4.19.0' },
          },
          null,
          2
        ),
      },
      {
        path: 'src/server.js',
        content: `import express from 'express';
import { healthRouter } from './routes/health.js';

const app = express();
app.use(express.json());
app.use('/health', healthRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(\`API listening on http://localhost:\${port}\`);
});
`,
      },
      {
        path: 'src/routes/health.js',
        content: `import { Router } from 'express';
import { getStatus } from '../services/status.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json(getStatus());
});
`,
      },
      {
        path: 'src/services/status.js',
        content: `export function getStatus() {
  return { status: 'ok', uptime: process.uptime() };
}
`,
      },
      {
        path: 'test/status.test.js',
        content: `import { test } from 'node:test';
import assert from 'node:assert';
import { getStatus } from '../src/services/status.js';

test('status reports ok', () => {
  assert.strictEqual(getStatus().status, 'ok');
});
`,
      },
      { path: '.env.example', content: 'PORT=3000\n' },
      { path: '.gitignore', content: 'node_modules\n.env\n' },
      { path: 'README.md', content: README('Nexus Node API', 'An Express API with a routes/services split and node:test coverage.') },
    ],
  },

  {
    id: 'python_data',
    label: 'Data / Algorithms — Python',
    description: 'A Python project with a module, an entry point, and pytest tests.',
    category: 'data',
    framework: 'Python',
    primaryLanguage: 'python',
    packageManager: 'pip',
    learn: ['Python modules and packages', 'Algorithm implementation', 'pytest fundamentals'],
    files: [
      {
        path: 'main.py',
        content: `from analysis.stats import summarize


def main() -> None:
    data = [4, 8, 15, 16, 23, 42]
    result = summarize(data)
    for key, value in result.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
`,
      },
      {
        path: 'analysis/__init__.py',
        content: '',
      },
      {
        path: 'analysis/stats.py',
        content: `from typing import Sequence


def summarize(values: Sequence[float]) -> dict[str, float]:
    """Return count, mean, minimum and maximum for a sequence of numbers."""
    if not values:
        raise ValueError("values must not be empty")

    total = sum(values)
    return {
        "count": len(values),
        "mean": total / len(values),
        "min": min(values),
        "max": max(values),
    }
`,
      },
      {
        path: 'tests/test_stats.py',
        content: `import pytest

from analysis.stats import summarize


def test_summarize_basic():
    result = summarize([1, 2, 3])
    assert result["count"] == 3
    assert result["mean"] == 2
    assert result["min"] == 1
    assert result["max"] == 3


def test_summarize_rejects_empty():
    with pytest.raises(ValueError):
        summarize([])
`,
      },
      { path: 'requirements.txt', content: 'pytest>=8.0\n' },
      { path: '.gitignore', content: '__pycache__\n.venv\n*.pyc\n' },
      { path: 'README.md', content: README('Nexus Python Project', 'A Python package with tests, ready for algorithm work.') },
    ],
  },

  {
    id: 'java_console',
    label: 'Java — Console Application',
    description: 'A Maven-style Java project with a main class and a JUnit test.',
    category: 'backend',
    framework: 'Java',
    primaryLanguage: 'java',
    packageManager: 'maven',
    learn: ['Java project layout', 'Classes and methods', 'JUnit testing', 'Maven build lifecycle'],
    files: [
      {
        path: 'pom.xml',
        content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.nexus</groupId>
  <artifactId>console-app</artifactId>
  <version>1.0-SNAPSHOT</version>

  <properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>
`,
      },
      {
        path: 'src/main/java/com/nexus/App.java',
        content: `package com.nexus;

public class App {
    public static void main(String[] args) {
        Greeter greeter = new Greeter();
        System.out.println(greeter.greet("developer"));
    }
}
`,
      },
      {
        path: 'src/main/java/com/nexus/Greeter.java',
        content: `package com.nexus;

public class Greeter {
    public String greet(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name must not be blank");
        }
        return "Hello, " + name + "!";
    }
}
`,
      },
      {
        path: 'src/test/java/com/nexus/GreeterTest.java',
        content: `package com.nexus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class GreeterTest {

    @Test
    void greetsByName() {
        assertEquals("Hello, developer!", new Greeter().greet("developer"));
    }

    @Test
    void rejectsBlankName() {
        assertThrows(IllegalArgumentException.class, () -> new Greeter().greet(" "));
    }
}
`,
      },
      { path: '.gitignore', content: 'target\n*.class\n' },
      { path: 'README.md', content: README('Nexus Java Console App', 'A Maven Java 17 project with JUnit 5 tests.') },
    ],
  },

  {
    id: 'ai_project',
    label: 'AI Project — Provider Abstraction',
    description: 'A multi-provider AI client with a clean interface and a prompt registry.',
    category: 'ai',
    framework: 'Node',
    primaryLanguage: 'typescript',
    packageManager: 'npm',
    learn: [
      'Provider abstraction and dependency inversion',
      'Prompt management',
      'Keeping API keys server-side',
      'Handling provider errors and retries',
    ],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: 'nexus-ai-project',
            version: '0.1.0',
            private: true,
            type: 'module',
            scripts: { start: 'node --experimental-strip-types src/index.ts', typecheck: 'tsc --noEmit' },
            devDependencies: { typescript: '^5.4.0', '@types/node': '^20.12.0' },
          },
          null,
          2
        ),
      },
      {
        path: 'src/providers/types.ts',
        content: `export interface CompletionRequest {
  prompt: string;
  system?: string;
  maxTokens?: number;
}

export interface CompletionResult {
  text: string;
  provider: string;
  tokensUsed: number;
}

export interface AIProvider {
  readonly id: string;
  isConfigured(): boolean;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}
`,
      },
      {
        path: 'src/providers/registry.ts',
        content: `import type { AIProvider } from './types.js';

const registry = new Map<string, AIProvider>();

export function register(provider: AIProvider): void {
  registry.set(provider.id, provider);
}

/** Returns the first configured provider, so a missing key degrades instead of crashing. */
export function resolveProvider(preferred?: string): AIProvider {
  if (preferred) {
    const match = registry.get(preferred);
    if (match?.isConfigured()) return match;
  }
  for (const provider of registry.values()) {
    if (provider.isConfigured()) return provider;
  }
  throw new Error('No AI provider is configured. Set an API key in your environment.');
}
`,
      },
      {
        path: 'src/prompts.ts',
        content: `export const prompts = {
  summarize: 'Summarize the following text in three bullet points.',
  critique: 'Identify the three most important weaknesses in the following text.',
} as const;

export type PromptKey = keyof typeof prompts;
`,
      },
      {
        path: 'src/index.ts',
        content: `import { resolveProvider } from './providers/registry.js';
import { prompts } from './prompts.js';

async function main() {
  const provider = resolveProvider(process.env.AI_PROVIDER);
  const result = await provider.complete({
    system: prompts.summarize,
    prompt: 'Nexus IDE is a browser-based development workspace.',
  });
  console.log(result.text);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
`,
      },
      { path: '.env.example', content: 'AI_PROVIDER=\nOPENAI_API_KEY=\nANTHROPIC_API_KEY=\nGEMINI_API_KEY=\n' },
      { path: '.gitignore', content: 'node_modules\n.env\n' },
      {
        path: 'README.md',
        content: README(
          'Nexus AI Project',
          'A provider-agnostic AI client. Keys stay in the environment; the registry picks whichever provider is configured.'
        ),
      },
    ],
  },
];

export function getTemplate(id: string): IdeTemplate | undefined {
  return ideTemplates.find((template) => template.id === id);
}

export const defaultTemplateId = 'nextjs_fullstack';
