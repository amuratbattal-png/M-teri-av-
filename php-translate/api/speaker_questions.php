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
 * isteği. Admin girişi DEĞİL, konuşmacının KENDİ token'ı ile korunuyor
 * (aynı speak_post.php deseni). Artık token doğrudan BU konuşmacıyı
 * tanımladığı için (önceden etkinlik-geneli bir token vardı, "o an
 * aktif konuşmacı kim" diye ayrıca sorgulamak gerekiyordu) - kendisine
 * sorulmuş TÜM sorular (aktif olsun olmasın, geçmiş segmentleri dahil)
 * döndürülüyor.
 */
function handle_speaker_questions(): void
{
    $speakerId = (string) ($_GET['speaker_id'] ?? '');
    $token = (string) ($_GET['token'] ?? '');

    $speaker = $speakerId !== '' ? find_event_speaker($speakerId) : null;
    if (!$speaker) {
        json_response(['error' => 'speaker_not_found'], 404);
    }
    if (!hash_equals($speaker['token'], $token)) {
        json_response(['error' => 'unauthorized'], 401);
    }

    $rows = list_questions_for_speaker($speaker['event_id'], $speakerId);
    $questions = array_map(
        static fn (array $q): array => [
            'id' => $q['id'],
            'asker_name' => $q['asker_name'],
            'message' => $q['message'],
            'created_at' => $q['created_at'],
        ],
        $rows,
    );

    json_response(['questions' => $questions]);
}

try {
    handle_speaker_questions();
} catch (Throwable $e) {
    error_log('[speaker_questions] ' . $e->getMessage());
    json_response(['error' => 'internal_error', 'message' => $e->getMessage()], 500);
}
