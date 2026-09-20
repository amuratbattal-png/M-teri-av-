<?php
declare(strict_types=1);

/**
 * Katılımcı arayüzü metinleri - "arayüz dili" (TR/EN) için. Bu, "hangi
 * dilde takip etmek istersiniz" (konuşmanın ÇEVRİLECEĞİ dil, ~20 dilden
 * biri) seçiminden TAMAMEN AYRI bir kavram - sadece buton/etiket
 * metinlerini ve konuşmacı konu başlığının hangi sürümünün (topic_tr/
 * topic_en) gösterileceğini belirliyor.
 */
const UI_STRINGS = [
    'tr' => [
        'lang_label' => 'Hangi dilde takip etmek istersiniz?',
        'join' => 'Katıl',
        'tts_on' => 'Sesli Oku: Açık',
        'tts_off' => 'Sesli Oku: Kapalı',
        'leave' => 'Ayrıl',
        'connected' => 'Bağlandı.',
        'connection_issue' => 'Bağlantı sorunu, tekrar denenecek...',
        'ended' => 'Oturum sona erdi.',
        'error_prefix' => 'Hata: ',
        'no_speaker' => 'Şu anda aktif bir konuşmacı yok',
        'ask_question' => 'Soru Sor',
        'ask_question_title' => 'Soru Sor',
        'your_name' => 'Adınız Soyadınız',
        'your_message' => 'Mesajınız',
        'send' => 'Gönder',
        'cancel' => 'Vazgeç',
        'validation_error' => 'Ad soyad ve mesaj boş bırakılamaz.',
        'sent' => 'Sorunuz gönderildi.',
        'not_found' => 'Bu katılım kodu geçerli değil.',
        'tts_unsupported' => 'Bu dil için cihazınızda/tarayıcınızda sesli okuma bulunamadı.',
    ],
    'en' => [
        'lang_label' => 'Which language would you like to follow in?',
        'join' => 'Join',
        'tts_on' => 'Read Aloud: On',
        'tts_off' => 'Read Aloud: Off',
        'leave' => 'Leave',
        'connected' => 'Connected.',
        'connection_issue' => 'Connection issue, retrying...',
        'ended' => 'Session has ended.',
        'error_prefix' => 'Error: ',
        'no_speaker' => 'No active speaker at the moment',
        'ask_question' => 'Ask a Question',
        'ask_question_title' => 'Ask a Question',
        'your_name' => 'Full Name',
        'your_message' => 'Your Message',
        'send' => 'Send',
        'cancel' => 'Cancel',
        'validation_error' => 'Name and message cannot be empty.',
        'sent' => 'Your question has been sent.',
        'not_found' => 'This join code is not valid.',
        'tts_unsupported' => 'No voice available for this language on your device/browser.',
    ],
];

function normalize_ui_lang(string $lang): string
{
    return $lang === 'en' ? 'en' : 'tr';
}

function current_ui_lang(): string
{
    $fromQuery = $_GET['ui'] ?? null;
    if (is_string($fromQuery) && $fromQuery !== '') {
        return normalize_ui_lang($fromQuery);
    }
    $fromCookie = $_COOKIE['ui_lang'] ?? null;
    if (is_string($fromCookie) && $fromCookie !== '') {
        return normalize_ui_lang($fromCookie);
    }
    return 'tr';
}

function t(string $key, string $uiLang): string
{
    return UI_STRINGS[$uiLang][$key] ?? UI_STRINGS['tr'][$key] ?? $key;
}
