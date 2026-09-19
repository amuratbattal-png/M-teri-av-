<?php
declare(strict_types=1);

// bkz. participant_poll.php'deki AYNI yorum - JSON'dan önce tesadüfen
// basılan bir PHP uyarısı/ölümcül hatası bile artık düz JSON olarak
// dönüyor, tarayıcı tarafında "geçersiz yanıt" hatasına yol açmıyor.
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

function handle_speak_post(): void
{
    $input = read_json_body();
    $sessionId = (string) ($input['session_id'] ?? '');
    $token = (string) ($input['token'] ?? '');
    $type = (string) ($input['type'] ?? '');
    $text = (string) ($input['text'] ?? '');

    $session = $sessionId !== '' ? find_session($sessionId) : null;
    if (!$session) {
        json_response(['error' => 'session_not_found'], 404);
    }
    if ($token !== $session['speaker_token']) {
        json_response(['error' => 'unauthorized'], 401);
    }
    if ($session['status'] !== 'active') {
        json_response(['error' => 'session_ended'], 410);
    }

    $pdo = get_pdo();

    if ($type === 'end_session') {
        $stmt = $pdo->prepare("UPDATE sessions SET status = 'ended', ended_at = ? WHERE id = ?");
        $stmt->execute([now_iso(), $sessionId]);
        json_response(['ok' => true]);
    }

    if ($type === 'interim') {
        upsert('session_interim', ['session_id' => $sessionId, 'interim_text' => $text, 'updated_at' => now_iso()], ['session_id']);
        json_response(['ok' => true]);
    }

    if ($type === 'final') {
        $text = trim($text);
        if ($text === '') {
            json_response(['ok' => true]);
        }

        // Aynı adayın (burada: aynı oturumun) tek yazarı konuşmacı olduğu
        // için eşzamanlı yazma yarışı pratikte yok - basit oku-yaz-artır
        // yeterli (bkz. apps/translate Cloudflare sürümündeki Durable
        // Object seq mantığı).
        $stmt = $pdo->prepare('SELECT COALESCE(MAX(seq), 0) FROM transcript_entries WHERE session_id = ?');
        $stmt->execute([$sessionId]);
        $seq = ((int) $stmt->fetchColumn()) + 1;

        $stmt = $pdo->prepare(
            'INSERT INTO transcript_entries (id, session_id, seq, source_text, source_lang, translations, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
        );
        $stmt->execute([new_id(), $sessionId, $seq, $text, $session['source_lang'], '{}', now_iso()]);

        // Çeviri BURADA yapılmıyor (WebSocket sürümünden FARKLI) - kimin
        // hangi dili dinlediğini bu istek anında bilmiyoruz (polling
        // modeli, kalıcı bağlantı yok). Çeviri, participant_poll.php'de
        // İLK istendiğinde tembel (lazy) olarak yapılıp önbelleğe
        // alınıyor - aynı dile ihtiyaç duyan sıradaki katılımcı/anket
        // için tekrar çağrılmıyor.
        upsert('session_interim', ['session_id' => $sessionId, 'interim_text' => '', 'updated_at' => now_iso()], ['session_id']);

        json_response(['ok' => true, 'seq' => $seq]);
    }

    json_response(['error' => 'unknown_type'], 400);
}

try {
    handle_speak_post();
} catch (Throwable $e) {
    error_log('[speak_post] ' . $e->getMessage());
    json_response(['error' => 'internal_error', 'message' => $e->getMessage()], 500);
}
