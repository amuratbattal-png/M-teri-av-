<?php
declare(strict_types=1);

const DEFAULT_NVIDIA_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';

function read_setting(string $key): ?string
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare('SELECT setting_value FROM settings WHERE setting_key = ?');
    $stmt->execute([$key]);
    $value = $stmt->fetchColumn();
    return $value !== false && $value !== null && $value !== '' ? (string) $value : null;
}

/**
 * Öncelik: panel (DB) > config.php > sabit varsayılan - kök repodaki
 * apps/control ile AYNI sıra (bkz. apps/translate/src/lib/settings.ts).
 */
function get_effective_nvidia_settings(): array
{
    $config = get_config();
    $panelKey = read_setting('nvidia_api_key');
    $panelModel = read_setting('nvidia_model');

    $apiKey = $panelKey ?? ($config['nvidia_api_key'] ?: null);
    $apiKeySource = $panelKey ? 'panel' : ($config['nvidia_api_key'] ? 'config' : 'none');

    $model = $panelModel ?? ($config['nvidia_model'] ?: DEFAULT_NVIDIA_MODEL);
    $modelSource = $panelModel ? 'panel' : ($config['nvidia_model'] ? 'config' : 'default');

    return [
        'apiKey' => $apiKey,
        'apiKeySource' => $apiKeySource,
        'model' => $model,
        'modelSource' => $modelSource,
    ];
}

function upsert_setting(string $key, ?string $value): void
{
    upsert('settings', ['setting_key' => $key, 'setting_value' => $value, 'updated_at' => now_iso()], ['setting_key']);
}

function delete_setting(string $key): void
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare('DELETE FROM settings WHERE setting_key = ?');
    $stmt->execute([$key]);
}

function update_nvidia_settings(?string $apiKey, ?string $model, bool $clearApiKey, bool $clearModel): void
{
    if ($clearApiKey) {
        delete_setting('nvidia_api_key');
    } elseif ($apiKey) {
        upsert_setting('nvidia_api_key', $apiKey);
    }

    if ($clearModel) {
        delete_setting('nvidia_model');
    } elseif ($model) {
        upsert_setting('nvidia_model', $model);
    }
}
