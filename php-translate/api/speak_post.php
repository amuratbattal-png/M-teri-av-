<?php
declare(strict_types=1);

// bkz. participant_poll.php'deki AYNI yorum - JSON'dan önce tesadüfen
// basılan bir PHP uyarısı/hatası bile artık düz JSON olarak dönüyor.
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
 * "Her konuşmacının kendi mikrofon kodu olmalı" isteği üzerine, önceden
 * TEK bir events.speaker_token ile çalışan bu uç nokta artık HER
 * KONUŞMACININ kendi token'ıyla doğrulanıyor (speak.php de aynı şekilde
 * güncellendi) - events.speaker_token artık HİÇBİR YERDEN okunmuyor
 * (kod tekrar kullanılmaya kalkışılırsa diye kasıtlı olarak silinmedi).
 */
function handle_speak_post(): void
{
    $input = read_json_body();
    $speakerId = (string) ($input['speaker_id'] ?? '');
    $token = (string) ($input['token'] ?? '');
    $type = (string) ($input['type'] ?? '');
    $text = (string) ($input['text'] ?? '');

    $speaker = $speakerId !== '' ? find_event_speaker($speakerId) : null;
    if (!$speaker) {
        json_response(['error' => 'speaker_not_found'], 404);
    }
    if (!hash_equals($speaker['token'], $token)) {
        json_response(['error' => 'unauthorized'], 401);
    }
    $event = find_event($speaker['event_id']);
    if (!$event || $event['status'] !== 'active') {
        json_response(['error' => 'event_ended'], 410);
    }
    $eventId = $event['id'];

    $pdo = get_pdo();

    if ($type === 'activate') {
        activate_speaker($eventId, $speakerId);
        json_response(['ok' => true]);
    }

    if ($type === 'deactivate') {
        deactivate_speaker($speakerId);
        json_response(['ok' => true]);
    }

    if ($type === 'toggle_qa') {
        $newValue = $speaker['qa_enabled'] ? 0 : 1;
        $stmt = $pdo->prepare('UPDATE event_speakers SET qa_enabled = ? WHERE id = ?');
        $stmt->execute([$newValue, $speakerId]);
        json_response(['ok' => true, 'qa_enabled' => (bool) $newValue]);
    }

    if ($type === 'set_lang') {
        $lang = (string) ($input['lang'] ?? 'tr');
        // Bu konuşmacı ekranı SADECE Türkçe/İngilizce arasında seçim
        // sunuyor ("2 dil - türkçe ve ingilizce" isteği) - başka bir
        // değer gelirse (elle uğraşılırsa) sessizce Türkçe'ye düşülüyor.
        if (!in_array($lang, ['tr', 'en'], true)) {
            $lang = 'tr';
        }
        $stmt = $pdo->prepare('UPDATE event_speakers SET source_lang = ? WHERE id = ?');
        $stmt->execute([$lang, $speakerId]);
        json_response(['ok' => true, 'source_lang' => $lang]);
    }

    // 'interim'/'final' - SADECE o an gerçekten AKTİF olan konuşmacı
    // gönderebilir. Tek-aktif kuralı (activate_speaker) başka bir
    // konuşmacının Başlat'a basması durumunda bu konuşmacıyı otomatik
    // pasif yaptığı için, mikrofonu hâlâ açık unutulmuş bir konuşmacının
    // sözleri sessizce yanlış birine mal edilmek yerine burada NET bir
    // hatayla reddediliyor - istemci tarafı bunu görüp mikrofonu
    // durdurup kullanıcıyı bilgilendirebiliyor.
    if (!$speaker['is_active']) {
        json_response(['error' => 'not_active', 'message' => 'Şu an aktif konuşmacı değilsiniz.'], 409);
    }

    if ($type === 'interim') {
        upsert('event_interim', ['event_id' => $eventId, 'interim_text' => $text, 'updated_at' => now_iso()], ['event_id']);
        json_response(['ok' => true]);
    }

    if ($type === 'final') {
        $text = trim($text);
        if ($text === '') {
            json_response(['ok' => true]);
        }

        // Aynı etkinliğin tek yazarı (o anki mikrofon cihazı) olduğu için
        // eşzamanlı yazma yarışı pratikte yok - basit oku-yaz-artır yeterli.
        $stmt = $pdo->prepare('SELECT COALESCE(MAX(seq), 0) FROM transcript_entries WHERE event_id = ?');
        $stmt->execute([$eventId]);
        $seq = ((int) $stmt->fetchColumn()) + 1;

        $stmt = $pdo->prepare(
            'INSERT INTO transcript_entries (id, event_id, speaker_id, seq, source_text, source_lang, translations, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        );
        $stmt->execute([new_id(), $eventId, $speakerId, $seq, $text, $speaker['source_lang'], '{}', now_iso()]);

        // Çeviri BURADA yapılmıyor - kimin hangi dili dinlediğini bu
        // istek anında bilmiyoruz (polling modeli, kalıcı bağlantı yok).
        // Çeviri, participant_poll.php'de İLK istendiğinde tembel (lazy)
        // olarak yapılıp önbelleğe alınıyor.
        upsert('event_interim', ['event_id' => $eventId, 'interim_text' => '', 'updated_at' => now_iso()], ['event_id']);

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
