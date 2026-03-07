import { SupabaseClient } from '@supabase/supabase-js';

/** Anahtar kelime sözlüğü — TR / EN / AZ karışık, tümü lowercase */
export const INTEREST_KEYWORDS: Record<string, string[]> = {
  entertainment: [
    'eglence', 'entertainment', 'show', 'gosteri', 'festival', 'konser', 'eylence',
    'sahne', 'gece', 'parti', 'dans', 'comedy', 'komedi', 'stand-up', 'sou',
  ],
  music: [
    'muzik', 'music', 'sarki', 'song', 'album', 'konser', 'playlist', 'musiqi', 'mahni',
    'rap', 'rock', 'pop', 'jazz', 'hiphop', 'hip-hop', 'singer', 'sarkici', 'melody',
    'beat', 'dj', 'remix', 'acoustic', 'akustik', 'gittar', 'gitar', 'piyano', 'piano',
  ],
  sports: [
    'spor', 'sport', 'futbol', 'football', 'basketbol', 'basketball', 'mac', 'gol',
    'idman', 'voleybol', 'volleyball', 'tenis', 'tennis', 'yuzme', 'kosu', 'maraton',
    'fitness', 'gym', 'antrenman', 'training', 'workout', 'atletizm', 'boks', 'boxing',
    'sampiyonluk', 'lig', 'league', 'olimpiyat', 'olympics',
  ],
  technology: [
    'teknoloji', 'technology', 'yazilim', 'software', 'ai', 'kodlama', 'texnologiya',
    'programlama', 'programming', 'bilgisayar', 'computer', 'yapay-zeka', 'robot',
    'startup', 'uygulama', 'app', 'web', 'mobil', 'mobile', 'cyber', 'siber',
    'blockchain', 'kripto', 'crypto', 'iot', 'cloud', 'devops', 'frontend', 'backend',
  ],
  gaming: [
    'oyun', 'gaming', 'game', 'gamer', 'esports', 'e-spor', 'fps', 'mmorpg',
    'playstation', 'xbox', 'nintendo', 'pc-gaming', 'streamer', 'twitch', 'valorant',
    'minecraft', 'fortnite', 'lol', 'csgo', 'pubg', 'mobil-oyun', 'konsol',
  ],
  food: [
    'yemek', 'food', 'mutfak', 'cooking', 'tarif', 'recipe', 'metbex', 'restoran',
    'restaurant', 'lezzet', 'gurme', 'pasta', 'tatli', 'dessert', 'kahvalti',
    'breakfast', 'aksam-yemegi', 'dinner', 'vegan', 'saglikli-beslenme', 'diyet',
  ],
  fashion: [
    'moda', 'fashion', 'guzellik', 'beauty', 'gozellik', 'stil', 'style', 'giyim',
    'clothing', 'makyaj', 'makeup', 'aksesuar', 'accessory', 'trend', 'outfit',
    'parfum', 'cilt-bakimi', 'skincare', 'sac', 'hair', 'tasarim', 'design',
  ],
  travel: [
    'seyahat', 'travel', 'seyahet', 'gezi', 'turizm', 'tourism', 'tatil', 'vacation',
    'otel', 'hotel', 'ucak', 'flight', 'pasaport', 'passport', 'dunya', 'world',
    'kesfet', 'explore', 'backpack', 'kamp', 'camping', 'plaj', 'beach',
  ],
  education: [
    'egitim', 'education', 'tehsil', 'universite', 'university', 'okul', 'school',
    'ders', 'lesson', 'ogrenme', 'learning', 'kurs', 'course', 'sinav', 'exam',
    'ogrenci', 'student', 'ogretmen', 'teacher', 'akademi', 'academy', 'diploma',
  ],
  news: [
    'haber', 'news', 'xeber', 'gundem', 'agenda', 'son-dakika', 'breaking',
    'politika', 'politics', 'ekonomi', 'economy', 'dunya-haberleri', 'world-news',
    'secim', 'election', 'meclis', 'parlamento', 'gazeteci', 'journalist',
  ],
  art: [
    'sanat', 'art', 'incesenet', 'tasarim', 'design', 'resim', 'painting',
    'heykel', 'sculpture', 'fotograf', 'photography', 'grafik', 'graphic',
    'illustrasyon', 'illustration', 'sergi', 'exhibition', 'galeri', 'gallery',
    'cizim', 'drawing', 'dijital-sanat', 'digital-art',
  ],
  health: [
    'saglik', 'health', 'saglamliq', 'yasam', 'wellness', 'hastane', 'hospital',
    'doktor', 'doctor', 'ilac', 'medicine', 'diyet', 'diet', 'yoga', 'meditasyon',
    'meditation', 'psikoloji', 'psychology', 'mental-saglik', 'mental-health',
    'beslenme', 'nutrition', 'egzersiz', 'exercise',
  ],
  business: [
    'is', 'business', 'biznes', 'finans', 'finance', 'maliyye', 'girisimcilik',
    'entrepreneurship', 'yatirim', 'investment', 'borsa', 'stock', 'para', 'money',
    'kariyer', 'career', 'pazarlama', 'marketing', 'satis', 'sales', 'liderlik',
    'leadership', 'sirket', 'company', 'ekonomi', 'economy',
  ],
  humor: [
    'mizah', 'humor', 'yumor', 'komedi', 'comedy', 'espri', 'joke', 'meme',
    'caps', 'komik', 'funny', 'gulmece', 'saka', 'prank', 'vine', 'parodi',
  ],
  animals: [
    'hayvan', 'animal', 'heyvan', 'kedi', 'cat', 'kopek', 'dog', 'pet',
    'evcil', 'vahsi', 'wild', 'doga', 'nature', 'kus', 'bird', 'balik', 'fish',
    'at', 'horse', 'veteriner', 'zoo', 'pati', 'paw',
  ],
  science: [
    'bilim', 'science', 'elm', 'fizik', 'physics', 'kimya', 'chemistry',
    'biyoloji', 'biology', 'matematik', 'math', 'astronomi', 'astronomy',
    'uzay', 'space', 'nasa', 'deney', 'experiment', 'arastirma', 'research',
    'genetik', 'genetics', 'evrim', 'evolution',
  ],
  automotive: [
    'otomotiv', 'automotive', 'avtomobil', 'araba', 'car', 'otomobil', 'automobile',
    'motor', 'engine', 'suv', 'sedan', 'elektrikli-arac', 'ev', 'tesla',
    'bmw', 'mercedes', 'audi', 'toyota', 'modifiye', 'tuning', 'yaris', 'race',
  ],
  cinema: [
    'sinema', 'cinema', 'kino', 'film', 'movie', 'dizi', 'series', 'tv',
    'netflix', 'imdb', 'yonetmen', 'director', 'oyuncu', 'actor', 'senaryo',
    'screenplay', 'belgesel', 'documentary', 'anime', 'animasyon', 'animation',
  ],
  books: [
    'kitap', 'book', 'kitab', 'edebiyat', 'literature', 'edebiyyat', 'roman',
    'novel', 'yazar', 'author', 'siir', 'poetry', 'hikaye', 'story', 'okuma',
    'reading', 'kutuphane', 'library', 'bestseller', 'klasik', 'classic',
  ],
  lifestyle: [
    'yasam', 'lifestyle', 'heyat', 'gunluk', 'daily', 'rutini', 'routine',
    'dekorasyon', 'decoration', 'ev', 'home', 'bahce', 'garden', 'kendin-yap',
    'diy', 'minimalizm', 'minimalism', 'motivasyon', 'motivation', 'ilham',
    'inspiration', 'trend', 'vlog',
  ],
};

