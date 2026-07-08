import { EXTENSION_NAME } from './constants.js';

export type Language = 'zh-CN' | 'en';

export function getLanguage(): Language {
  const raw =
    typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage
      ? chrome.i18n.getUILanguage()
      : navigator.language;
  return raw.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

export const messages: Record<Language, Record<string, string>> = {
  'zh-CN': {
    // popup
    saveToObsidian: '保存到 Obsidian',
    saving: '保存中…',
    savedToObsidian: '已保存到 Obsidian',
    saveCancelled: '已取消保存',
    pleaseSetVaultName: '请先填写 Obsidian 仓库名（打开设置）',
    confirmSaveEmptyNote: '编辑器为空，确定要保存空笔记吗？',
    cannotGetCurrentTab: '无法获取当前标签页',
    messageChannelFailed: '消息通道失败',
    unknownError: '未知错误',
    saveToPrefix: '保存到：',
    charCount: '字符',
    none: '无',
    folderLabel: '文件夹',
    folderPlaceholder: '覆盖文件夹',
    filenameLabel: '文件名',
    filenamePlaceholder: '覆盖文件名',
    save: '保存',
    cancel: '取消',
    urlToggle: 'URL',
    titleToggle: '标题',
    enterMarkdown: '输入 Markdown…',
    settings: '设置',
    saveFailedDownloading: '保存失败：{error}，正在下载兜底文件…',
    saveFailedDownloaded: '保存失败：{error}，已下载兜底文件',
    saveFailedDownloadFailed: '保存失败：{error}；兜底下载也失败：{downloadError}',

    // options
    optionsTitle: '{name} 设置',
    vaultNameLabel: 'Obsidian 仓库名',
    vaultNamePlaceholder: '例如：MyVault',
    vaultNameHint: '在 Obsidian 左下角看到的仓库名称，必须完全一致。',
    baseFolderLabel: '默认保存文件夹',
    dateTemplateLabel: '日期子目录模板',
    savePathPreview: '保存位置预览',
    savePathPreviewPlaceholder: '请先填写 Obsidian 仓库名',
    includeSelectedText: '选中文字自动带入正文',
    preserveImagesInSelection: '保留框选内容中的图片链接',
    captureVideoProgress: '呼出时捕获视频播放进度',
    frontmatterLegend: 'Frontmatter',
    dateFormatLabel: 'date 格式',
    dateFormatDate: 'YYYY-MM-DD（日期选择器）',
    dateFormatDatetime: 'YYYY-MM-DD HH:mm:ss',
    dateFormatIso: 'ISO 8601 带时区',
    defaultTagsLabel: '默认标签（逗号分隔）',
    defaultTagsPlaceholder: 'quick-note',
    saveSettings: '保存设置',
    currentShortcut: '当前快捷键：{shortcut}',
    shortcutNotSet: '当前快捷键：未设置',
    shortcutReadFailed: '当前快捷键：无法读取',
    editShortcuts: '编辑快捷键',
    settingsSaved: '设置已保存',
    shortcutLoading: '当前快捷键：读取中…',
    dateTemplateError: '（日期模板格式错误）',
    exampleNote: '示例笔记.md',
    exampleVaultName: 'MyVault',
    baseFolderEmptyHint: '默认保存文件夹为空，将保存到仓库根目录',
    dateTemplateEmptyHint: '日期子目录模板为空，不创建日期子目录',

    // footer
    footerMadeBy: 'Made by',
    footerEmail: '邮件反馈',
    supportDeveloper: '☕ 支持开发者',
    supportQrHint: '如果这款工具帮到了你，可以扫码请作者喝杯咖啡 ☕',
    wechatPayment: '微信支付',
    alipay: '支付宝',
    supportStar: '觉得好用？去 GitHub 给我们点个 ⭐ Star 吧！',

    // guide
    guideTitle: '使用指引与常见问题',
    guideVaultNameSummary: 'Obsidian 仓库名',
    guideVaultNameDetail: '填写你要把 Markdown 文件保存到的仓库名字。仓库名可以在 Obsidian 页面左下角看到；如果你有多个仓库，请填写你希望保存到的那个仓库名。',
    guideVaultNameWarning: '务必填写正确：',
    guideVaultNameWarningDetail: '如果仓库名填错，Obsidian 会弹出 "repository not found" 等错误，但本扩展无法感知 Obsidian 内部是否保存成功，状态栏仍会显示「已保存到 Obsidian」。请确保与 Obsidian 左下角显示的名称完全一致（区分大小写）。',
    guideBaseFolderSummary: '默认保存文件夹',
    guideBaseFolderDetail: 'Markdown 文件默认保存到仓库根目录的指定文件夹里。不填写则直接保存到根目录中。',
    guideDateTemplateSummary: '日期子目录模板',
    guideDateTemplateDetail1: '支持 {{YYYY}}/{{MM}}、{{YYYY}}/doc、{{MM}}/{{DD}}/inbox 这类带日期、时间以及固定文件夹的命名模式，填写后会保存到对应的日期子目录中。不填写则保存到「默认保存文件夹」中。',
    guideDateTemplateDetail2: '可用变量：{{YYYY}} 年、{{MM}} 月、{{DD}} 日、{{HH}} 时、{{mm}} 分、{{ss}} 秒。',
    guideSelectedTextSummary: '选中文字自动带入正文',
    guideSelectedTextDetail: '如果在页面上用鼠标框选了文字，打开本插件时会将选中的文字自动粘贴到文本框中。关闭此选项则不带入正文。',
    guidePreserveImagesSummary: '保留框选内容中的图片链接',
    guidePreserveImagesDetail: '开启后，如果框选的内容中包含图片，图片链接会以 Markdown 图片语法一并带入正文。关闭则只保留纯文本。',
    guideCaptureVideoProgressSummary: '呼出时捕获视频播放进度',
    guideCaptureVideoProgressDetail: '开启后，如果页面正在播放视频，打开插件时会自动把当前播放进度以可点击链接的形式插入草稿。支持 YouTube、Bilibili、Vimeo、Dailymotion、Twitch 等平台；其他平台会回退到当前页面链接。',
    guideImageLimitationSummary: '为什么有些图片框选了但没有被保留？',
    guideImageLimitationDetail: '本功能只能提取标准 HTML 图片标签（&lt;img&gt;）。如果网站使用 Shadow DOM、Canvas 或其他特殊渲染方式（如部分视频网站的评论区），图片可能无法被自动提取，建议遇到这类情况时手动截图。',
    guideFrontmatterSummary: 'Frontmatter',
    guideFrontmatterDetail: '勾选对应的选项后，保存的 Markdown 文件会在开头生成 YAML frontmatter，包含对应的内容。例如勾选 title 会写入页面标题，勾选 url 会写入来源链接。',
    guideDefaultTagsSummary: '默认标签',
    guideDefaultTagsDetail: '对应 frontmatter 里的 tags，使用逗号分隔多个标签。请注意标签本身不支持空格。',
    guidePermissionSummary: '保存时浏览器询问是否打开 Obsidian？',
    guidePermissionDetail: '这是 Chrome 的安全机制。首次在某个网站保存时，浏览器会询问「是否允许此网站打开 Obsidian」，请勾选始终允许，以后在该网站保存就不会再弹窗。',
    guideLanguageSummary: '界面语言',
    guideLanguageDetail: '扩展根据 Chrome 的界面语言自动切换中文或英文。如需更换语言，请调整 Chrome 设置中的显示语言。',
    guideTroubleshootSummary: '为什么 Obsidian 没有打开或笔记没保存？',
    guideTroubleshootItem1: '确认「Obsidian 仓库名」与 Obsidian 左下角显示的名称完全一致（区分大小写）。',
    guideTroubleshootItem2: '确认「默认保存文件夹」和「日期子目录模板」拼写正确，且该文件夹在仓库中真实存在。',
    guideTroubleshootItem3: '确认 Obsidian 已安装且能处理 obsidian:// 链接。',
  },
  'en': {
    // popup
    saveToObsidian: 'Save to Obsidian',
    saving: 'Saving…',
    savedToObsidian: 'Saved to Obsidian',
    saveCancelled: 'Save cancelled',
    pleaseSetVaultName: 'Please set your Obsidian vault name (open settings)',
    confirmSaveEmptyNote: 'The editor is empty. Save an empty note?',
    cannotGetCurrentTab: 'Cannot get current tab',
    messageChannelFailed: 'Message channel failed',
    unknownError: 'Unknown error',
    saveToPrefix: 'Save to: ',
    charCount: 'characters',
    none: 'None',
    folderLabel: 'Folder',
    folderPlaceholder: 'Override folder',
    filenameLabel: 'Filename',
    filenamePlaceholder: 'Override filename',
    save: 'Save',
    cancel: 'Cancel',
    urlToggle: 'URL',
    titleToggle: 'Title',
    enterMarkdown: 'Enter Markdown…',
    settings: 'Settings',
    saveFailedDownloading: 'Save failed: {error}. Downloading fallback file…',
    saveFailedDownloaded: 'Save failed: {error}. Fallback file downloaded',
    saveFailedDownloadFailed: 'Save failed: {error}; fallback download also failed: {downloadError}',

    // options
    optionsTitle: '{name} Settings',
    vaultNameLabel: 'Obsidian vault name',
    vaultNamePlaceholder: 'e.g. MyVault',
    vaultNameHint: 'The vault name shown in the bottom-left corner of Obsidian. Must match exactly.',
    baseFolderLabel: 'Default save folder',
    dateTemplateLabel: 'Date subfolder template',
    savePathPreview: 'Save path preview',
    savePathPreviewPlaceholder: 'Please enter your Obsidian vault name',
    includeSelectedText: 'Auto-insert selected text into note',
    preserveImagesInSelection: 'Preserve image links in selected content',
    captureVideoProgress: 'Capture video playback progress on open',
    frontmatterLegend: 'Frontmatter',
    dateFormatLabel: 'date format',
    dateFormatDate: 'YYYY-MM-DD (date picker)',
    dateFormatDatetime: 'YYYY-MM-DD HH:mm:ss',
    dateFormatIso: 'ISO 8601 with timezone',
    defaultTagsLabel: 'Default tags (comma separated)',
    defaultTagsPlaceholder: 'quick-note',
    saveSettings: 'Save settings',
    currentShortcut: 'Current shortcut: {shortcut}',
    shortcutNotSet: 'Current shortcut: not set',
    shortcutReadFailed: 'Current shortcut: unable to read',
    editShortcuts: 'Edit shortcuts',
    settingsSaved: 'Settings saved',
    shortcutLoading: 'Current shortcut: loading…',
    dateTemplateError: '(date template format error)',
    exampleNote: 'example-note.md',
    exampleVaultName: 'MyVault',
    baseFolderEmptyHint: 'Default save folder is empty; file will be saved to vault root',
    dateTemplateEmptyHint: 'Date subfolder template is empty; no date subfolder will be created',

    // footer
    footerMadeBy: 'Made by',
    footerEmail: 'Email',
    supportDeveloper: '☕ Support developer',
    supportQrHint: 'If this tool helps, buy the author a coffee ☕',
    wechatPayment: 'WeChat Pay',
    alipay: 'Alipay',
    supportStar: 'Find it helpful? Give us a ⭐ Star on GitHub!',

    // guide
    guideTitle: 'Guide & FAQ',
    guideVaultNameSummary: 'Obsidian vault name',
    guideVaultNameDetail: 'Enter the name of the Obsidian vault where you want to save Markdown files. You can see the vault name in the bottom-left corner of Obsidian. If you have multiple vaults, enter the one you want to use.',
    guideVaultNameWarning: 'Make sure it is correct:',
    guideVaultNameWarningDetail: 'If the vault name is wrong, Obsidian will show errors like "repository not found", but this extension cannot detect whether Obsidian succeeded internally. The status bar will still show "Saved to Obsidian". Make sure it matches exactly (case-sensitive) the name shown in the bottom-left corner of Obsidian.',
    guideBaseFolderSummary: 'Default save folder',
    guideBaseFolderDetail: 'Markdown files are saved to a folder under the vault root by default. Leave empty to save directly to the vault root.',
    guideDateTemplateSummary: 'Date subfolder template',
    guideDateTemplateDetail1: 'Supports patterns like {{YYYY}}/{{MM}}, {{YYYY}}/doc, {{MM}}/{{DD}}/inbox that include dates, times, and fixed folder names. After filling in, files are saved to the corresponding date subfolder. Leave empty to save to the "Default save folder".',
    guideDateTemplateDetail2: 'Available variables: {{YYYY}} year, {{MM}} month, {{DD}} day, {{HH}} hour, {{mm}} minute, {{ss}} second.',
    guideSelectedTextSummary: 'Auto-insert selected text',
    guideSelectedTextDetail: 'If text is selected on the page, it will be automatically pasted into the editor when the extension opens. Turn off this option to not bring selected text.',
    guidePreserveImagesSummary: 'Preserve image links in selected content',
    guidePreserveImagesDetail: 'When enabled, if the selected content contains images, their URLs will be included in the note using Markdown image syntax. When disabled, only plain text is kept.',
    guideCaptureVideoProgressSummary: 'Capture video playback progress on open',
    guideCaptureVideoProgressDetail: 'When enabled, if a video is playing on the page, the current playback position will be inserted into the draft as a clickable link when the popup opens. Supports YouTube, Bilibili, Vimeo, Dailymotion, Twitch and others; unsupported platforms fall back to the current page link.',
    guideImageLimitationSummary: 'Why are some selected images not preserved?',
    guideImageLimitationDetail: 'This feature can only extract standard HTML image tags (&lt;img&gt;). If a site uses Shadow DOM, Canvas, or other special rendering techniques (such as some video site comment sections), images may not be automatically extracted. In those cases, please take a manual screenshot.',
    guideFrontmatterSummary: 'Frontmatter',
    guideFrontmatterDetail: 'After checking the corresponding options, saved Markdown files will have YAML frontmatter at the beginning containing the corresponding content. For example, checking title will write the page title, and checking url will write the source link.',
    guideDefaultTagsSummary: 'Default tags',
    guideDefaultTagsDetail: 'Corresponds to tags in frontmatter. Use commas to separate multiple tags. Note that tags themselves cannot contain spaces.',
    guidePermissionSummary: 'Why does the browser ask to open Obsidian when saving?',
    guidePermissionDetail: 'This is Chrome\'s security mechanism. The first time you save on a website, the browser will ask "Allow this site to open Obsidian?" Check Always allow, and future saves on that site will not show the dialog.',
    guideLanguageSummary: 'Language',
    guideLanguageDetail: 'The extension automatically switches between Chinese and English based on Chrome\'s UI language. To change the language, adjust the display language in Chrome settings.',
    guideTroubleshootSummary: 'Why didn\'t Obsidian open or the note save?',
    guideTroubleshootItem1: 'Confirm the Obsidian vault name matches exactly (case-sensitive) the name shown in the bottom-left corner of Obsidian.',
    guideTroubleshootItem2: 'Confirm the default save folder and date subfolder template are spelled correctly and the folder exists in the vault.',
    guideTroubleshootItem3: 'Confirm Obsidian is installed and can handle obsidian:// links.',
  },
};

export function t(key: string, replacements?: Record<string, string>): string {
  const lang = getLanguage();
  let text = messages[lang][key] ?? messages['en'][key] ?? key;
  // Replace the extension name placeholder first so callers can still override
  // it via replacements if they ever need to.
  text = text.replace(/\{name\}/g, EXTENSION_NAME);
  if (replacements) {
    Object.entries(replacements).forEach(([name, value]) => {
      text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), () => value);
    });
  }
  return text;
}

export function localizePage(): void {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      const translated = t(key);
      // Translations with inline HTML (e.g. <code>, <b>) are rendered as HTML.
      // This is safe because all translations are internal/static, not user-generated.
      if (translated.includes('<') && translated.includes('>')) {
        el.innerHTML = translated;
      } else {
        el.textContent = translated;
      }
    }
  });
}

export function localizePlaceholders(): void {
  document
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input[data-i18n-placeholder], textarea[data-i18n-placeholder]',
    )
    .forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.placeholder = t(key);
      }
    });
}
