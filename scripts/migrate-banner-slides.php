<?php

declare(strict_types=1);

use craft\elements\Entry;
use craft\fields\Matrix;

require dirname(__DIR__) . '/bootstrap.php';
require CRAFT_VENDOR_PATH . '/craftcms/cms/bootstrap/console.php';

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

function extractLegacyBannerData(Entry $entry): array
{
    $text = hasField($entry, 'text') ? $entry->getFieldValue('text') : null;
    $buttons = hasField($entry, 'buttons') ? relationAll($entry->getFieldValue('buttons')) : [];
    $asset = hasField($entry, 'asset') ? relationOne($entry->getFieldValue('asset')) : null;

    return [
        'text' => $text,
        'buttons' => $buttons,
        'asset' => $asset,
        'color' => hasField($entry, 'color') && $entry->color ? $entry->color->value : 'red',
    ];
}

function extractSlideData(Entry $slideEntry): array
{
    $text = hasField($slideEntry, 'text') ? $slideEntry->getFieldValue('text') : null;
    $buttons = hasField($slideEntry, 'buttons') ? relationAll($slideEntry->getFieldValue('buttons')) : [];
    $asset = hasField($slideEntry, 'asset') ? relationOne($slideEntry->getFieldValue('asset')) : null;

    if ((!$text || !$asset) && hasField($slideEntry, 'slideMatrix')) {
        $slideMatrix = $slideEntry->getFieldValue('slideMatrix');
        foreach (relationAll($slideMatrix) as $slideBlock) {
            $blockType = $slideBlock->getType()->handle;
            if ($blockType === 'text' && !$text && hasField($slideBlock, 'text')) {
                $text = $slideBlock->getFieldValue('text');
            }
            if ($blockType === 'buttons' && !$buttons && hasField($slideBlock, 'buttons')) {
                $buttons = relationAll($slideBlock->getFieldValue('buttons'));
            }
            if ($blockType === 'asset' && !$asset && hasField($slideBlock, 'asset')) {
                $asset = relationOne($slideBlock->getFieldValue('asset'));
            }
        }
    }

    return [
        'text' => $text,
        'buttons' => $buttons,
        'asset' => $asset,
        'color' => hasField($slideEntry, 'color') && $slideEntry->color ? $slideEntry->color->value : 'red',
    ];
}

function slideSignature(array $slide): string
{
    $text = trim((string)($slide['text'] ?? ''));
    $assetId = $slide['asset']?->id ?? 'none';
    $buttonLabels = array_map(
        fn($button) => $button->buttonLabel ?? '',
        $slide['buttons'] ?? [],
    );

    return md5(json_encode([
        'text' => $text,
        'assetId' => $assetId,
        'buttons' => $buttonLabels,
    ]));
}

function slideCoreSignature(array $slide): string
{
    $text = trim((string)($slide['text'] ?? ''));
    $assetId = $slide['asset']?->id ?? 'none';

    return md5(json_encode([
        'text' => $text,
        'assetId' => $assetId,
    ]));
}