/** Normalize tag: lowercase, Türkçe karakter → ASCII, trim */
function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .replace(/ə/g, 'e').replace(/İ/g, 'i').replace(/Ş/g, 's')
    .replace(/Ç/g, 'c').replace(/Ğ/g, 'g').replace(/Ö/g, 'o')
    .replace(/Ü/g, 'u')
    .replace(/[^a-z0-9-]/g, '')
    .trim();
}

/** Tag isimlerini keyword sözlüğüyle eşleştir, max 3 kategori döndür */
export function classifyPostByTags(
  tagNames: string[]
): { interestId: number; confidence: number }[] {
  const slugToId: Record<string, number> = {
    entertainment: 1, music: 2, sports: 3, technology: 4, gaming: 5,
    food: 6, fashion: 7, travel: 8, education: 9, news: 10,
    art: 11, health: 12, business: 13, humor: 14, animals: 15,
    science: 16, automotive: 17, cinema: 18, books: 19, lifestyle: 20,
  };

  const scores: Record<string, number> = {};
  const normalizedTags = tagNames.map(normalizeTag);

  for (const tag of normalizedTags) {
    if (!tag) continue;
    for (const [slug, keywords] of Object.entries(INTEREST_KEYWORDS)) {
      for (const kw of keywords) {
        if (tag === kw || tag.includes(kw) || kw.includes(tag)) {
          scores[slug] = (scores[slug] || 0) + 1;
          break; // one match per keyword list per tag
        }
      }
    }
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([slug, count]) => ({
      interestId: slugToId[slug],
      confidence: Math.min(1.0, count / normalizedTags.length),
    }));
}

/** Tag ID'lerden isimleri çekip post_interests'e yazar */
export async function classifyAndStorePostInterests(
  admin: SupabaseClient,
  postId: number,
  tagIds: number[]
) {
  try {
    // Get tag names
    const { data: tags } = await admin
      .from('tags')
      .select('name')
      .in('id', tagIds);

    if (!tags || tags.length === 0) return;

    const tagNames = tags.map((t: { name: string }) => t.name);
    const results = classifyPostByTags(tagNames);

    if (results.length === 0) return;

    // Remove old classifications
    await admin.from('post_interests').delete().eq('post_id', postId);

    // Insert new
    await admin.from('post_interests').insert(
      results.map(r => ({
        post_id: postId,
        interest_id: r.interestId,
        confidence: r.confidence,
      }))
    );
  } catch {
    // Non-critical — silently fail
  }
}
