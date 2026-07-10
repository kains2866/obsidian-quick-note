# Obsidian Quick Note

A Chrome extension to quickly capture Markdown notes from any web page and save them to your Obsidian vault.

[中文 README](./README.md) | [Chrome Web Store](https://chromewebstore.google.com/detail/obsidian-quick-note/bccahfklfpcbicdgbcakjmjpbeomlhef)

> The legacy version (based on Local REST API) is backed up at: `obsidian-quick-note (old)/`

## Features

- One-click save of Markdown notes to Obsidian
- Auto-switch between Chinese and English UI
- Configurable Obsidian vault name, default folder, and date-based subfolder template
- Real-time save path preview
- Frontmatter support: `title`, `date`, `url`, `author`, `description`, `site`, `tags`
- Temporarily override Frontmatter settings and preview actual values in popup
- Use page title / URL to generate filename
- Selected text can be automatically inserted into the note body
- Image links inside selected content are preserved in their original position (works for standard `<img>` pages; sites using Shadow DOM / Canvas such as some comment sections may not be extractable)
- Popup tag bar: quickly toggle global tags and add temporary tags
- Website auto-tags: automatically check tags based on domain rules
- Theme switcher: light / dark / auto
- Auto-download fallback `.md` file if saving fails
- Draft auto-save and restore
- Temporary override of target folder and filename
- Warn before leaving the options page with unsaved changes

## Prerequisites

- Obsidian desktop app installed.
- Know your **Obsidian vault name** (the name shown in the bottom-left corner of Obsidian).

## Install the Extension

### Install from Web Store (Recommended)

- [Chrome Web Store](https://chromewebstore.google.com/detail/obsidian-quick-note/bccahfklfpcbicdgbcakjmjpbeomlhef)
- Edge Add-ons (coming soon)

### Manual Install

For developers or anyone who wants the latest unreleased version:

```bash
npm install
npm run build
```

Open Chrome → `chrome://extensions` → enable **Developer mode** → click **Load unpacked** → select the `dist/` folder.

## Configure the Extension

1. Right-click the extension icon → **Options** (or click "Settings" in the popup).
2. Enter your **Obsidian vault name** (must match exactly, case-sensitive).
3. Set the default save folder (e.g., `Notes`). Leave empty to save to vault root.
4. Set the date subfolder template (e.g., `{{YYYY}}/{{MM}}`). Leave empty to skip date subfolders.
5. Choose Frontmatter fields and default tags as needed.
6. Save settings.

> ⚠️ **Vault name must be correct**: If the vault name is wrong, Obsidian may show errors like "repository not found". The extension cannot detect whether Obsidian actually saved the note, so the status bar will still show "Saved to Obsidian". Please double-check the vault name against the one shown in Obsidian.

## Usage

1. Click the extension icon to open the popup.
2. Enter Markdown content; if you selected text on the page, it can be auto-inserted.
3. Optionally enable the URL / Title toggle to influence the generated filename.
4. Expand the Frontmatter section to view/adjust fields for this save.
5. Click **Save to Obsidian**.
6. The first time you save on a website, Chrome will ask "Allow this site to open Obsidian?" — check **Always allow**.
7. Obsidian will open/wake up and create the target note.

## How It Works

Same approach as the official Obsidian Web Clipper:

1. The extension copies the Markdown content to the system clipboard.
2. The current tab navigates to `obsidian://new?file=...&vault=...&clipboard`.
3. Obsidian captures the URI, reads the content from the clipboard, and writes it to the vault.

If clipboard writing fails, it automatically falls back to passing content via the URI parameter.

## Language

The extension automatically switches between Chinese and English based on Chrome's UI language:

- Displays Simplified Chinese when Chrome is set to Chinese (`zh-CN`, `zh-TW`, `zh-HK`, etc.).
- Defaults to English for all other languages.

Manual language switching is not supported yet.

## Development

```bash
npm run dev      # development mode
npm test         # run tests
npm run build    # production build
npm run coverage # coverage report
```

## Manual Testing Checklist

1. Build and load the extension in Chrome.
2. Open Options, fill in the vault name, save, and refresh to verify persistence.
3. Open popup on a normal web page; verify URL/Title toggles affect the filename.
4. Expand the Frontmatter section; verify field previews and temporary overrides work.
5. Click save; verify Chrome asks whether to open Obsidian.
6. Check "Always allow" and save again; verify the prompt no longer appears.
7. Verify the note appears at the expected path in your Obsidian vault.
8. Switch Chrome's UI language to English; verify popup and options display in English.
9. Disconnect the current tab or close Obsidian; verify a `.md` file is auto-downloaded on failure.

## Known Limitations

- First-time save on a new domain requires allowing that domain to open Obsidian.
- **Wrong vault name cannot be detected by the extension**: Obsidian will report an error, but the extension will still show a success message. Please verify your vault name carefully.
- Target folders must already exist in the Obsidian vault (`obsidian://new` does not auto-create intermediate folders).
- Filename conflicts are not auto-renamed.
- Language switching is based on Chrome UI language; manual switching is not supported yet.

## Support the Developer

If this tool helps you, consider buying the author a coffee ☕

| WeChat | Alipay |
| :---: | :---: |
| ![WeChat Pay](./public/assets/wechat-qr.jpg) | ![Alipay](./public/assets/alipay-qr.jpg) |

## Acknowledgments

- The metadata extraction strategy (author, description, site, etc.) is inspired by [Defuddle](https://github.com/kepano/defuddle), the open-source library behind [Obsidian Web Clipper](https://github.com/obsidianmd/obsidian-clipper). The extraction logic in this extension is implemented independently and does not copy its source code.
