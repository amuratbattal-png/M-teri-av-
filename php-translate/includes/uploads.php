<?php
declare(strict_types=1);

/**
 * Görsel yükleme doğrulaması - hem Etkinlik "boş ekran" görseli hem
 * Konuşmacı fotoğrafı AYNI kurallara tabi (JPG/PNG/GIF/WEBP, en fazla
 * 8 MB, gerçekten bir görsel olduğu getimagesize() ile doğrulanır) - bu
 * yüzden tek, paylaşılan bir yerde (DRY).
 */
const ALLOWED_IMAGE_TYPES = [
    IMAGETYPE_JPEG => 'jpg',
    IMAGETYPE_PNG => 'png',
    IMAGETYPE_GIF => 'gif',
    IMAGETYPE_WEBP => 'webp',
];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * @param array{tmp_name?: string, error?: int, size?: int}|null $file $_FILES['...'] girdisi
 * @return array{ok: bool, ext: ?string, error: ?string}
 */
function validate_uploaded_image(?array $file): array
{
    if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'ext' => null, 'error' => 'Görsel yüklenemedi - bir dosya seçtiğinizden emin olun.'];
    }
    if (($file['size'] ?? 0) > MAX_IMAGE_BYTES) {
        return ['ok' => false, 'ext' => null, 'error' => 'Görsel çok büyük (en fazla 8 MB).'];
    }
    $imageInfo = @getimagesize($file['tmp_name']);
    $ext = $imageInfo ? (ALLOWED_IMAGE_TYPES[$imageInfo[2]] ?? null) : null;
    if (!$imageInfo || !$ext) {
        return ['ok' => false, 'ext' => null, 'error' => 'Sadece JPG, PNG, GIF veya WEBP görsel dosyaları kabul ediliyor.'];
    }
    return ['ok' => true, 'ext' => $ext, 'error' => null];
}
