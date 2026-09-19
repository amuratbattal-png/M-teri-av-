<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';

log_out_admin();
header('Location: /admin/login.php');
exit;
