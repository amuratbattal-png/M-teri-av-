<?php
declare(strict_types=1);

function get_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }
    $path = __DIR__ . '/../config.php';
    if (!file_exists($path)) {
        throw new RuntimeException(
            'config.php bulunamadı - config.example.php dosyasını config.php olarak kopyalayıp gerçek değerlerinizi girin.',
        );
    }
    $config = require $path;
    return $config;
}

function get_pdo(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }
    $config = get_config();
    $pdo = new PDO($config['db_dsn'], $config['db_user'] ?? null, $config['db_pass'] ?? null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

/**
 * "Var ise güncelle, yoksa ekle" - MySQL (üretim) ve SQLite (yerel test)
 * için FARKLI SQL söz dizimi gerektiriyor (`ON DUPLICATE KEY UPDATE` vs
 * `INSERT OR REPLACE`). ÖNEMLİ DERS (gerçek çalıştırmayla bulundu): bunu
 * "MySQL söz dizimini dene, PDOException'da SQLite'a düş" şeklinde
 * try/catch ile çözmeye çalışmak YANLIŞ - PDO::prepare() geçersiz söz
 * dizimini SQLite'ta PREPARE anında fırlatıyor, yani hata try bloğunun
 * SADECE execute()'u sardığı senaryoda YAKALANAMIYOR (prepare() try
 * bloğunun dışında kalıyor). Bunun yerine sürücü baştan tespit edilip
 * doğru SQL'in ÜRETİLMESİ gerekiyor - burada tek, test edilmiş bir yerde.
 *
 * @param array<string, scalar|null> $row Tüm sütunlar (birincil anahtar dahil).
 * @param array<int, string> $primaryKeyColumns
 */
function upsert(string $table, array $row, array $primaryKeyColumns): void
{
    $pdo = get_pdo();
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    $columns = array_keys($row);
    $placeholders = array_fill(0, count($columns), '?');

    if ($driver === 'sqlite') {
        $sql = 'INSERT OR REPLACE INTO ' . $table . ' (' . implode(', ', $columns) . ') VALUES (' . implode(', ', $placeholders) . ')';
    } else {
        $updates = [];
        foreach ($columns as $col) {
            if (in_array($col, $primaryKeyColumns, true)) {
                continue;
            }
            $updates[] = "{$col} = VALUES({$col})";
        }
        $sql = 'INSERT INTO ' . $table . ' (' . implode(', ', $columns) . ') VALUES (' . implode(', ', $placeholders) . ')';
        if ($updates) {
            $sql .= ' ON DUPLICATE KEY UPDATE ' . implode(', ', $updates);
        }
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_values($row));
}
