import re

with open("docs/CHANGELOG.md", "r", encoding="utf-8") as f:
    content = f.read()

new_log = """### Fixed
- **SEO Optimization**: Fixed identical meta description issues reported by Bing. `docs` tutorial pages now have distinct, dynamic meta descriptions from `games` pages, and the `pk-arena` route now uses its own dedicated SEO keywords instead of inheriting from `lobby`.
- **MIME Type Error (Cloudflare Pages)**: Resolved a strict MIME type checking error ("Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of text/html") caused by Cloudflare Early Hints preloading relative chunks. Added `baseHref: "/"` to `angular.json` to force absolute paths.
- **Build Budgets**: Increased Angular initial bundle size budget in `angular.json` to fix `bundle initial exceeded maximum budget` build failures.
- **I18n (Internationalization)**: Abstracted hardcoded Chinese texts in `game-lobby-panel` and `docs` components into translation JSON files across all 8 languages.

"""

content = content.replace("## [Unreleased]\n", "## [Unreleased]\n" + new_log)

with open("docs/CHANGELOG.md", "w", encoding="utf-8") as f:
    f.write(content)
