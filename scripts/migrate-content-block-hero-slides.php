<?php

declare(strict_types=1);

use craft\elements\Entry;
use craft\fields\Matrix;

require dirname(__DIR__) . '/bootstrap.php';
require CRAFT_VENDOR_PATH . '/craftcms/cms/bootstrap/console.php';

const LEGACY_HERO_TYPE_UID = 'af88040a-731e-477d-a5dd-08fe6bb71209';
const HERO_SLIDE_TYPE_UID = '483d978e-3f21-40c1-a303-9c836d235fef';

function hasField(Entry $entry, string $handle): bool
{
    $fieldLayout = $entry->getFieldLayout();

    if (!$fieldLayout) {
        return false;
    }

    foreach ($fieldLayout->getCustomFields() as $field) {
        if ($field->handle === $handle) {
            return true;
        }
    }

    return false;
}

function relationAll($relation): array
{
    return $relation ? $relation->all() : [];
}

function relationOne($relation)
{
    return $relation ? $relation->one() : null;
}

function extractLegacySlide(Entry $entry): array
{
    return [
        'text' => hasField($entry, 'text') ? $entry->getFieldValue('text') : null,
        'buttons' => hasField($entry, 'buttons') ? relationAll($entry->getFieldValue('buttons')) : [],
        'asset' => hasField($entry, 'asset') ? relationOne($entry->getFieldValue('asset')) : null,
    ];
}

function slideHasContent(array $slide): bool
{
    return trim((string)($slide['text'] ?? '')) !== ''
        || !empty($slide['buttons'])
        || !empty($slide['asset']);
}

function serializeButtons(array $buttons): array
{
    $serialized = [];
    $index = 1;

    foreach ($buttons as $button) {
        if (!$button instanceof Entry) {
            continue;
        }

        $serialized[sprintf('new%d', $index++)] = [
            'type' => $button->getType()->handle,
            'enabled' => true,
            'fields' => $button->getSerializedFieldValues(),
        ];
    }

    return $serialized;
}

function serializeHeroSlide(array $slide): array
{
    $assetIds = [];

    if (($slide['asset'] ?? null) instanceof \craft\elements\Asset) {
        $assetIds[] = $slide['asset']->id;
    }

    return [
        'type' => 'heroSlide',
        'enabled' => true,
        'fields' => [
            'text' => $slide['text'] ?? null,
            'buttons' => serializeButtons($slide['buttons'] ?? []),
            'asset' => $assetIds,
        ],
    ];
}

$heroSlidesField = Craft::$app->getFields()->getFieldByHandle('heroSlides');

if (!$heroSlidesField instanceof Matrix) {
    fwrite(STDERR, "The heroSlides field is missing or is not a Matrix field.\n");
    exit(1);
}

$entriesService = Craft::$app->getEntries();
$legacyHeroType = $entriesService->getEntryTypeByUid(LEGACY_HERO_TYPE_UID);
$heroSlideType = $entriesService->getEntryTypeByUid(HERO_SLIDE_TYPE_UID);

if (!$legacyHeroType || !$heroSlideType) {
    fwrite(STDERR, "Unable to resolve the legacy hero or new heroSlide entry type.\n");
    exit(1);
}

$convertedSlides = 0;
$migratedHeroBlocks = 0;

$entries = Entry::find()
    ->status(null)
    ->site('*')
    ->limit(null)
    ->all();

foreach ($entries as $entry) {
    if (!hasField($entry, 'heroSlides')) {
        continue;
    }

    $heroSlidesRelation = $entry->getFieldValue('heroSlides');

    foreach (relationAll($heroSlidesRelation) as $slideEntry) {
        if (!$slideEntry instanceof Entry || $slideEntry->getTypeId() === $heroSlideType->id) {
            continue;
        }

        if ($slideEntry->getTypeId() !== $legacyHeroType->id) {
            continue;
        }

        $slideEntry->setTypeId($heroSlideType->id);

        if (!Craft::$app->getElements()->saveElement($slideEntry, false)) {
            fwrite(STDERR, sprintf(
                "Failed to convert hero slide %d on owner %d.\n",
                $slideEntry->id,
                $entry->id,
            ));

            foreach ($slideEntry->getErrors() as $attribute => $errors) {
                fwrite(STDERR, sprintf("- %s: %s\n", $attribute, implode('; ', $errors)));
            }

            exit(1);
        }

        $convertedSlides++;
    }
}

$heroBlocks = Entry::find()
    ->type('hero')
    ->status(null)
    ->site('*')
    ->limit(null)
    ->all();

foreach ($heroBlocks as $heroBlock) {
    if (!hasField($heroBlock, 'heroSlides')) {
        continue;
    }

    $existingSlides = relationAll($heroBlock->getFieldValue('heroSlides'));

    if (!empty($existingSlides)) {
        continue;
    }

    $legacySlide = extractLegacySlide($heroBlock);

    if (!slideHasContent($legacySlide)) {
        continue;
    }

    $heroBlock->setFieldValue('heroSlides', [
        'new1' => serializeHeroSlide($legacySlide),
    ]);

    if (!Craft::$app->getElements()->saveElement($heroBlock, false)) {
        fwrite(STDERR, sprintf(
            "Failed to migrate hero block %d (%s).\n",
            $heroBlock->id,
            $heroBlock->title ?? 'untitled',
        ));

        foreach ($heroBlock->getErrors() as $attribute => $errors) {
            fwrite(STDERR, sprintf("- %s: %s\n", $attribute, implode('; ', $errors)));
        }

        exit(1);
    }

    $migratedHeroBlocks++;
}

fwrite(STDOUT, sprintf(
    "Converted %d existing hero slide entries and migrated %d legacy hero blocks into heroSlides.\n",
    $convertedSlides,
    $migratedHeroBlocks,
));
