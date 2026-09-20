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
 * Konuşmacının kendi mikrofon ekranından (speak.php) bir soruyu çevirme -
 * admin/translate_question.php ile AYNI mantık (aynı önbellek sütunu,
 * questions.translations - admin ya da konuşmacı hangisi önce çevirirse
 * diğeri de aynı önbellekten yararlanıyor), ama admin oturumu YERİNE
 * speak.php'nin kendi token'ı ile korunuyor (aynı speak_post.php/
 * speaker_questions.php deseni). Soru ayrıca `event_id` eşleşmesiyle de
 * doğrulanıyor - token sadece KENDİ etkinliğindeki sorulara erişebilsin diye.
 */
function handle_speaker_translate_question(): void
{
    $eventId = (string) ($_GET['event_id'] ?? '');
    $token = (string) ($_GET['token'] ?? '');
    $id = (string) ($_GET['id'] ?? '');
    $targetLang = (string) ($_GET['lang'] ?? '');

    $event = $eventId !== '' ? find_event($eventId) : null;
    if (!$event) {
        json_response(['error' => 'event_not_found'], 404);
    }
    if (!hash_equals($event['speaker_token'], $token)) {
        json_response(['error' => 'unauthorized'], 401);
    }

    $pdo = get_pdo();
    $stmt = $pdo->prepare('SELECT * FROM questions WHERE id = ? AND event_id = ?');
    $stmt->execute([$id, $eventId]);
    $question = $stmt->fetch();
    if (!$question) {
        json_response(['error' => 'not_found'], 404);
    }

    $translations = json_decode((string) $question['translations'], true);
    if (!is_array($translations)) {
        $translations = [];
    }

    if ($targetLang === $question['asker_lang']) {
        json_response(['text' => $question['message'], 'ok' => true]);
    }

    if (isset($translations[$targetLang])) {
        json_response(['text' => $translations[$targetLang], 'ok' => true]);
    }

    $result = translate_text($question['message'], $question['asker_lang'], $targetLang);
    if ($result['ok']) {
        $translations[$targetLang] = $result['text'];
        $stmt = $pdo->prepare('UPDATE questions SET translations = ? WHERE id = ?');
        $stmt->execute([json_encode($translations, JSON_UNESCAPED_UNICODE), $id]);
    }

    json_response(['text' => $result['text'], 'ok' => $result['ok']]);
}

try {
    handle_speaker_translate_question();
} catch (Throwable $e) {
    error_log('[speaker_translate_question] ' . $e->getMessage());
    json_response(['error' => 'internal_error', 'message' => $e->getMessage()], 500);
}
