export type Language = 'zh-CN' | 'en';

export function getLanguage(): Language {
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
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
    optionsTitle: 'Obsidian Quick Note 设置',
    vaultNameLabel: 'Obsidian 仓库名',
    vaultNamePlaceholder: '例如：MyVault',
    vaultNameHint: '在 Obsidian 左下角看到的仓库名称，必须完全一致。',
    baseFolderLabel: '默认保存文件夹',
    dateTemplateLabel: '日期子目录模板',
    savePathPreview: '保存位置预览',
    savePathPreviewPlaceholder: '请先填写 Obsidian 仓库名',
    includeSelectedText: '选中文字自动带入正文',
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
    dateTemplateError: '（日期模板格式错误）',
    exampleNote: '示例笔记.md',
    baseFolderEmptyHint: '默认保存文件夹为空，将保存到仓库根目录',
    dateTemplateEmptyHint: '日期子目录模板为空，不创建日期子目录',

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
    guideFrontmatterSummary: 'Frontmatter',
    guideFrontmatterDetail: '勾选对应的选项后，保存的 Markdown 文件会在开头生成 YAML frontmatter，包含对应的内容。例如勾选 title 会写入页面标题，勾选 url 会写入来源链接。',
    guideDefaultTagsSummary: '默认标签',
    guideDefaultTagsDetail: '对应 frontmatter 里的 tags，使用逗号分隔多个标签。请注意标签本身不支持空格。',
    guidePermissionSummary: '保存时浏览器询问是否打开 Obsidian？',
    guidePermissionDetail: '这是 Chrome 的安全机制。首次在某个网站保存时，浏览器会询问「是否允许此网站打开 Obsidian」，请勾选始终允许，以后在该网站保存就不会再弹窗。',
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
    optionsTitle: 'Obsidian Quick Note Settings',
    vaultNameLabel: 'Obsidian vault name',
    vaultNamePlaceholder: 'e.g. MyVault',
    vaultNameHint: 'The vault name shown in the bottom-left corner of Obsidian. Must match exactly.',
    baseFolderLabel: 'Default save folder',
    dateTemplateLabel: 'Date subfolder template',
    savePathPreview: 'Save path preview',
    savePathPreviewPlaceholder: 'Please enter your Obsidian vault name',
    includeSelectedText: 'Auto-insert selected text into note',
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
    dateTemplateError: '(date template format error)',
    exampleNote: 'example-note.md',
    baseFolderEmptyHint: 'Default save folder is empty; file will be saved to vault root',
    dateTemplateEmptyHint: 'Date subfolder template is empty; no date subfolder will be created',

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
    guideFrontmatterSummary: 'Frontmatter',
    guideFrontmatterDetail: 'After checking the corresponding options, saved Markdown files will have YAML frontmatter at the beginning containing the corresponding content. For example, checking title will write the page title, and checking url will write the source link.',
    guideDefaultTagsSummary: 'Default tags',
    guideDefaultTagsDetail: 'Corresponds to tags in frontmatter. Use commas to separate multiple tags. Note that tags themselves cannot contain spaces.',
    guidePermissionSummary: 'Why does the browser ask to open Obsidian when saving?',
    guidePermissionDetail: 'This is Chrome\'s security mechanism. The first time you save on a website, the browser will ask "Allow this site to open Obsidian?" Check Always allow, and future saves on that site will not show the dialog.',
    guideTroubleshootSummary: 'Why didn\'t Obsidian open or the note save?',
    guideTroubleshootItem1: 'Confirm the Obsidian vault name matches exactly (case-sensitive) the name shown in the bottom-left corner of Obsidian.',
    guideTroubleshootItem2: 'Confirm the default save folder and date subfolder template are spelled correctly and the folder exists in the vault.',
    guideTroubleshootItem3: 'Confirm Obsidian is installed and can handle obsidian:// links.',

    // test fallback key
    missingKeyThatExistsInEn: 'English fallback',
  },
};

export function t(key: string, replacements?: Record<string, string>): string {
  const lang = getLanguage();
  let text = messages[lang][key] ?? messages['en'][key] ?? key;
  if (replacements) {
    Object.entries(replacements).forEach(([name, value]) => {
      text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), value);
    });
  }
  return text;
}

export function localizePage(): void {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  });
}
