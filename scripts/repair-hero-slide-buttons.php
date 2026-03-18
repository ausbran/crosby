<?php

declare(strict_types=1);

use craft\elements\Entry;

require dirname(__DIR__) . '/bootstrap.php';
require CRAFT_VENDOR_PATH . '/craftcms/cms/bootstrap/console.php';

function buildButtons(array $buttons): array
{
    $serialized = [];

    foreach (array_values($buttons) as $index => $button) {
        $serialized[sprintf('new%d', $index + 1)] = [
            'type' => 'button',
            'enabled' => true,
            'fields' => [
                'buttonLabel' => $button['label'],
                'buttonLink' => [
                    'value' => $button['href'],
                    'type' => 'url',
                ],
            ],
        ];
    }

    return $serialized;
}

$repairs = [
    52 => [
        ['label' => 'Explore our history', 'href' => '/about/history'],
    ],
    2707 => [
        ['label' => 'What we do', 'href' => '#services'],
        ['label' => 'Get in touch', 'href' => '#form'],
    ],
    42 => [
        ['label' => 'What CRM does', 'href' => '#services'],
        ['label' => 'Get in touch', 'href' => '#form'],
    ],
    112 => [
        ['label' => 'What CCD Does', 'href' => '#services'],
        ['label' => 'Get in touch', 'href' => '#form'],
    ],
];

foreach ($repairs as $entryId => $buttons) {
    $entry = Entry::find()
        ->id($entryId)
        ->status(null)
        ->site('*')
        ->one();

    if (!$entry) {
        fwrite(STDERR, "Entry {$entryId} not found.\n");
        exit(1);
    }

    $slide = $entry->getFieldValue('heroSlides')?->one();

    if (!$slide) {
        fwrite(STDERR, "Entry {$entryId} has no hero slide to repair.\n");
        exit(1);
    }

    $slide->setFieldValue('buttons', buildButtons($buttons));

    if (!Craft::$app->getElements()->saveElement($slide, false)) {
        fwrite(STDERR, sprintf("Failed to repair hero buttons for %s (%d).\n", $entry->title, $entry->id));
        foreach ($slide->getErrors() as $attribute => $errors) {
            fwrite(STDERR, sprintf("- %s: %s\n", $attribute, implode('; ', $errors)));
        }
        exit(1);
    }

    fwrite(STDOUT, sprintf("Repaired hero slide buttons for %s (%d).\n", $entry->title, $entry->id));
}

fwrite(STDOUT, "Hero slide button repair complete.\n");
