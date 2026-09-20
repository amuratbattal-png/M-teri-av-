<?php
declare(strict_types=1);

// En başta ob_start() - bu dosyanın herhangi bir yerinde (require'lar
// dahil) tesadüfen basılan bir PHP uyarısı/notice'i JSON'dan önce
// tarayıcıya gitmesin diye (bkz. helpers.php json_response).
ob_start();

register_shutdown_function(function (): void {
    $error = error_get_last();
    $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR];
    if ($error === null || !in_array($error['type'], $fatalTypes, true)) {
        return;
    }
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => 'fatal_error',
        'message' => $error['message'] . ' (' . $error['file'] . ':' . $error['line'] . ')',
    ], JSON_UNESCAPED_UNICODE);
});

require_once __DIR__ . '/../includes/bootstrap.php';

const HISTORY_LIMIT = 20;

function handle_participant_poll(): void
{
    $eventId = (string) ($_GET['event_id'] ?? '');
    $lang = (string) ($_GET['lang'] ?? '');
    $uiLang = normalize_ui_lang((string) ($_GET['ui'] ?? 'tr'));
    $afterSeq = (int) ($_GET['after_seq'] ?? 0);
    $clientId = (string) ($_GET['client_id'] ?? '');

    $event = $eventId !== '' ? find_event($eventId) : null;
    if (!$event) {
        json_response(['error' => 'event_not_found'], 404);
    }
    if ($lang === '') {
        $lang = $event['source_lang'];
    }

    $pdo = get_pdo();

    if ($clientId !== '') {
        upsert(
            'participant_pings',
            ['event_id' => $eventId, 'client_id' => $clientId, 'lang' => $lang, 'last_seen' => now_iso()],
            ['event_id', 'client_id'],
        );
    }

    $activeSpeaker = find_active_speaker($eventId);
    $activeSpeakerOut = null;
    if ($activeSpeaker) {
        $activeSpeakerOut = [
            'id' => $activeSpeaker['id'],
            'name' => $activeSpeaker['name'],
            'topic' => $uiLang === 'en' ? $activeSpeaker['topic_en'] : $activeSpeaker['topic_tr'],
            'photo' => !empty($activeSpeaker['photo']) ? ('/' . $activeSpeaker['photo']) : null,
        ];
    }

    $placeholderImage = !empty($event['placeholder_image']) ? ('/' . $event['placeholder_image']) : null;

    if ($event['status'] !== 'active') {
        json_response([
            'ended' => true,
            'entries' => [],
            'interim' => '',
            'active_speaker' => $activeSpeakerOut,
            'qa_enabled' => (bool) $event['qa_enabled'],
            'placeholder_image' => $placeholderImage,
        ]);
    }

    if ($afterSeq > 0) {
        $stmt = $pdo->prepare(
            'SELECT * FROM transcript_entries WHERE event_id = ? AND seq > ? ORDER BY seq ASC LIMIT 50',
        );
        $stmt->execute([$eventId, $afterSeq]);
        $rows = $stmt->fetchAll();
    } else {
        $stmt = $pdo->prepare(
            'SELECT * FROM transcript_entries WHERE event_id = ? ORDER BY seq DESC LIMIT ?',
        );
        $stmt->bindValue(1, $eventId);
        $stmt->bindValue(2, HISTORY_LIMIT, PDO::PARAM_INT);
        $stmt->execute();
        $rows = array_reverse($stmt->fetchAll());
    }

    $entries = [];
    foreach ($rows as $row) {
        $translations = json_decode((string) $row['translations'], true);
        if (!is_array($translations)) {
            $translations = [];
        }

        if ($lang === $row['source_lang']) {
            $text = $row['source_text'];
            $ok = true;
        } elseif (isset($translations[$lang])) {
            $text = $translations[$lang];
            $ok = !str_starts_with($text, TRANSLATION_FAILURE_PREFIX);
        } else {
            $result = translate_text($row['source_text'], $row['source_lang'], $lang);
            $text = $result['text'];
            $ok = $result['ok'];
            // BAŞARISIZ olsa bile önbelleğe alınıyor - aksi halde HER
            // katılımcı anketinde (2 saniyede bir!) AYNI eski cümle tekrar
            // tekrar NVIDIA'ya gönderiliyordu ("sistem devamlı aynı şeyleri
            // çevirip duruyor" şikayetinin kök sebebi - ayrıca NVIDIA
            // anahtarı hız sınırına takılmışsa fetch_nvidia_chat()'in kendi
            // yeniden deneme mantığı [en fazla ~75 saniye] HER poll'da
            // tekrar tetiklenip isteği yavaşlatıyordu). Bir cümle bir dil
            // için artık sadece BİR KEZ denenir; sonuç (başarılı ya da
            // TRANSLATION_FAILURE_PREFIX ile işaretli "[çeviri yapılamadı]"
            // metni) kalıcı olarak önbellekte kalır.
            $translations[$lang] = $text;
            $stmt = $pdo->prepare('UPDATE transcript_entries SET translations = ? WHERE id = ?');
            $stmt->execute([json_encode($translations, JSON_UNESCAPED_UNICODE), $row['id']]);
        }

        $entries[] = [
            'id' => $row['id'],
            'seq' => (int) $row['seq'],
            'source_text' => $row['source_text'],
            'source_lang' => $row['source_lang'],
            'lang' => $lang,
            'text' => $text,
            'created_at' => $row['created_at'],
            'translation_ok' => $ok,
        ];
    }

    // İnterim (henüz bitmemiş) altyazı SADECE kaynak dildeki katılımcılara
    // gösteriliyor - çevirisi yok (her poll'da çevirmek maliyetli/gereksiz
    // olurdu, birkaç saniye içinde "final" olacak zaten).
    $interimText = '';
    if ($lang === $event['source_lang']) {
        $stmt = $pdo->prepare('SELECT interim_text FROM event_interim WHERE event_id = ?');
        $stmt->execute([$eventId]);
        $interimText = (string) ($stmt->fetchColumn() ?: '');
    }

    json_response([
        'ended' => false,
        'entries' => $entries,
        'interim' => $interimText,
        'active_speaker' => $activeSpeakerOut,
        'qa_enabled' => (bool) $event['qa_enabled'],
        'placeholder_image' => $placeholderImage,
    ]);
}

try {
    handle_participant_poll();
} catch (Throwable $e) {
    error_log('[participant_poll] ' . $e->getMessage());
    json_response(['error' => 'internal_error', 'message' => $e->getMessage()], 500);
}
