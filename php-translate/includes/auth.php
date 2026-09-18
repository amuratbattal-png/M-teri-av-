<?php
declare(strict_types=1);

/** apps/translate'in (Cloudflare sürümü) AYNI basit Basic Auth deseni. */
function require_admin_auth(): void
{
    $config = get_config();
    $user = $_SERVER['PHP_AUTH_USER'] ?? null;
    $pass = $_SERVER['PHP_AUTH_PW'] ?? null;

    if ($user === $config['admin_username'] && $pass === $config['admin_password']) {
        return;
    }

    header('WWW-Authenticate: Basic realm="canli-ceviri-admin"');
    http_response_code(401);
    echo 'Unauthorized';
    exit;
}
