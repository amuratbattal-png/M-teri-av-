<?php
declare(strict_types=1);

const LANGUAGES = [
    ['code' => 'tr', 'label' => 'Türkçe', 'bcp47' => 'tr-TR'],
    ['code' => 'en', 'label' => 'İngilizce', 'bcp47' => 'en-US'],
    ['code' => 'de', 'label' => 'Almanca', 'bcp47' => 'de-DE'],
    ['code' => 'fr', 'label' => 'Fransızca', 'bcp47' => 'fr-FR'],
    ['code' => 'es', 'label' => 'İspanyolca', 'bcp47' => 'es-ES'],
    ['code' => 'it', 'label' => 'İtalyanca', 'bcp47' => 'it-IT'],
    ['code' => 'ru', 'label' => 'Rusça', 'bcp47' => 'ru-RU'],
    ['code' => 'ar', 'label' => 'Arapça', 'bcp47' => 'ar-SA'],
    ['code' => 'fa', 'label' => 'Farsça', 'bcp47' => 'fa-IR'],
    ['code' => 'zh', 'label' => 'Çince', 'bcp47' => 'zh-CN'],
    ['code' => 'ja', 'label' => 'Japonca', 'bcp47' => 'ja-JP'],
    ['code' => 'ko', 'label' => 'Korece', 'bcp47' => 'ko-KR'],
    ['code' => 'pt', 'label' => 'Portekizce', 'bcp47' => 'pt-PT'],
    ['code' => 'nl', 'label' => 'Hollandaca', 'bcp47' => 'nl-NL'],
    ['code' => 'pl', 'label' => 'Lehçe', 'bcp47' => 'pl-PL'],
    ['code' => 'uk', 'label' => 'Ukraynaca', 'bcp47' => 'uk-UA'],
    ['code' => 'el', 'label' => 'Yunanca', 'bcp47' => 'el-GR'],
    ['code' => 'az', 'label' => 'Azerbaycan Türkçesi', 'bcp47' => 'az-AZ'],
    ['code' => 'bg', 'label' => 'Bulgarca', 'bcp47' => 'bg-BG'],
    ['code' => 'ro', 'label' => 'Rumence', 'bcp47' => 'ro-RO'],
];

function language_label(string $code): string
{
    foreach (LANGUAGES as $lang) {
        if ($lang['code'] === $code) {
            return $lang['label'];
        }
    }
    return $code;
}

function bcp47_for(string $code): string
{
    foreach (LANGUAGES as $lang) {
        if ($lang['code'] === $code) {
            return $lang['bcp47'];
        }
    }
    return $code;
}

function language_options_html(string $selected = ''): string
{
    $html = '';
    foreach (LANGUAGES as $lang) {
        $sel = $lang['code'] === $selected ? ' selected' : '';
        $html .= '<option value="' . esc($lang['code']) . '"' . $sel . '>' . esc($lang['label']) . '</option>';
    }
    return $html;
}
