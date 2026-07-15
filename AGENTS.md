<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Commands

- Don't run dev server commands (e.g. `bun run dev`) -> assume it's already running.
- Don't run build commands unless specifically told to.
- Focus on checking commands like `bun run lint` etc.
