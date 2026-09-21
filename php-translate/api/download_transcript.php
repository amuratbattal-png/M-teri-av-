<?php
declare(strict_types=1);

// Katılımcıya açık, kimlik doğrulaması olmayan bir uç nokta - "konuşmacı
// konuşmayı bitirince transkript indir" isteği. admin/export_transcript.php
// gibi TÜM etkinliği DEĞİL, sadece TEK bir konuşmacının kendi segmentini,
// katılımcının SEÇTİĞİ dilde (gerekirse çevirip, participant_poll.php'deki
// AYNI önbelleğe-yazma deseniyle) indiriyor.

require_once __DIR__ . '/../includes/bootstrap.php';

function handle_download_transcript(): void
{
    $eventId = (string) ($_GET['event_id'] ?? '');
    $speakerId = (string) ($_GET['speaker_id'] ?? '');
    $lang = (string) ($_GET['lang'] ?? '');

    $event = $eventId !== '' ? find_event($eventId) : null;
    if (!$event) {
        http_response_code(404);
        echo 'Etkinlik bulunamadı.';
        return;
    }

    $speaker = $speakerId !== '' ? find_event_speaker($speakerId) : null;
    if (!$speaker || $speaker['event_id'] !== $eventId) {
        http_response_code(404);
        echo 'Konuşmacı bulunamadı.';
        return;
    }

    // Katılımcı ekranı sadece TR/EN sunuyor (PARTICIPANT_LANGUAGE_CODES) -
    // geçersiz/boş bir dil gelirse konuşmacının kendi konuştuğu dile düşülür.
    if (!in_array($lang, PARTICIPANT_LANGUAGE_CODES, true)) {
        $lang = $speaker['source_lang'];
    }

    $pdo = get_pdo();
    $rows = list_speaker_transcript($eventId, $speakerId);

    $lines = [];
    $lines[] = 'Etkinlik: ' . $event['name'];
    $lines[] = 'Konuşmacı: ' . $speaker['name'];
    $lines[] = 'Dışa aktarma zamanı: ' . now_iso();
    $lines[] = str_repeat('-', 40);
    $lines[] = '';

    if (count($rows) === 0) {
        $lines[] = '(Bu konuşmacı için henüz hiç konuşma kaydedilmedi.)';
    } else {
        foreach ($rows as $row) {
            if ($lang === $row['source_lang']) {
                $text = $row['source_text'];
            } else {
                $translations = json_decode((string) $row['translations'], true);
                if (!is_array($translations)) {
                    $translations = [];
                }
                if (isset($translations[$lang])) {
                    $text = $translations[$lang];
                } else {
                    $result = translate_text($row['source_text'], $row['source_lang'], $lang);
                    $text = $result['text'];
                    // bkz. api/participant_poll.php'deki AYNI yorum - başarısız
                    // olsa bile önbelleğe alınır, aksi halde her indirme denemesi
                    // aynı cümleyi tekrar tekrar NVIDIA'ya gönderir.
                    $translations[$lang] = $text;
                    $stmt = $pdo->prepare('UPDATE transcript_entries SET translations = ? WHERE id = ?');
                    $stmt->execute([json_encode($translations, JSON_UNESCAPED_UNICODE), $row['id']]);
                }
            }
            $lines[] = '[' . $row['created_at'] . '] ' . $text;
        }
    }

    $content = implode("\n", $lines) . "\n";

    $safeName = preg_replace('/[^A-Za-z0-9]+/', '_', $speaker['name']);
    $filename = 'transkript_' . trim((string) $safeName, '_') . '.txt';

    header('Content-Type: text/plain; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . strlen($content));
    echo $content;
}

try {
    handle_download_transcript();
} catch (Throwable $e) {
    error_log('[download_transcript] ' . $e->getMessage());
    http_response_code(500);
    echo 'Bir hata oluştu.';
}
