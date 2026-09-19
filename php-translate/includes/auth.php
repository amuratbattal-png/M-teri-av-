<?php
declare(strict_types=1);

/**
 * "Admin panelini girişi de bootstrap panel yap" isteği üzerine Basic
 * Auth (tarayıcının kendi çirkin, stillendirilemeyen popup'ı) kaldırıldı -
 * artık normal bir PHP oturumu (session) + admin/login.php'deki Bootstrap
 * formuyla giriş yapılıyor.
 */
function ensure_session_started(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

function is_admin_logged_in(): bool
{
    ensure_session_started();
    return ($_SESSION['admin_logged_in'] ?? false) === true;
}

function log_in_admin(): void
{
    ensure_session_started();
    session_regenerate_id(true);
    $_SESSION['admin_logged_in'] = true;
}

function log_out_admin(): void
{
    ensure_session_started();
    $_SESSION = [];
    session_destroy();
}

/** Bir admin sayfasının en başında çağrılır - girişi yoksa login sayfasına yönlendirip çıkar. */
function require_admin_auth(): void
{
    if (is_admin_logged_in()) {
        return;
    }
    $redirect = $_SERVER['REQUEST_URI'] ?? '/admin/events.php';
    header('Location: /admin/login.php?redirect=' . rawurlencode($redirect));
    exit;
}
