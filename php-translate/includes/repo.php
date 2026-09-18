<?php
declare(strict_types=1);

function find_speaker(string $id): ?array
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare('SELECT * FROM speakers WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function list_speakers(): array
{
    $pdo = get_pdo();
    return $pdo->query('SELECT * FROM speakers ORDER BY created_at DESC')->fetchAll();
}

function find_session(string $id): ?array
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare('SELECT * FROM sessions WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function find_session_by_join_code(string $joinCode): ?array
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare('SELECT * FROM sessions WHERE join_code = ?');
    $stmt->execute([$joinCode]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function list_sessions(): array
{
    $pdo = get_pdo();
    return $pdo->query('SELECT * FROM sessions ORDER BY created_at DESC')->fetchAll();
}

function count_active_participants(string $sessionId, int $windowSeconds = 15): int
{
    $pdo = get_pdo();
    $cutoff = (new DateTimeImmutable("-{$windowSeconds} seconds"))->format('Y-m-d H:i:s');
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM participant_pings WHERE session_id = ? AND last_seen > ?',
    );
    $stmt->execute([$sessionId, $cutoff]);
    return (int) $stmt->fetchColumn();
}
