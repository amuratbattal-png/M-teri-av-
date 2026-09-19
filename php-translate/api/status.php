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

try {
    $eventId = (string) ($_GET['event_id'] ?? '');
    if ($eventId === '') {
        json_response(['error' => 'missing_event_id'], 400);
    }

    $activeSpeaker = find_active_speaker($eventId);

    json_response([
        'participantCount' => count_active_participants($eventId),
        'activeSpeaker' => $activeSpeaker ? [
            'id' => $activeSpeaker['id'],
            'name' => $activeSpeaker['name'],
            'topic_tr' => $activeSpeaker['topic_tr'],
            'topic_en' => $activeSpeaker['topic_en'],
        ] : null,
    ]);
} catch (Throwable $e) {
    error_log('[status] ' . $e->getMessage());
    json_response(['error' => 'internal_error', 'message' => $e->getMessage()], 500);
}