function slideHasContent(array $slide): bool
{
    return trim((string)($slide['text'] ?? '')) !== '' || !empty($slide['buttons']) || !empty($slide['asset']);
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
    $assetIds = array_values(array_filter(array_map(
        fn($asset) => $asset?->id ?? null,
        array_filter([$slide['asset'] ?? null]),
    )));

    return [
        'type' => 'hero',
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

$targets = ['home', 'company', 'team', 'contact', 'banner', 'hero'];

$entries = Entry::find()
    ->type($targets)
    ->status(null)
    ->site('*')
    ->limit(null)
    ->all();

$updated = 0;

foreach ($entries as $entry) {
    if (!hasField($entry, 'heroSlides')) {
        continue;
    }

    $existingRelation = $entry->getFieldValue('heroSlides');
    $existingSlides = [];

    foreach (relationAll($existingRelation) as $slideEntry) {
        $existingSlides[] = extractSlideData($slideEntry);
    }

    $legacySlide = extractLegacyBannerData($entry);
    $serializedSlides = [];
    $index = 1;
    $skipFirstExisting = false;

    if (slideHasContent($legacySlide)) {
        $firstExistingCoreSignature = !empty($existingSlides) ? slideCoreSignature($existingSlides[0]) : null;
        if ($firstExistingCoreSignature === slideCoreSignature($legacySlide)) {
            $existingFirstSlide = $existingSlides[0];
            $mergedLegacySlide = [
                'text' => $legacySlide['text'] ?: ($existingFirstSlide['text'] ?? null),
                'buttons' => !empty($legacySlide['buttons']) ? $legacySlide['buttons'] : ($existingFirstSlide['buttons'] ?? []),
                'asset' => $legacySlide['asset'] ?: ($existingFirstSlide['asset'] ?? null),
                'color' => $legacySlide['color'] ?? ($existingFirstSlide['color'] ?? 'red'),
            ];
            $serializedSlides[sprintf('new%d', $index++)] = serializeHeroSlide($mergedLegacySlide);
            $skipFirstExisting = true;
        } else {
            $serializedSlides[sprintf('new%d', $index++)] = serializeHeroSlide($legacySlide);
        }
    }

    foreach ($existingSlides as $existingSlideIndex => $existingSlide) {
        if ($skipFirstExisting && $existingSlideIndex === 0) {
            continue;
        }

        if (!slideHasContent($existingSlide)) {
            continue;
        }

        $serializedSlides[sprintf('new%d', $index++)] = serializeHeroSlide($existingSlide);
    }

    if (empty($serializedSlides)) {
        continue;
    }

    $entry->setFieldValue('heroSlides', $serializedSlides);

    if (!Craft::$app->getElements()->saveElement($entry, false)) {
        fwrite(STDERR, sprintf(
            "Failed to migrate banner slides for %s (%d, type %s).\n",
            $entry->title,
            $entry->id,
            $entry->getType()->handle,
        ));

        foreach ($entry->getErrors() as $attribute => $errors) {
            fwrite(STDERR, sprintf("- %s: %s\n", $attribute, implode('; ', $errors)));
        }

        exit(1);
    }

    $entry = Entry::find()
        ->id($entry->id)
        ->siteId($entry->siteId)
        ->status(null)
        ->one();

    $savedSlides = $entry ? relationAll($entry->getFieldValue('heroSlides')) : [];

    foreach ($savedSlides as $savedSlideIndex => $savedSlide) {
        $sourceSlide = null;

        if ($skipFirstExisting && $savedSlideIndex === 0 && isset($mergedLegacySlide)) {
            $sourceSlide = $mergedLegacySlide;
        } elseif (isset($legacySlide) && slideHasContent($legacySlide) && !$skipFirstExisting && $savedSlideIndex === 0) {
            $sourceSlide = $legacySlide;
        } else {
            $existingIndex = $savedSlideIndex - (slideHasContent($legacySlide) ? 1 : 0);
            if ($skipFirstExisting) {
                $existingIndex++;
            }
            $sourceSlide = $existingSlides[$existingIndex] ?? null;
        }

        if (!$sourceSlide) {
            continue;
        }

        $savedSlide->setFieldValue('buttons', serializeButtons($sourceSlide['buttons'] ?? []));

        if (!Craft::$app->getElements()->saveElement($savedSlide, false)) {
            fwrite(STDERR, sprintf(
                "Failed to migrate nested button blocks for slide %d on %s (%d, type %s).\n",
                $savedSlideIndex + 1,
                $entry->title,
                $entry->id,
                $entry->getType()->handle,
            ));

            foreach ($savedSlide->getErrors() as $attribute => $errors) {
                fwrite(STDERR, sprintf("- %s: %s\n", $attribute, implode('; ', $errors)));
            }

            exit(1);
        }
    }

    $updated++;
    fwrite(STDOUT, sprintf(
        "Migrated banner slides for %s (%d, type %s).\n",
        $entry->title,
        $entry->id,
        $entry->getType()->handle,
    ));
}

fwrite(STDOUT, sprintf("Migration complete. Updated %d entr%s.\n", $updated, $updated === 1 ? 'y' : 'ies'));
