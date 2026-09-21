<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_admin_auth();

$eventId = (string) ($_GET['event_id'] ?? '');
$event = $eventId !== '' ? find_event($eventId) : null;
if (!$event) {
    http_response_code(404);
    echo 'Etkinlik bulunamadı.';
    exit;
}

$rows = list_transcript_with_speaker_names($eventId);

$lines = [];
$lines[] = 'Etkinlik: ' . $event['name'];
$lines[] = 'Dışa aktarma zamanı: ' . now_iso();
$lines[] = str_repeat('-', 40);
$lines[] = '';

if (count($rows) === 0) {
    $lines[] = '(Bu etkinlikte henüz hiç konuşma kaydedilmedi.)';
} else {
    foreach ($rows as $row) {
        $speakerLabel = $row['speaker_name'] ?? '(konuşmacı atanmamış)';
        $lines[] = '[' . $row['created_at'] . '] ' . $speakerLabel . ': ' . $row['source_text'];
    }
}

$content = implode("\n", $lines) . "\n";

// Dosya adında sadece güvenli karakterler kalsın (indirilen dosya adına
// gömülen etkinlik adı olduğu için) - boşluk ve Türkçe karakterler dahil
// her şeyi "_" ile değiştiriyor, tarayıcılar/işletim sistemleri arasında
// sorunsuz taşınabilir bir isim garanti ediyor.
$safeName = preg_replace('/[^A-Za-z0-9]+/', '_', $event['name']);
$filename = 'transkript_' . trim((string) $safeName, '_') . '.txt';

header('Content-Type: text/plain; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . strlen($content));
echo $content;
