<?php
declare(strict_types=1);

// bkz. api/participant_poll.php'deki AYNI yorum - JSON'dan önce
// tesadüfen basılan bir PHP uyarısı/hatası bile artık düz JSON dönüyor.
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

/**
 * Konuşmacının kendi mikrofon ekranı (speak.php) için - "sorular
 * konuşmacının oturumunda olduğu için konuşmacının ekranına düşecek"
 * isteği. Admin girişi DEĞİL, speak.php'nin kendi token'ı ile korunuyor
 * (aynı speak_post.php/status.php deseni).
 */
function handle_speaker_questions(): void
{
    $eventId = (string) ($_GET['event_id'] ?? '');
    $token = (string) ($_GET['token'] ?? '');

    $event = $eventId !== '' ? find_event($eventId) : null;
    if (!$event) {
        json_response(['error' => 'event_not_found'], 404);
    }
    if (!hash_equals($event['speaker_token'], $token)) {
        json_response(['error' => 'unauthorized'], 401);
    }

    $activeSpeaker = find_active_speaker($eventId);
    if (!$activeSpeaker) {
        json_response(['questions' => [], 'activeSpeakerId' => null]);
    }

    $rows = list_questions_for_speaker($eventId, $activeSpeaker['id']);
    $questions = array_map(
        static fn (array $q): array => [
            'id' => $q['id'],
            'asker_name' => $q['asker_name'],
            'message' => $q['message'],
            'created_at' => $q['created_at'],
        ],
        $rows,
    );

    json_response(['questions' => $questions, 'activeSpeakerId' => $activeSpeaker['id']]);
}

try {
    handle_speaker_questions();
} catch (Throwable $e) {
    error_log('[speaker_questions] ' . $e->getMessage());
    json_response(['error' => 'internal_error', 'message' => $e->getMessage()], 500);
}
