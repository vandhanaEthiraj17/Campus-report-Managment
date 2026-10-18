interface TranslateResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: string;
  sourceLanguageName: string;
  targetLanguage: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  hi: 'Hindi',
  en: 'English',
  auto: 'Auto Detected',
};

// Map BCP-47 / ISO codes
const normalizeLangCode = (code?: string): string => {
  if (!code) return 'auto';
  const clean = code.toLowerCase().trim();
  if (clean.startsWith('ta')) return 'ta';
  if (clean.startsWith('te')) return 'te';
  if (clean.startsWith('kn')) return 'kn';
  if (clean.startsWith('hi')) return 'hi';
  if (clean.startsWith('en')) return 'en';
  return clean;
};

// Check if string contains Indic/non-Latin scripts (Tamil, Telugu, Kannada, Devanagari/Hindi)
export const containsNonEnglishScript = (text: string): boolean => {
  if (!text) return false;
  // Unicode ranges:
  // Devanagari (Hindi): \u0900-\u097F
  // Tamil: \u0B80-\u0BFF
  // Telugu: \u0C00-\u0C7F
  // Kannada: \u0C80-\u0CFF
  const indicRegex = /[\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF]/;
  return indicRegex.test(text);
};

export const translateToEnglish = async (
  text: string,
  sourceLang?: string
): Promise<TranslateResult> => {
  const trimmed = (text || '').trim();
  const normalizedSource = normalizeLangCode(sourceLang);

  if (!trimmed) {
    return {
      translatedText: '',
      originalText: '',
      sourceLanguage: normalizedSource,
      sourceLanguageName: LANGUAGE_NAMES[normalizedSource] || 'English',
      targetLanguage: 'en',
    };
  }

  // If source is declared English and contains no Indic characters, return directly
  if (normalizedSource === 'en' && !containsNonEnglishScript(trimmed)) {
    return {
      translatedText: trimmed,
      originalText: trimmed,
      sourceLanguage: 'en',
      sourceLanguageName: 'English',
      targetLanguage: 'en',
    };
  }

  // Attempt 1: Google Translate public endpoint (Fast, high-fidelity for Indic languages)
  try {
    const sl = normalizedSource === 'en' ? 'auto' : (normalizedSource || 'auto');
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=en&dt=t&q=${encodeURIComponent(
      trimmed
    )}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0]
          .map((chunk: any) => (chunk && chunk[0] ? chunk[0] : ''))
          .join('')
          .trim();

        const detectedLang = data[2] ? normalizeLangCode(String(data[2])) : normalizedSource;

        if (translated) {
          return {
            translatedText: translated,
            originalText: trimmed,
            sourceLanguage: detectedLang,
            sourceLanguageName: LANGUAGE_NAMES[detectedLang] || detectedLang.toUpperCase(),
            targetLanguage: 'en',
          };
        }
      }
    }
  } catch (err) {
    console.warn('[Translation] Google endpoint failed, falling back to secondary API:', err);
  }

  // Attempt 2: MyMemory Translated API fallback
  try {
    const langpair = `${normalizedSource === 'auto' ? 'autodetect' : normalizedSource}|en`;
    const fallbackUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      trimmed
    )}&langpair=${langpair}`;

    const fallbackRes = await fetch(fallbackUrl);
    if (fallbackRes.ok) {
      const fbData = await fallbackRes.json();
      const fbTrans = fbData?.responseData?.translatedText?.trim();
      if (fbTrans && fbTrans !== trimmed) {
        return {
          translatedText: fbTrans,
          originalText: trimmed,
          sourceLanguage: normalizedSource,
          sourceLanguageName: LANGUAGE_NAMES[normalizedSource] || 'Auto',
          targetLanguage: 'en',
        };
      }
    }
  } catch (fbErr) {
    console.warn('[Translation] Secondary fallback failed:', fbErr);
  }

  // Fallback: If translation unreachable, return original text safely
  return {
    translatedText: trimmed,
    originalText: trimmed,
    sourceLanguage: normalizedSource,
    sourceLanguageName: LANGUAGE_NAMES[normalizedSource] || 'Unknown',
    targetLanguage: 'en',
  };
};
