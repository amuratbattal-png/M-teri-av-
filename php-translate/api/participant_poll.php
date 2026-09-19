<?php
declare(strict_types=1);

// En başta ob_start() - bu dosyanın herhangi bir yerinde (require'lar
// dahil) tesadüfen basılan bir PHP uyarısı/notice'i JSON'dan önce
// tarayıcıya gitmesin diye (bkz. helpers.php json_response). Sahibinin
// canlıda yaşadığı "Bağlantı sorunu, tekrar denenecek..." arızası
// muhtemelen tam olarak buydu - JSON'dan önce görünmez bir hata metni
// karışıp tarayıcının ayrıştırmasını bozuyordu.
ob_start();

// try/catch'in bile yakalayamayacağı GERÇEK ölümcül hatalara (ör.
// require'lardan biri hiç yoksa) karşı son çare - bootstrap.php'nin
// fonksiyonlarına GÜVENMEDEN, kendi başına JSON basıyor.
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

/**
 * Asıl mantık burada, bir fonksiyon içinde - dışarıdaki try/catch HERHANGİ
 * bir hatayı (bir dizi anahtarının eksik olması, veritabanı hatası, ne
 * olursa olsun) yakalayıp GERÇEK mesajı JSON içinde dönebilsin diye.
 * Böylece katılımcı ekranında sonsuza kadar "Bağlantı sorunu" görmek
 * yerine, bir sonraki oturumda gerçek hata metni görünür olacak.
 */
function handle_participant_poll(): void
{
    $sessionId = (string) ($_GET['session_id'] ?? '');
    $lang = (string) ($_GET['lang'] ?? '');
    $afterSeq = (int) ($_GET['after_seq'] ?? 0);
    $clientId = (string) ($_GET['client_id'] ?? '');

    $session = $sessionId !== '' ? find_session($sessionId) : null;
    if (!$session) {
        json_response(['error' => 'session_not_found'], 404);
    }
    if ($lang === '') {
        $lang = $session['source_lang'];
    }

    $pdo = get_pdo();

    if ($clientId !== '') {
        upsert(
            'participant_pings',
            ['session_id' => $sessionId, 'client_id' => $clientId, 'lang' => $lang, 'last_seen' => now_iso()],
            ['session_id', 'client_id'],
        );
    }

    if ($session['status'] !== 'active') {
        json_response(['ended' => true, 'entries' => [], 'interim' => '']);
    }

    if ($afterSeq > 0) {
        $stmt = $pdo->prepare(
            'SELECT * FROM transcript_entries WHERE session_id = ? AND seq > ? ORDER BY seq ASC LIMIT 50',
        );
        $stmt->execute([$sessionId, $afterSeq]);
        $rows = $stmt->fetchAll();
    } else {
        $stmt = $pdo->prepare(
            'SELECT * FROM transcript_entries WHERE session_id = ? ORDER BY seq DESC LIMIT ?',
        );
        $stmt->bindValue(1, $sessionId);
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
            $ok = true;
        } else {
            $result = translate_text($row['source_text'], $row['source_lang'], $lang);
            $text = $result['text'];
            $ok = $result['ok'];
            if ($ok) {
                $translations[$lang] = $text;
                $stmt = $pdo->prepare('UPDATE transcript_entries SET translations = ? WHERE id = ?');
                $stmt->execute([json_encode($translations, JSON_UNESCAPED_UNICODE), $row['id']]);
            }
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
    // gösteriliyor - Cloudflare/WebSocket sürümüyle AYNI karar, çünkü
    // çevirisi yok (her poll'da çevirmek maliyetli/gereksiz olurdu, birkaç
    // saniye içinde "final" olacak zaten).
    $interimText = '';
    if ($lang === $session['source_lang']) {
        $stmt = $pdo->prepare('SELECT interim_text FROM session_interim WHERE session_id = ?');
        $stmt->execute([$sessionId]);
        $interimText = (string) ($stmt->fetchColumn() ?: '');
    }

    json_response([
        'ended' => false,
        'entries' => $entries,
        'interim' => $interimText,
    ]);
}

try {
    handle_participant_poll();
} catch (Throwable $e) {
    error_log('[participant_poll] ' . $e->getMessage());
    json_response(['error' => 'internal_error', 'message' => $e->getMessage()], 500);
}
