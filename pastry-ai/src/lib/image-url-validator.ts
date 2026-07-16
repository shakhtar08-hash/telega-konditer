const TELEGRAM_FILE_URL_PATTERN = /^https:\/\/api\.telegram\.org\/file\/bot\d+:[\w-]+\/.+/;
const DATA_URL_PATTERN = /^data:image\/[\w+.-]+;base64,.+/;
const KIE_RESULT_PATTERN = /^https:\/\/[\w.-]*kie\.ai\/.+/;
const KIE_TEMPFILE_PATTERN = /^https:\/\/[\w.-]*aiquickdraw\.com\/workers\/images\/.+/;
const TRUSTED_HOST_PATTERN = /^https:\/\/[\w.-]*\.(telegram\.org|kie\.ai|openai\.com|openrouter\.ai)\/.*/;

const BLOCKED_IPV4 = [
  "127.0.0.0/8",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "169.254.0.0/16",
  "0.0.0.0/8",
];

const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "169.254.169.254",
  "[::1]",
  "metadata.google.internal",
  "100.100.100.200",
];

function isPrivateIp(host: string): boolean {
  const ipv4Match = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!ipv4Match) return false;

  const octets = [
    parseInt(ipv4Match[1], 10),
    parseInt(ipv4Match[2], 10),
    parseInt(ipv4Match[3], 10),
    parseInt(ipv4Match[4], 10),
  ];

  for (const cidr of BLOCKED_IPV4) {
    const [base, bitsStr] = cidr.split("/");
    const bits = parseInt(bitsStr, 10);
    const baseOctets = base.split(".").map(Number);

    let mask = 0;
    for (let i = 0; i < 4; i++) {
      const shift = 24 - i * 8;
      mask |= (bits >= (i + 1) * 8 ? 255 : Math.max(0, 255 - ((1 << (32 - bits)) - 1) >> (24 - i * 8))) << shift;
    }

    const ipNum = (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3];
    const baseNum = (baseOctets[0] << 24) | (baseOctets[1] << 16) | (baseOctets[2] << 8) | baseOctets[3];

    if ((ipNum & mask) === (baseNum & mask)) return true;
  }

  return false;
}

export function isAllowedImageUrl(url: string): boolean {
  if (DATA_URL_PATTERN.test(url)) return true;
  if (TELEGRAM_FILE_URL_PATTERN.test(url)) return true;

  try {
    const parsed = new URL(url);

    const hostname = parsed.hostname.toLowerCase();

    if (BLOCKED_HOSTS.includes(hostname)) return false;

    if (hostname.endsWith(".internal") || hostname.endsWith(".local")) return false;

    if (isPrivateIp(hostname) || parsed.protocol !== "https:") return false;

    if (KIE_RESULT_PATTERN.test(url)) return true;
    if (KIE_TEMPFILE_PATTERN.test(url)) return true;
    if (TRUSTED_HOST_PATTERN.test(url)) return true;

    return false;
  } catch {
    return false;
  }
}

export function assertAllowedImageUrl(url: string, context: string): void {
  if (!isAllowedImageUrl(url)) {
    throw new Error(
      `SSRF guard blocked URL from ${context}: "${url.slice(0, 100)}" is not in the allowed list`,
    );
  }
}
