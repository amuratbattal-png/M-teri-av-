<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_admin_auth();

$eventId = (string) ($_GET['event_id'] ?? '');
$event = $eventId !== '' ? find_event($eventId) : null;
if (!$event) {
    http_response_code(404);
    echo '';
    exit;
}

echo render_question_list_html($eventId, $event['source_lang']);
