<?php
declare(strict_types=1);

function esc(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}

function new_id(): string
{
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function new_join_code(int $length = 6): string
{
    $out = '';
    $max = strlen(JOIN_CODE_ALPHABET) - 1;
    for ($i = 0; $i < $length; $i++) {
        $out .= JOIN_CODE_ALPHABET[random_int(0, $max)];
    }
    return $out;
}

function new_speaker_token(): string
{
    return bin2hex(random_bytes(24));
}

function json_response(array $data, int $status = 200): void
{
    // API uç noktaları artık HER ZAMAN tek, temiz bir JSON gövdesi
    // döndürüyor - PHP bir uyarı/notice bastırmışsa (ör. eksik bir
    // config.php alanı) bile bu, JSON'dan ÖNCE tesadüfen yazdırılmış
    // olabilir; burada (json_response'un ilk işi olarak) o arabellek
    // temizleniyor ki tarayıcı "geçersiz JSON" hatasına düşmesin. Bunun
    // işe yaraması için her API dosyasının en başında ob_start()
    // çağrılmış olması gerekiyor (bkz. api/*.php).
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    return is_array($data) ? $data : [];
}

function now_iso(): string
{
    return (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
}
