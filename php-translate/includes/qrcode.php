<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use chillerlan\QRCode\Output\QRMarkupSVG;

/** Katılım linkini bir <img> etiketine doğrudan konabilecek data: URI'ye çevirir. */
function render_qr_data_uri(string $data): string
{
    $options = new QROptions([
        'outputType' => QRMarkupSVG::class,
        'eccLevel' => 1,
    ]);
    $qrcode = new QRCode($options);
    return $qrcode->render($data);
}
