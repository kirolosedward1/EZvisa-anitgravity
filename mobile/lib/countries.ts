export const COUNTRIES: Record<string, string> = { Austria:"🇦🇹",Belgium:"🇧🇪",Bulgaria:"🇧🇬",Croatia:"🇭🇷","Czech Republic":"🇨🇿",Denmark:"🇩🇰",Estonia:"🇪🇪",Finland:"🇫🇮",France:"🇫🇷",Germany:"🇩🇪",Greece:"🇬🇷",Hungary:"🇭🇺",Iceland:"🇮🇸",Italy:"🇮🇹",Latvia:"🇱🇻",Liechtenstein:"🇱🇮",Lithuania:"🇱🇹",Luxembourg:"🇱🇺",Malta:"🇲🇹",Netherlands:"🇳🇱",Norway:"🇳🇴",Poland:"🇵🇱",Portugal:"🇵🇹",Romania:"🇷🇴",Slovakia:"🇸🇰",Slovenia:"🇸🇮",Spain:"🇪🇸",Sweden:"🇸🇪",Switzerland:"🇨🇭" };
export const COUNTRY_LIST = Object.keys(COUNTRIES);
export const POPULAR = ["France","Germany","Italy","Spain","Switzerland"];
export const toSlug = (c: string) => c.toLowerCase().replace(/\s+/g, "-");
export const fromSlug = (s: string) => COUNTRY_LIST.find((c) => toSlug(c) === s) || null;
