<?php
declare(strict_types=1);

const LANGUAGES = [
    ['code' => 'tr', 'label' => 'Türkçe', 'label_en' => 'Turkish', 'bcp47' => 'tr-TR'],
    ['code' => 'en', 'label' => 'İngilizce', 'label_en' => 'English', 'bcp47' => 'en-US'],
    ['code' => 'de', 'label' => 'Almanca', 'label_en' => 'German', 'bcp47' => 'de-DE'],
    ['code' => 'fr', 'label' => 'Fransızca', 'label_en' => 'French', 'bcp47' => 'fr-FR'],
    ['code' => 'es', 'label' => 'İspanyolca', 'label_en' => 'Spanish', 'bcp47' => 'es-ES'],
    ['code' => 'it', 'label' => 'İtalyanca', 'label_en' => 'Italian', 'bcp47' => 'it-IT'],
    ['code' => 'ru', 'label' => 'Rusça', 'label_en' => 'Russian', 'bcp47' => 'ru-RU'],
    ['code' => 'ar', 'label' => 'Arapça', 'label_en' => 'Arabic', 'bcp47' => 'ar-SA'],
    ['code' => 'fa', 'label' => 'Farsça', 'label_en' => 'Persian', 'bcp47' => 'fa-IR'],
    ['code' => 'zh', 'label' => 'Çince', 'label_en' => 'Chinese', 'bcp47' => 'zh-CN'],
    ['code' => 'ja', 'label' => 'Japonca', 'label_en' => 'Japanese', 'bcp47' => 'ja-JP'],
    ['code' => 'ko', 'label' => 'Korece', 'label_en' => 'Korean', 'bcp47' => 'ko-KR'],
    ['code' => 'pt', 'label' => 'Portekizce', 'label_en' => 'Portuguese', 'bcp47' => 'pt-PT'],
    ['code' => 'nl', 'label' => 'Hollandaca', 'label_en' => 'Dutch', 'bcp47' => 'nl-NL'],
    ['code' => 'pl', 'label' => 'Lehçe', 'label_en' => 'Polish', 'bcp47' => 'pl-PL'],
    ['code' => 'uk', 'label' => 'Ukraynaca', 'label_en' => 'Ukrainian', 'bcp47' => 'uk-UA'],
    ['code' => 'el', 'label' => 'Yunanca', 'label_en' => 'Greek', 'bcp47' => 'el-GR'],
    ['code' => 'az', 'label' => 'Azerbaycan Türkçesi', 'label_en' => 'Azerbaijani', 'bcp47' => 'az-AZ'],
    ['code' => 'bg', 'label' => 'Bulgarca', 'label_en' => 'Bulgarian', 'bcp47' => 'bg-BG'],
    ['code' => 'ro', 'label' => 'Rumence', 'label_en' => 'Romanian', 'bcp47' => 'ro-RO'],
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

function language_label_for_ui(string $code, string $uiLang): string
{
    foreach (LANGUAGES as $lang) {
        if ($lang['code'] === $code) {
            return $uiLang === 'en' ? $lang['label_en'] : $lang['label'];
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

function language_options_html(string $selected = '', string $uiLang = 'tr'): string
{
    $html = '';
    foreach (LANGUAGES as $lang) {
        $sel = $lang['code'] === $selected ? ' selected' : '';
        $label = $uiLang === 'en' ? $lang['label_en'] : $lang['label'];
        $html .= '<option value="' . esc($lang['code']) . '"' . $sel . '>' . esc($label) . '</option>';
    }
    return $html;
}
