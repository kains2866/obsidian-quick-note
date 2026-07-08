/**
 * Video platform rules for time-jump link generation.
 *
 * When a user opens the popup while a video is playing, we try to construct a
 * shareable URL that jumps to the current playback position. Each platform has
 * its own query parameter format and its own level of support for this feature.
 *
 * Sources:
 * - YouTube: https://developers.google.com/youtube/player_parameters
 * - Bilibili: https://stackoverflow.com/questions/69804828
 * - Vimeo: https://vimeo.com/172825105t=22s
 * - Dailymotion: https://makevideolink.com/resources/share-dailymotion-video-with-start-time
 * - Twitch: https://discuss.dev.twitch.com/t/18179
 * - jsVideoUrlParser: https://github.com/Zod-/jsVideoUrlParser
 */

export interface VideoPlatformRule {
  /** Machine-friendly platform identifier. */
  name: string;
  /** Hostnames that belong to this platform. */
  hosts: string[];
  /** Whether the platform supports a time-jump parameter in the page URL. */
  supportsTimeParam: boolean;
  /** Query parameter name for the time offset (e.g. "t", "start"). */
  timeParam?: string;
  /** Convert seconds into the platform's expected time string. */
  formatTime?: (seconds: number) => string;
  /** Query parameter name used to disable autoplay, if supported. */
  autoplayParam?: string;
  /** Regular expressions for cleaning the site brand out of page titles. */
  titleSuffixes?: RegExp[];
}

function formatTimeHMS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h${m}m${s}s`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}

export const VIDEO_PLATFORM_RULES: VideoPlatformRule[] = [
  // International platforms with time-jump support.
  {
    name: 'youtube',
    hosts: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'],
    supportsTimeParam: true,
    timeParam: 't',
    formatTime: (seconds) => `${seconds}s`,
    autoplayParam: 'autoplay',
    titleSuffixes: [/\s*-\s*YouTube$/i],
  },
  {
    name: 'vimeo',
    hosts: ['vimeo.com'],
    supportsTimeParam: true,
    timeParam: 't',
    formatTime: formatTimeHMS,
  },
  {
    name: 'dailymotion',
    hosts: ['dailymotion.com', 'dai.ly'],
    supportsTimeParam: true,
    timeParam: 'start',
    formatTime: (seconds) => String(seconds),
  },
  {
    name: 'twitch',
    hosts: ['twitch.tv'],
    supportsTimeParam: true,
    timeParam: 't',
    formatTime: formatTimeHMS,
  },

  // Chinese platforms with time-jump support.
  {
    name: 'bilibili',
    hosts: ['bilibili.com', 'b23.tv'],
    supportsTimeParam: true,
    timeParam: 't',
    formatTime: (seconds) => String(seconds),
    autoplayParam: 'autoplay',
    titleSuffixes: [/_哔哩哔哩_bilibili$/i, /\s*-\s*哔哩哔哩$/i],
  },

  // Chinese platforms without a documented/public time-jump parameter.
  {
    name: 'douyin',
    hosts: ['douyin.com', 'iesdouyin.com', 'v.douyin.com'],
    supportsTimeParam: false,
  },
  {
    name: 'kuaishou',
    hosts: ['kuaishou.com', 'kuaishouapp.com'],
    supportsTimeParam: false,
  },
  {
    name: 'xiaohongshu',
    hosts: ['xiaohongshu.com'],
    supportsTimeParam: false,
  },
  {
    name: 'weibo',
    hosts: ['weibo.com', 'weibo.cn'],
    supportsTimeParam: false,
  },
  {
    name: 'iqiyi',
    hosts: ['iqiyi.com', 'iq.com'],
    supportsTimeParam: false,
  },
  {
    name: 'tencent-video',
    hosts: ['v.qq.com'],
    supportsTimeParam: false,
  },
  {
    name: 'youku',
    hosts: ['youku.com', 'youku.tv'],
    supportsTimeParam: false,
  },
  {
    name: 'xigua',
    hosts: ['ixigua.com', 'xiguaapp.com'],
    supportsTimeParam: false,
  },

  // Generic fallback for any other page with an HTML5 <video> element.
  {
    name: 'generic',
    hosts: [],
    supportsTimeParam: false,
  },
];

/**
 * Find the first matching platform rule for a given URL.
 * Falls back to the generic rule if nothing matches.
 */
export function findPlatformRule(url: string): VideoPlatformRule {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const matched = VIDEO_PLATFORM_RULES.find((rule) =>
      rule.hosts.some(
        (host) => hostname === host || hostname.endsWith('.' + host)
      )
    );
    return matched ?? getGenericRule();
  } catch {
    return getGenericRule();
  }
}

function getGenericRule(): VideoPlatformRule {
  const generic = VIDEO_PLATFORM_RULES.find((rule) => rule.name === 'generic');
  if (!generic) {
    throw new Error('Generic video platform rule is missing');
  }
  return generic;
}

/**
 * Clean site-specific suffixes from a page title so the video title reads
 * naturally inside the generated Markdown link.
 */
export function cleanVideoTitle(title: string, rule: VideoPlatformRule): string {
  let cleaned = title.trim();
  for (const pattern of rule.titleSuffixes ?? []) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned.trim() || title.trim() || '当前视频';
}
