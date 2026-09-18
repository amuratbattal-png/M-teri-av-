<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';

$sessionId = (string) ($_GET['session_id'] ?? '');
if ($sessionId === '') {
    json_response(['error' => 'missing_session_id'], 400);
}

json_response(['participantCount' => count_active_participants($sessionId)]);
