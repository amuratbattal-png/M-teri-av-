<?php
declare(strict_types=1);

function find_event(string $id): ?array
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare('SELECT * FROM events WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function find_event_by_join_code(string $joinCode): ?array
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare('SELECT * FROM events WHERE join_code = ?');
    $stmt->execute([$joinCode]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function list_events(): array
{
    $pdo = get_pdo();
    return $pdo->query('SELECT * FROM events ORDER BY created_at DESC')->fetchAll();
}

function list_event_speakers(string $eventId): array
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare('SELECT * FROM event_speakers WHERE event_id = ? ORDER BY sort_order ASC, created_at ASC');
    $stmt->execute([$eventId]);
    return $stmt->fetchAll();
}

function find_event_speaker(string $id): ?array
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare('SELECT * FROM event_speakers WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/** O anda aktif olan TEK konuşmacı (varsa) - bir Event'te aynı anda en fazla bir tane aktif olabilir. */
function find_active_speaker(string $eventId): ?array
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare('SELECT * FROM event_speakers WHERE event_id = ? AND is_active = 1 LIMIT 1');
    $stmt->execute([$eventId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * Bir konuşmacıyı aktif yapar - AYNI Event'teki diğer TÜM konuşmacılar
 * otomatik olarak pasif hâle getirilir (tek-aktif kuralı, admin'in
 * "önce eskisini pasif yap, sonra yenisini aktif yap" gibi iki adımlı bir
 * işlem yapmasına gerek kalmasın diye - "profesyonel" bir sistemde bu
 * kadar kritik bir durumu iki ayrı tıklamaya bağlı bırakmak hataya açık
 * olurdu).
 */
function activate_speaker(string $eventId, string $speakerId): void
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare('UPDATE event_speakers SET is_active = 0 WHERE event_id = ?');
    $stmt->execute([$eventId]);
    $stmt = $pdo->prepare('UPDATE event_speakers SET is_active = 1 WHERE id = ? AND event_id = ?');
    $stmt->execute([$speakerId, $eventId]);
}

function deactivate_speaker(string $speakerId): void
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare('UPDATE event_speakers SET is_active = 0 WHERE id = ?');
    $stmt->execute([$speakerId]);
}

function count_active_participants(string $eventId, int $windowSeconds = 15): int
{
    $pdo = get_pdo();
    $cutoff = (new DateTimeImmutable("-{$windowSeconds} seconds"))->format('Y-m-d H:i:s');
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM participant_pings WHERE event_id = ? AND last_seen > ?',
    );
    $stmt->execute([$eventId, $cutoff]);
    return (int) $stmt->fetchColumn();
}

function list_questions(string $eventId, int $limit = 100): array
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare('SELECT * FROM questions WHERE event_id = ? ORDER BY created_at DESC LIMIT ?');
    $stmt->bindValue(1, $eventId);
    $stmt->bindValue(2, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

/** Belirli bir konuşmacıya (o an aktifken) sorulmuş sorular - konuşmacının kendi mikrofon ekranında gösterilir. */
function list_questions_for_speaker(string $eventId, string $speakerId): array
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare(
        'SELECT * FROM questions WHERE event_id = ? AND speaker_id = ? ORDER BY created_at ASC',
    );
    $stmt->execute([$eventId, $speakerId]);
    return $stmt->fetchAll();
}

/**
 * Admin ekranındaki soru listesini "hangi konuşmacıya soruldu" bazında
 * gruplar - "adminde hangi konuşmacıya hangi sorular gelmiş görecek"
 * isteği üzerine. Roster sırasına göre (aktif/pasif fark etmeksizin)
 * gruplanır; silinmiş bir konuşmacıya ait ya da hiçbir konuşmacı aktif
 * değilken sorulmuş sorular ayrı, etiketli gruplarda listeye eklenir -
 * hiçbir soru bu yüzden kaybolmaz.
 *
 * @return array<int, array{speaker: ?array, label: ?string, questions: array}>
 */
function list_questions_grouped(string $eventId): array
{
    $speakers = list_event_speakers($eventId);
    $questions = list_questions($eventId);

    $bySpeaker = [];
    $unassigned = [];
    foreach ($questions as $q) {
        $speakerId = $q['speaker_id'] ?? null;
        if ($speakerId === null || $speakerId === '') {
            $unassigned[] = $q;
            continue;
        }
        $bySpeaker[$speakerId][] = $q;
    }

    $groups = [];
    foreach ($speakers as $speaker) {
        if (!empty($bySpeaker[$speaker['id']])) {
            $groups[] = ['speaker' => $speaker, 'label' => null, 'questions' => $bySpeaker[$speaker['id']]];
            unset($bySpeaker[$speaker['id']]);
        }
    }
    // Roster'da artık olmayan (silinmiş) bir konuşmacıya ait sorular varsa.
    foreach ($bySpeaker as $leftoverQuestions) {
        $groups[] = ['speaker' => null, 'label' => 'Silinmiş konuşmacı', 'questions' => $leftoverQuestions];
    }
    if ($unassigned) {
        $groups[] = ['speaker' => null, 'label' => 'Konuşmacı aktif değilken soruldu', 'questions' => $unassigned];
    }
    return $groups;
}
