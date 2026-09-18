<?php
declare(strict_types=1);

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

/**
 * NVIDIA chat completions çağrısı - Cloudflare sürümünde (apps/translate/
 * src/lib/translate.ts) öğrenilen AYNI ders: 429 (hız sınırı) gelirse
 * üstel bekleme ile en fazla 5 kez tekrar denenir.
 *
 * @param array<int, array{role: string, content: string}> $messages
 */
function fetch_nvidia_chat(array $messages): string
{
    $settings = get_effective_nvidia_settings();
    if (!$settings['apiKey']) {
        throw new RuntimeException('NVIDIA API anahtarı tanımlı değil (panel veya config.php)');
    }

    $body = json_encode([
        'model' => $settings['model'],
        'messages' => $messages,
        'temperature' => 0.2,
        'max_tokens' => 300,
        'chat_template_kwargs' => ['thinking' => false, 'enable_thinking' => false],
    ], JSON_UNESCAPED_UNICODE);

    $lastError = null;
    for ($attempt = 0; $attempt < 5; $attempt++) {
        $ch = curl_init(NVIDIA_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $settings['apiKey'],
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_TIMEOUT => 30,
        ]);
        $response = curl_exec($ch);
        if ($response === false) {
            $lastError = new RuntimeException('NVIDIA API isteği başarısız: ' . curl_error($ch));
            curl_close($ch);
            usleep(500000);
            continue;
        }
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        curl_close($ch);
        $headerText = substr($response, 0, $headerSize);
        $responseBody = substr($response, $headerSize);

        if ($status === 429) {
            $retryAfter = null;
            if (preg_match('/retry-after:\s*(\d+)/i', $headerText, $m)) {
                $retryAfter = (int) $m[1];
            }
            $waitSeconds = $retryAfter ?: min(3 * (2 ** $attempt), 30);
            $lastError = new RuntimeException("429 rate limited (deneme " . ($attempt + 1) . ")");
            sleep($waitSeconds);
            continue;
        }

        if ($status < 200 || $status >= 300) {
            throw new RuntimeException("NVIDIA API status={$status} " . substr($responseBody, 0, 300));
        }

        $data = json_decode($responseBody, true);
        $content = $data['choices'][0]['message']['content'] ?? null;
        if (!$content) {
            throw new RuntimeException('NVIDIA API boş yanıt döndü');
        }
        return trim($content);
    }

    throw $lastError ?? new RuntimeException('NVIDIA API başarısız');
}

/**
 * Bu FAIL-OPEN DEĞİL (Cloudflare sürümündeki AYNI kasıtlı tasarım) -
 * başarısızlıkta ok:false + açık "[çeviri yapılamadı]" notuyla orijinal
 * metin döner, katılımcı arayüzü bunu görünür bir uyarı olarak göstermeli.
 *
 * @return array{text: string, ok: bool}
 */
function translate_text(string $text, string $sourceLangCode, string $targetLangCode): array
{
    if (trim($text) === '') {
        return ['text' => $text, 'ok' => true];
    }
    if ($sourceLangCode === $targetLangCode) {
        return ['text' => $text, 'ok' => true];
    }

    try {
        $sourceLabel = language_label($sourceLangCode);
        $targetLabel = language_label($targetLangCode);
        $content = fetch_nvidia_chat([
            [
                'role' => 'system',
                'content' => 'Sen profesyonel bir simultane konferans çevirmenisin. Sana verilen ' .
                    'cümleyi ' . $sourceLabel . ' dilinden ' . $targetLabel . ' diline çevir. ' .
                    'SADECE çeviriyi yaz - hiçbir açıklama, tırnak işareti, ön ek veya ek not ekleme. ' .
                    'Doğal ve akıcı konuşma dili kullan, kelime kelime çeviri yapma.',
            ],
            ['role' => 'user', 'content' => $text],
        ]);
        return ['text' => $content, 'ok' => true];
    } catch (Throwable $e) {
        error_log('çeviri başarısız: ' . $e->getMessage());
        return ['text' => "[çeviri yapılamadı] {$text}", 'ok' => false];
    }
}
