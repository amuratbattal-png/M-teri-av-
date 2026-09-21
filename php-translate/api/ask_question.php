<?php
declare(strict_types=1);

// bkz. participant_poll.php'deki AYNI yorum.
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

function handle_ask_question(): void
{
    $input = read_json_body();
    $eventId = (string) ($input['event_id'] ?? '');
    $askerName = trim((string) ($input['asker_name'] ?? ''));
    $askerLang = (string) ($input['asker_lang'] ?? 'tr');
    $message = trim((string) ($input['message'] ?? ''));

    $event = $eventId !== '' ? find_event($eventId) : null;
    if (!$event) {
        json_response(['error' => 'event_not_found'], 404);
    }
    if ($event['status'] !== 'active') {
        json_response(['error' => 'event_ended'], 410);
    }
    // "Soru sorma" artık ETKİNLİK genelinde değil, HER KONUŞMACININ kendi
    // ekranından (speak.php) açıp kapattığı bir ayar - bu yüzden burada
    // AKTİF konuşmacının kendi qa_enabled'ına bakılıyor. Aktif konuşmacı
    // yoksa soru soracak kimse yok demektir, reddediliyor.
    $activeSpeaker = find_active_speaker($eventId);
    if (!$activeSpeaker) {
        json_response(['error' => 'no_active_speaker'], 403);
    }
    if (!$activeSpeaker['qa_enabled']) {
        json_response(['error' => 'qa_disabled'], 403);
    }
    // Sunucu tarafında da doğrulanıyor - istemci tarafı doğrulama (bkz.
    // join.php) atlanabilir/devre dışı bırakılabilir, bu yüzden burada
    // TEKRAR kontrol edilmesi şart: ad soyad VE mesaj ikisi de dolu olmalı.
    if ($askerName === '' || $message === '') {
        json_response(['error' => 'validation_error', 'message' => 'İsim ve mesaj boş olamaz.'], 422);
    }

    $pdo = get_pdo();
    $stmt = $pdo->prepare(
        'INSERT INTO questions (id, event_id, speaker_id, asker_name, asker_lang, message, translations, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    $stmt->execute([
        new_id(),
        $eventId,
        $activeSpeaker['id'],
        $askerName,
        $askerLang,
        $message,
        '{}',
        now_iso(),
    ]);

    json_response(['ok' => true]);
}

try {
    handle_ask_question();
} catch (Throwable $e) {
    error_log('[ask_question] ' . $e->getMessage());
    json_response(['error' => 'internal_error', 'message' => $e->getMessage()], 500);
}
